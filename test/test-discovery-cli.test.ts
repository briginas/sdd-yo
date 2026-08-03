import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, test } from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

const executeFile = promisify(execFile);

async function execute(argv: readonly string[], cwd: string) {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    adapterEnvironment: process.env.PATH === undefined ? {} : { PATH: process.env.PATH },
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: (message) => standardError.push(message),
    writeOutputFile: () => {
      throw new Error("Unexpected output file.");
    },
  });
  return { exitCode, output: standardOutput.join(""), error: standardError.join("") };
}

async function project(configAdapters = "  adapters: []\n"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sdd-test-discovery-cli-"));
  await mkdir(join(root, ".sdd"));
  await cp("spec", join(root, "spec"), { recursive: true });
  await writeFile(
    join(root, ".sdd", "config.yaml"),
    `schema_version: 1
project_id: SDD-17EF8B29
spec: { root: spec, entrypoint: spec/README.md }
adoption: { mode: incremental }
git: { default_target_ref: main }
ids: { suffix_length: 8, alphabet: hex-uppercase }
tests:
${configAdapters}evidence: { allowed_issuers: [] }
`,
  );
  await executeFile("git", ["init", "--quiet"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  return root;
}

async function commitProject(root: string): Promise<string> {
  await executeFile("git", ["add", "."], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "fixture"], { cwd: root });
  return (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
}

describe("REQ-12E19D70 REQ-72BA737C sdd tests discover", () => {
  test("emits a versioned deterministic TestIndex from multiple project-scoped JSONL imports", async () => {
    const root = await project();
    await mkdir(join(root, "artifacts"));
    await writeFile(
      join(root, "artifacts", "unit.jsonl"),
      '{"schema_version":"1.0","record_type":"test_stream","operation":"discover","adapter_id":"unit"}\n' +
        '{"schema_version":"1.0","record_type":"suite","local_id":"suite","parent_id":null,"name":"Coverage REQ-F7CEE6D0"}\n' +
        '{"schema_version":"1.0","record_type":"test","local_id":"case","parent_id":"suite","name":"discovers REQ-12E19D70"}\n',
    );
    await writeFile(
      join(root, "artifacts", "integration.jsonl"),
      '{"schema_version":"1.0","record_type":"test_stream","operation":"discover","adapter_id":"integration"}\n' +
        '{"schema_version":"1.0","record_type":"test","local_id":"case","parent_id":null,"name":"independent REQ-72BA737C"}\n',
    );
    const head = await commitProject(root);
    const result = await execute(
      [
        "tests",
        "discover",
        "--head",
        "HEAD",
        "--import-jsonl",
        "artifacts/unit.jsonl",
        "--import-jsonl",
        "artifacts/integration.jsonl",
        "--format",
        "json",
      ],
      root,
    );
    assert.equal(result.exitCode, 0, result.output);
    const envelope = JSON.parse(result.output) as {
      command: string;
      status: string;
      result: { subject: { head_ref: string }; tests: readonly { test_ref: string; requirement_ids: string[] }[] };
    };
    assert.equal(envelope.command, "tests.discover");
    assert.equal(envelope.status, "ok");
    assert.equal(envelope.result.subject.head_ref, head);
    assert.deepEqual(
      envelope.result.tests.map((item) => [item.test_ref, item.requirement_ids]),
      [
        ["integration:case", ["REQ-72BA737C"]],
        ["unit:case", ["REQ-12E19D70", "REQ-F7CEE6D0"]],
      ],
    );
  });

  test("REQ-6D8DDDF7 binds explicit JUnit imports and guides lost-hierarchy recovery", async () => {
    const root = await project(
      "  adapters:\n    - id: unit\n      type: junit\n      discover:\n        reports: [reports/configured/*.xml]\n",
    );
    await mkdir(join(root, "reports", "configured"), { recursive: true });
    await mkdir(join(root, "reports", "imports"), { recursive: true });
    await cp("fixtures/v1/adapters/junit/nested-suites.xml", join(root, "reports", "configured", "nested.xml"));
    await cp("fixtures/v1/adapters/junit/flat-report.xml", join(root, "reports", "imports", "flat.xml"));
    await commitProject(root);
    const result = await execute(
      [
        "tests",
        "discover",
        "--head",
        "HEAD",
        "--adapter",
        "unit",
        "--import-junit",
        "reports/imports/flat.xml",
        "--format",
        "json",
      ],
      root,
    );
    assert.equal(result.exitCode, 0, result.output);
    const envelope = JSON.parse(result.output) as {
      result: { tests: readonly unknown[] };
      diagnostics: readonly { code: string; severity: string }[];
    };
    assert.equal(envelope.result.tests.length, 7);
    assert.deepEqual(envelope.diagnostics, [
      {
        code: "SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE",
        severity: "warning",
        message: "A test producer did not retain nested suite hierarchy.",
        details: {
          remediation:
            "Review normalized full names; place Requirement IDs directly in executable test names or use a producer that retains suite hierarchy.",
        },
      },
    ]);
  });

  test("fails closed on unknown Requirement IDs and ambiguous JUnit namespace", async () => {
    const root = await project(
      "  adapters:\n    - id: unit\n      type: junit\n      discover:\n        reports: [reports/configured/*.xml]\n",
    );
    await mkdir(join(root, "reports", "configured"), { recursive: true });
    await mkdir(join(root, "artifacts"));
    await cp("fixtures/v1/adapters/junit/nested-suites.xml", join(root, "reports", "configured", "nested.xml"));
    await cp("fixtures/v1/adapters/junit/flat-report.xml", join(root, "reports", "flat.xml"));
    await writeFile(
      join(root, "artifacts", "unknown.jsonl"),
      '{"schema_version":"1.0","record_type":"test_stream","operation":"discover","adapter_id":"other"}\n' +
        '{"schema_version":"1.0","record_type":"test","local_id":"case","parent_id":null,"name":"REQ-FFFFFFFF"}\n',
    );
    await commitProject(root);
    const unknown = await execute(
      ["tests", "discover", "--head", "HEAD", "--import-jsonl", "artifacts/unknown.jsonl", "--format", "json"],
      root,
    );
    assert.equal(unknown.exitCode, 3);
    assert.equal(
      (JSON.parse(unknown.output) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
      "SDD_ADAPTER_DISCOVERY_REQUIREMENT_UNKNOWN",
    );
    const ambiguous = await execute(
      ["tests", "discover", "--head", "HEAD", "--import-junit", "reports/flat.xml", "--format", "json"],
      root,
    );
    assert.equal(ambiguous.exitCode, 3);
    assert.equal(
      (JSON.parse(ambiguous.output) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
      "SDD_ADAPTER_JUNIT_BINDING_REQUIRED",
    );
  });
});
