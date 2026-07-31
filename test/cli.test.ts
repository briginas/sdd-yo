import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { runCli } from "../src/cli/run-cli.ts";

async function execute(argv: readonly string[], cwd = process.cwd()) {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: (message) => standardError.push(message),
    writeOutputFile: () => {
      throw new Error("Unexpected output-file write in CLI test.");
    },
  });
  return { exitCode, standardOutput: standardOutput.join(""), standardError: standardError.join("") };
}

test("REQ-0361538D REQ-7C848ED0 validate emits deterministic versioned JSON and a human view", async () => {
  const first = await execute(["validate", "--format", "json"]);
  const second = await execute(["validate", "--format", "json"]);
  assert.equal(first.exitCode, 0);
  assert.equal(first.standardError, "");
  assert.equal(first.standardOutput, second.standardOutput);
  const value = JSON.parse(first.standardOutput) as {
    schema_version: string;
    command: string;
    project_id: string;
    status: string;
    result: { valid: boolean; fingerprints: readonly { id: string }[] };
    diagnostics: readonly { details: { remediation?: string } }[];
  };
  assert.equal(value.schema_version, "1.0");
  assert.equal(value.command, "validate");
  assert.equal(value.project_id, "SDD-17EF8B29");
  assert.equal(value.status, "ok");
  assert.equal(value.result.valid, true);
  assert.deepEqual(
    value.result.fingerprints.map((item) => item.id),
    value.result.fingerprints.map((item) => item.id).toSorted(),
  );
  assert.ok(value.diagnostics.every((item) => typeof item.details.remediation === "string"));

  const human = await execute(["validate"]);
  assert.equal(human.exitCode, 0);
  assert.match(human.standardOutput, /^validate: ok\nproject: SDD-17EF8B29\nobjects:/u);

  const nearestFromChild = await execute(["validate", "--cwd", "src", "--format", "json"]);
  const explicit = await execute(["validate", "--config", ".sdd/config.yaml", "--format", "json"]);
  const injectedRelativeCwd = await execute(
    ["validate", "--cwd", "..", "--format", "json"],
    join(process.cwd(), "src"),
  );
  assert.equal(nearestFromChild.exitCode, 0);
  assert.equal(explicit.exitCode, 0);
  assert.equal(injectedRelativeCwd.exitCode, 0);
  assert.equal((JSON.parse(nearestFromChild.standardOutput) as { project_id: string }).project_id, "SDD-17EF8B29");
  assert.equal((JSON.parse(explicit.standardOutput) as { project_id: string }).project_id, "SDD-17EF8B29");
});

test("REQ-7C848ED0 REQ-1095E571 inspect returns normative data, relations, paths, and fingerprints", async () => {
  const result = await execute(["inspect", "REQ-DD91AD0F", "--format", "json"]);
  assert.equal(result.exitCode, 0, result.standardOutput);
  const value = JSON.parse(result.standardOutput) as {
    status: string;
    result: {
      object: { id: string; statement: string; rationale?: string };
      document_path: string;
      fingerprints: { semantic: string; structural: string };
    };
  };
  assert.equal(value.status, "ok");
  assert.equal(value.result.object.id, "REQ-DD91AD0F");
  assert.equal("rationale" in value.result.object, false);
  assert.equal(value.result.document_path, "spec/capabilities/specification-model-and-authoring.md");
  assert.match(value.result.fingerprints.semantic, /^sha256:[0-9a-f]{64}$/u);
  assert.match(value.result.fingerprints.structural, /^sha256:[0-9a-f]{64}$/u);

  const capability = await execute(["inspect", "CAP-79E22870", "--format", "json", "--include", "explanatory"]);
  const capabilityValue = JSON.parse(capability.standardOutput) as {
    result: { object: { purpose?: string }; fingerprints: { semantic?: string; structural: string } };
  };
  assert.equal(capability.exitCode, 0);
  assert.equal(typeof capabilityValue.result.object.purpose, "string");
  assert.equal("semantic" in capabilityValue.result.fingerprints, false);

  const concept = await execute(["inspect", "CON-EA57C937", "--format", "json"]);
  const conceptValue = JSON.parse(concept.standardOutput) as {
    result: {
      reverse_relations: readonly { type: string; source_id: string }[];
      fingerprints: { semantic: string; structural: string };
    };
  };
  assert.equal(concept.exitCode, 0);
  assert.ok(conceptValue.result.reverse_relations.some((relation) => relation.source_id === "REQ-0361538D"));
});

test("REQ-7D93D64A maps blocking validation and technical failures to nonzero exits with remediation", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-invalid-"));
  await mkdir(join(root, ".sdd"));
  await mkdir(join(root, "spec"));
  await writeFile(
    join(root, ".sdd/config.yaml"),
    "schema_version: 1\nproject_id: SDD-A1000001\nspec:\n  root: spec\n  entrypoint: spec/README.md\nadoption:\n  mode: incremental\ngit:\n  default_target_ref: main\nids:\n  suffix_length: 8\n  alphabet: hex-uppercase\ntests:\n  adapters: []\nevidence:\n  allowed_issuers: []\n",
  );
  await writeFile(
    join(root, "spec/README.md"),
    "---\nsdd:\n  type: index\n---\n# Invalid\n\n## Capabilities <!-- sdd:capabilities -->\n\n- [CAP-A1000001 — Missing](missing.md)\n\n## Concepts <!-- sdd:concepts -->\n",
  );
  const blocked = await execute(["validate", "--format", "json"], root);
  assert.equal(blocked.exitCode, 1);
  const blockedValue = JSON.parse(blocked.standardOutput) as {
    status: string;
    diagnostics: readonly { code: string; details: { remediation?: string } }[];
  };
  assert.equal(blockedValue.status, "blocked");
  assert.equal(blockedValue.diagnostics[0]?.code, "SDD_GRAPH_LINK_BROKEN");
  assert.equal(typeof blockedValue.diagnostics[0]?.details.remediation, "string");

  const technical = await execute(["validate", "--format", "json", "--cwd", join(root, "missing")], root);
  assert.equal(technical.exitCode, 3);
  assert.equal((JSON.parse(technical.standardOutput) as { status: string }).status, "error");
  assert.equal(technical.standardOutput.includes(root), false);

  const outside = await mkdtemp(join(tmpdir(), "sdd-cli-output-outside-"));
  await symlink(outside, join(root, "reports"));
  const unsafeOutput = await execute(["validate", "--format", "json", "--output", "reports/result.json"], root);
  assert.equal(unsafeOutput.exitCode, 3);
  const unsafeValue = JSON.parse(unsafeOutput.standardOutput) as {
    status: string;
    diagnostics: readonly { code: string }[];
  };
  assert.equal(unsafeValue.status, "error");
  assert.equal(unsafeValue.diagnostics[0]?.code, "SDD_CONFIG_CLI_OUTPUT_UNSAFE");
});

test("REQ-7C848ED0 rejects unknown inspect identities and conflicting project selectors", async () => {
  const missing = await execute(["inspect", "REQ-FFFFFFFF", "--format", "json"]);
  assert.equal(missing.exitCode, 3);
  assert.equal((JSON.parse(missing.standardOutput) as { status: string }).status, "error");

  const invalid = await execute(["validate", "--config", ".sdd/config.yaml", "--cwd", ".", "--format", "json"]);
  assert.equal(invalid.exitCode, 3);
  assert.equal((JSON.parse(invalid.standardOutput) as { status: string }).status, "error");

  const malformed = await execute(["unsupported", "json"]);
  assert.equal(malformed.exitCode, 3);
  assert.match(malformed.standardOutput, /^unknown: error\n/u);
});

test("REQ-7C848ED0 writes primary output to a project-relative target and accepts quiet mode", async () => {
  const standardOutput: string[] = [];
  let written: { path: string; content: string } | undefined;
  const exitCode = await runCli({
    argv: ["validate", "--format", "json", "--output", "test/validation.json", "--quiet"],
    workingDirectory: process.cwd(),
    fileSystem: nodeFileSystem,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: () => {},
    writeOutputFile: (path, content) => {
      written = { path, content };
    },
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(standardOutput, []);
  assert.equal(written?.path, join(process.cwd(), "test/validation.json"));
  assert.equal((JSON.parse(written?.content ?? "") as { status: string }).status, "ok");
});

test("REQ-7D93D64A converts an injected output crash to exit 3 without a passing result", async () => {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv: ["validate", "--format", "json", "--output", "test/crash.json"],
    workingDirectory: process.cwd(),
    fileSystem: nodeFileSystem,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: (message) => standardError.push(message),
    writeOutputFile: () => {
      throw new Error("injected write crash");
    },
  });
  assert.equal(exitCode, 3);
  assert.equal((JSON.parse(standardOutput.join("")) as { status: string }).status, "error");
  assert.match(standardError.join(""), /internal technical error/u);
});
