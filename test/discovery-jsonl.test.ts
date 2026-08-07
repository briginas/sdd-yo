import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

import {
  AdapterImportError,
  importDiscoveryJsonlFile,
  isProjectPath,
  nodeFileSystem,
  nodeProcessRunner,
  parseDiscoveryJsonl,
  parseProjectConfiguration,
  ProcessRunError,
  runCommandDiscovery,
} from "../src/index.ts";
import type {
  CommandTestAdapter,
  ProcessRequest,
  ProcessResult,
  ProcessRunner,
  ProjectPath,
  ResolvedProject,
} from "../src/index.ts";

const encoder = new TextEncoder();

async function fixture(name: string): Promise<Uint8Array> {
  return readFile(join("fixtures", "v1", "adapters", "jsonl", name));
}

function commandAdapter(overrides: Partial<CommandTestAdapter> = {}): CommandTestAdapter {
  return {
    id: "unit",
    type: "command",
    protocol: "jsonl-v1",
    discover: { argv: ["adapter", "discover"] },
    timeout_ms: 1_000,
    max_output_bytes: 4_096,
    ...overrides,
  };
}

function project(root = "/project"): ResolvedProject {
  const parsed = parseProjectConfiguration(
    encoder.encode(`schema_version: 1
project_id: SDD-17EF8B29
spec:
  root: spec
  entrypoint: spec/README.md
adoption:
  mode: incremental
git:
  default_target_ref: main
ids:
  suffix_length: 8
  alphabet: hex-uppercase
tests:
  adapters: []
`),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error("Test project configuration is invalid.");
  return { config_path: join(root, ".sdd", "config.yaml"), project_root: root, configuration: parsed.value };
}

function processResult(stdout: Uint8Array, exitCode: number | null = 0, signal: string | null = null): ProcessResult {
  return { exitCode, signal, standardOutput: stdout, standardError: new Uint8Array() };
}

describe("REQ-12E19D70 JSONL discovery import and command adapter boundary", () => {
  test("imports the version 1 discovery stream without computing hierarchy or Requirement mappings", async () => {
    const imported = parseDiscoveryJsonl(await fixture("forward-parent.jsonl"), {
      maxBytes: 4_096,
      expectedAdapterId: "unit",
    });
    assert.equal(imported.header.operation, "discover");
    assert.deepEqual(
      imported.records.map((record) => [record.record_type, record.local_id, record.parent_id]),
      [
        ["test", "test-forward", "suite-forward"],
        ["suite", "suite-forward", null],
      ],
    );
    assert.equal("full_name" in imported.records[0]!, false);
    assert.equal("requirement_ids" in imported.records[0]!, false);
  });

  test("strictly rejects malformed JSONL, UTF-8, headers, records, and byte overflow", async () => {
    const invalidCases = [
      [await fixture("malformed-jsonl.jsonl"), "SDD_ADAPTER_STREAM_INVALID_JSONL"],
      [await fixture("truncated-stream.jsonl"), "SDD_ADAPTER_STREAM_INVALID_JSONL"],
      [new Uint8Array([0xc3, 0x28]), "SDD_ADAPTER_STREAM_INVALID_UTF8"],
      [
        encoder.encode(
          '{"schema_version":"1.0","record_type":"test_stream","operation":"execute","adapter_id":"unit"}\n',
        ),
        "SDD_ADAPTER_STREAM_INVALID_HEADER",
      ],
      [
        encoder.encode(
          '{"schema_version":"1.0","record_type":"test_stream","operation":"discover","adapter_id":"other"}\n',
        ),
        "SDD_ADAPTER_STREAM_INVALID_HEADER",
      ],
      [
        encoder.encode(
          '{"schema_version":"1.0","record_type":"test_stream","operation":"discover","adapter_id":"unit","extra":true}\n',
        ),
        "SDD_ADAPTER_STREAM_INVALID_HEADER",
      ],
      [
        encoder.encode(
          '{"schema_version":"1.0","record_type":"test_stream","operation":"discover","adapter_id":"unit"}\n{"schema_version":"1.0","record_type":"result","local_id":"test","status":"passed"}\n',
        ),
        "SDD_ADAPTER_STREAM_INVALID_RECORD",
      ],
    ] as const;
    for (const [bytes, code] of invalidCases) {
      assert.throws(
        () => parseDiscoveryJsonl(bytes, { maxBytes: 4_096, expectedAdapterId: "unit" }),
        (error) => error instanceof AdapterImportError && error.code === code,
      );
    }
    assert.throws(
      () => parseDiscoveryJsonl(encoder.encode("12345"), { maxBytes: 4 }),
      (error) => error instanceof AdapterImportError && error.code === "SDD_ADAPTER_STREAM_TOO_LARGE",
    );
  });

  test("imports only regular project-scoped files and rejects symlink escape", async () => {
    const root = await mkdtemp(join(tmpdir(), "sdd-jsonl-project-"));
    const outside = await mkdtemp(join(tmpdir(), "sdd-jsonl-outside-"));
    await mkdir(join(root, "artifacts"));
    await writeFile(join(root, "artifacts", "discover.jsonl"), await fixture("discover-valid.jsonl"));
    await writeFile(join(outside, "escape.jsonl"), await fixture("discover-valid.jsonl"));
    await symlink(join(outside, "escape.jsonl"), join(root, "artifacts", "escape.jsonl"));
    const pathValue: unknown = "artifacts/discover.jsonl";
    const escapeValue: unknown = "artifacts/escape.jsonl";
    assert.ok(isProjectPath(pathValue));
    assert.ok(isProjectPath(escapeValue));
    assert.equal(
      (await importDiscoveryJsonlFile(nodeFileSystem, root, pathValue, { maxBytes: 4_096 })).records.length,
      3,
    );
    await assert.rejects(
      importDiscoveryJsonlFile(nodeFileSystem, root, escapeValue, { maxBytes: 4_096 }),
      (error) => error instanceof AdapterImportError && error.code === "SDD_ADAPTER_FILE_OUT_OF_SCOPE",
    );
  });

  test("runs direct argv in project scope with only allowlisted and protocol environment", async () => {
    let request: ProcessRequest | undefined;
    const runner: ProcessRunner = {
      run: async (candidate) => {
        request = candidate;
        return processResult(await fixture("discover-valid.jsonl"));
      },
    };
    const imported = await runCommandDiscovery(runner, project(), commandAdapter(), {
      PATH: "/allowed/bin",
      SECRET: "must-not-be-supplied-by-callers-in-production",
      SDD_OPERATION: "unsafe-override",
    });
    assert.equal(imported.records.length, 3);
    assert.deepEqual(request, {
      executable: "adapter",
      arguments: ["discover"],
      workingDirectory: "/project",
      environment: {
        PATH: "/allowed/bin",
        SECRET: "must-not-be-supplied-by-callers-in-production",
        SDD_OPERATION: "discover",
        SDD_PROJECT_ID: "SDD-17EF8B29",
        SDD_PROJECT_ROOT: "/project",
      },
      inheritEnvironment: false,
      timeoutMilliseconds: 1_000,
      maxOutputBytes: 4_096,
    });
  });

  test("maps timeout, overflow, non-zero exit, signal, and unavailable discovery to blocking failures", async () => {
    const throwing = (error: Error): ProcessRunner => ({ run: async () => Promise.reject(error) });
    await assert.rejects(
      runCommandDiscovery(throwing(new ProcessRunError("TIMEOUT", "timeout")), project(), commandAdapter()),
      (error) => error instanceof AdapterImportError && error.code === "SDD_ADAPTER_COMMAND_TIMEOUT",
    );
    await assert.rejects(
      runCommandDiscovery(throwing(new ProcessRunError("OUTPUT_LIMIT", "overflow")), project(), commandAdapter()),
      (error) => error instanceof AdapterImportError && error.code === "SDD_ADAPTER_COMMAND_OUTPUT_OVERFLOW",
    );
    await assert.rejects(
      runCommandDiscovery({ run: async () => processResult(new Uint8Array(), 7) }, project(), commandAdapter()),
      (error) => error instanceof AdapterImportError && error.code === "SDD_ADAPTER_COMMAND_FAILED",
    );
    await assert.rejects(
      runCommandDiscovery(
        { run: async () => processResult(new Uint8Array(), null, "SIGTERM") },
        project(),
        commandAdapter(),
      ),
      (error) => error instanceof AdapterImportError && error.code === "SDD_ADAPTER_COMMAND_SIGNALLED",
    );
    const executionOnly: CommandTestAdapter = {
      id: "unit",
      type: "command",
      protocol: "jsonl-v1",
      execute: { argv: ["adapter", "execute"] },
      timeout_ms: 1_000,
      max_output_bytes: 4_096,
    };
    await assert.rejects(
      runCommandDiscovery(nodeProcessRunner, project(), executionOnly),
      (error) => error instanceof AdapterImportError && error.code === "SDD_ADAPTER_COMMAND_UNAVAILABLE",
    );
  });
});

test("REQ-72BA737C adapter IDs use the version 1 namespace grammar", () => {
  const source = encoder.encode(`schema_version: 1
project_id: SDD-17EF8B29
spec: { root: spec, entrypoint: spec/README.md }
adoption: { mode: incremental }
git: { default_target_ref: main }
ids: { suffix_length: 8, alphabet: hex-uppercase }
tests:
  adapters:
    - id: INVALID
      type: junit
      discover: { reports: [report.xml] }
`);
  const result = parseProjectConfiguration(source);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.diagnostics[0]?.code, "SDD_CONFIG_INVALID_FIELD");
});
