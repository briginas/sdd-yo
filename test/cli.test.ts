import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { runCli } from "../src/cli/run-cli.ts";

const executeFile = promisify(execFile);

const emptyIndex = `---
sdd:
  type: index
---
# Product specification

## Capabilities <!-- sdd:capabilities -->

## Domain concepts <!-- sdd:concepts -->
`;

const reusedCapability = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Historical capability

## Purpose <!-- sdd:purpose -->

Exercise historical identifier reservation.
`;

const indexWithCapability = emptyIndex.replace(
  "## Domain concepts",
  "- [CAP-A1000001 — Historical capability](capabilities/historical.md)\n\n## Domain concepts",
);

async function execute(argv: readonly string[], cwd = process.cwd()) {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: (message) => standardError.push(message),
    writeOutputFile: () => {
      throw new Error("Unexpected output-file write in CLI test.");
    },
  });
  return { exitCode, standardOutput: standardOutput.join(""), standardError: standardError.join("") };
}

test("REQ-382BBBD6 REQ-BFC18F28 init creates a stable project without overwriting unrelated files", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-init-"));
  await mkdir(join(root, "spec"));
  await writeFile(join(root, "README.md"), "keep me\n");
  await writeFile(join(root, "spec/notes.txt"), "keep this too\n");

  const initialized = await execute(["init", "--format", "json"], root);
  assert.equal(initialized.exitCode, 0, initialized.standardOutput);
  const value = JSON.parse(initialized.standardOutput) as {
    project_id: string;
    status: string;
    result: { created_paths: readonly string[] };
  };
  assert.equal(value.status, "ok");
  assert.match(value.project_id, /^SDD-[0-9A-F]{8}$/u);
  assert.deepEqual(value.result.created_paths, [
    ".sdd/config.yaml",
    "spec/README.md",
    "spec/capabilities",
    "spec/concepts",
  ]);
  assert.equal(await readFile(join(root, "README.md"), "utf8"), "keep me\n");
  assert.equal(await readFile(join(root, "spec/notes.txt"), "utf8"), "keep this too\n");
  const configBefore = await readFile(join(root, ".sdd/config.yaml"), "utf8");
  assert.match(configBefore, new RegExp(`project_id: ${value.project_id}`, "u"));

  const validated = await execute(["validate", "--format", "json"], root);
  assert.equal(validated.exitCode, 0, validated.standardOutput);
  const validatedValue = JSON.parse(validated.standardOutput) as {
    project_id: string;
    result: { history: { status: string; resolved_ref: string | null } };
    diagnostics: readonly { code: string; severity: string }[];
  };
  assert.equal(validatedValue.project_id, value.project_id);
  assert.deepEqual(validatedValue.result.history, { status: "incomplete", resolved_ref: null });
  assert.deepEqual(
    validatedValue.diagnostics.map(({ code, severity }) => ({ code, severity })),
    [{ code: "SDD_GIT_HISTORY_INCOMPLETE", severity: "warning" }],
  );

  const repeated = await execute(["init", "--format", "json"], root);
  assert.equal(repeated.exitCode, 3);
  assert.equal(
    (JSON.parse(repeated.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_INIT_TARGET_CONFLICT",
  );
  assert.equal(await readFile(join(root, ".sdd/config.yaml"), "utf8"), configBefore);
});

test("REQ-382BBBD6 init honors portable spec paths and adoption mode", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-init-options-"));
  const initialized = await execute(
    ["init", "--spec-path", "docs/specification", "--adoption", "complete", "--format", "json"],
    root,
  );
  assert.equal(initialized.exitCode, 0, initialized.standardOutput);
  const config = await readFile(join(root, ".sdd/config.yaml"), "utf8");
  assert.match(config, /root: "docs\/specification"\n  entrypoint: "docs\/specification\/README\.md"/u);
  assert.match(config, /mode: complete/u);
  assert.match(await readFile(join(root, "docs/specification/README.md"), "utf8"), /sdd:capabilities/u);
});

test("REQ-382BBBD6 init rejects a symbolic-link path component before writing", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-init-symlink-"));
  const outside = await mkdtemp(join(tmpdir(), "sdd-cli-init-outside-"));
  await symlink(outside, join(root, "docs"));

  const initialized = await execute(["init", "--spec-path", "docs/specification", "--format", "json"], root);
  assert.equal(initialized.exitCode, 3);
  assert.equal(
    (JSON.parse(initialized.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_INIT_TARGET_UNSAFE",
  );
  await assert.rejects(readFile(join(root, ".sdd/config.yaml")), /ENOENT/u);
  await assert.rejects(readFile(join(outside, "specification/README.md")), /ENOENT/u);
});

test("REQ-2C8E8085 projectless id emits unique candidates with unchecked history", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-id-projectless-"));
  const generated = await execute(["id", "requirement", "--count", "3", "--format", "json"], root);
  assert.equal(generated.exitCode, 0, generated.standardOutput);
  const value = JSON.parse(generated.standardOutput) as {
    command: string;
    project_id: null;
    status: string;
    result: { candidates: readonly string[]; history: { status: string; resolved_ref: null } };
  };
  assert.equal(value.command, "id");
  assert.equal(value.project_id, null);
  assert.equal(value.status, "ok");
  assert.equal(value.result.candidates.length, 3);
  assert.equal(new Set(value.result.candidates).size, 3);
  assert.ok(value.result.candidates.every((candidate) => /^REQ-[0-9A-F]{8}$/u.test(candidate)));
  assert.deepEqual(value.result.history, { status: "unchecked", resolved_ref: null });

  const human = await execute(["id", "concept"], root);
  assert.equal(human.exitCode, 0);
  assert.match(human.standardOutput, /^id: ok\nCON-[0-9A-F]{8}\nhistory: unchecked\n$/u);
});

test("REQ-2C8E8085 projectless id rejects invalid counts and history claims", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-id-invalid-"));
  for (const count of ["0", "257", "1.5", "01"]) {
    const invalid = await execute(["id", "project", "--count", count, "--format", "json"], root);
    assert.equal(invalid.exitCode, 3, count);
    assert.equal(
      (JSON.parse(invalid.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
      "SDD_ID_COUNT_INVALID",
    );
  }

  const history = await execute(["id", "capability", "--history-ref", "main", "--format", "json"], root);
  assert.equal(history.exitCode, 3);
  assert.equal(
    (JSON.parse(history.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_ID_HISTORY_REF_REQUIRES_PROJECT",
  );
});

test("REQ-2C8E8085 REQ-8B656FC5 project-aware id reserves against complete history", async () => {
  const generated = await execute(["id", "requirement", "--format", "json"]);
  assert.equal(generated.exitCode, 0, generated.standardOutput);
  const value = JSON.parse(generated.standardOutput) as {
    project_id: string;
    result: { candidates: readonly string[]; history: { status: string; resolved_ref: string | null } };
  };
  assert.equal(value.project_id, "SDD-17EF8B29");
  assert.equal(value.result.history.status, "complete");
  assert.equal(typeof value.result.history.resolved_ref, "string");
  assert.match(value.result.candidates[0] ?? "", /^REQ-[0-9A-F]{8}$/u);
});

test("REQ-2C8E8085 manual IDs cannot reuse a removed canonical history identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-id-reuse-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await writeFile(join(root, "spec/README.md"), indexWithCapability);
  await writeFile(join(root, "spec/capabilities/historical.md"), reusedCapability);
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "define capability"], { cwd: root });
  await writeFile(join(root, "spec/README.md"), emptyIndex);
  await unlink(join(root, "spec/capabilities/historical.md"));
  await executeFile("git", ["add", "--all"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "remove capability"], { cwd: root });

  await writeFile(join(root, "spec/README.md"), indexWithCapability);
  await writeFile(join(root, "spec/capabilities/historical.md"), reusedCapability);
  const validated = await execute(["validate", "--format", "json"], root);
  assert.equal(validated.exitCode, 1, validated.standardOutput);
  const value = JSON.parse(validated.standardOutput) as {
    diagnostics: readonly { code: string; object_id?: string }[];
  };
  assert.deepEqual(value.diagnostics[0], {
    code: "SDD_ID_REUSED",
    severity: "error",
    message: "A newly introduced canonical object ID was already defined in reachable project history.",
    details: {
      remediation: "Assign the object a new random ID and preserve the historical ID as permanently reserved.",
    },
    object_id: "CAP-A1000001",
  });
});

test("REQ-BFC18F28 duplicate current project IDs block repository validation", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-project-duplicate-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await writeFile(join(root, ".gitignore"), "nested/\n");
  await mkdir(join(root, "nested/.sdd"), { recursive: true });
  await mkdir(join(root, "nested/spec"), { recursive: true });
  await writeFile(join(root, "nested/.sdd/config.yaml"), await readFile(join(root, ".sdd/config.yaml")));
  await writeFile(join(root, "nested/spec/README.md"), emptyIndex);

  const validated = await execute(["validate", "--format", "json"], root);
  assert.equal(validated.exitCode, 1, validated.standardOutput);
  assert.equal(
    (JSON.parse(validated.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_ID_PROJECT_DUPLICATE",
  );
});

test("REQ-BFC18F28 deleted tracked configs are not current project identities", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-project-deleted-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await mkdir(join(root, "nested/.sdd"), { recursive: true });
  await mkdir(join(root, "nested/spec"), { recursive: true });
  const nestedConfig = (await readFile(join(root, ".sdd/config.yaml"), "utf8")).replace(
    /^project_id: SDD-[0-9A-F]{8}$/mu,
    "project_id: SDD-A1000002",
  );
  await writeFile(join(root, "nested/.sdd/config.yaml"), nestedConfig);
  await writeFile(join(root, "nested/spec/README.md"), emptyIndex);
  await executeFile("git", ["add", "."], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "two distinct projects"], { cwd: root });
  await unlink(join(root, "nested/.sdd/config.yaml"));

  const validated = await execute(["validate", "--format", "json"], root);
  assert.equal(validated.exitCode, 0, validated.standardOutput);
});

test("REQ-2C8E8085 rejects an ID independently introduced on the working and integration branches", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-parallel-id-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "baseline"], { cwd: root });
  await executeFile("git", ["switch", "--quiet", "-c", "feature"], { cwd: root });
  await writeFile(join(root, "spec/README.md"), indexWithCapability);
  await writeFile(join(root, "spec/capabilities/historical.md"), reusedCapability);
  await executeFile("git", ["add", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "feature identity"], { cwd: root });
  await executeFile("git", ["switch", "--quiet", "main"], { cwd: root });
  await mkdir(join(root, "spec/capabilities"), { recursive: true });
  await writeFile(join(root, "spec/README.md"), indexWithCapability);
  await writeFile(join(root, "spec/capabilities/historical.md"), reusedCapability);
  await executeFile("git", ["add", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "parallel identity"], { cwd: root });
  await executeFile("git", ["switch", "--quiet", "feature"], { cwd: root });

  const validated = await execute(["validate", "--format", "json"], root);
  assert.equal(validated.exitCode, 1, validated.standardOutput);
  assert.equal(
    (JSON.parse(validated.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_ID_REUSED",
  );
});

test("REQ-2C8E8085 unchanged IDs do not require scanning older malformed history", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-unchanged-id-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await writeFile(
    join(root, "spec/README.md"),
    emptyIndex.replace("## Domain concepts", "- [CAP-A1000001 — Missing](missing.md)\n\n## Domain concepts"),
  );
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "old malformed graph"], { cwd: root });
  await writeFile(join(root, "spec/README.md"), emptyIndex);
  await executeFile("git", ["add", "spec/README.md"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "valid current graph"], { cwd: root });

  const validated = await execute(["validate", "--format", "json"], root);
  assert.equal(validated.exitCode, 0, validated.standardOutput);
  assert.equal(
    (JSON.parse(validated.standardOutput) as { result: { history: { status: string } } }).result.history.status,
    "complete",
  );
});

test("REQ-8B656FC5 unresolved configured integration refs are technical failures", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-ref-unresolved-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "trunk"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "trunk only"], { cwd: root });

  const validated = await execute(["validate", "--format", "json"], root);
  assert.equal(validated.exitCode, 3, validated.standardOutput);
  assert.equal(
    (JSON.parse(validated.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_GIT_REF_UNRESOLVED",
  );
});

test("REQ-8B656FC5 incomplete history warns on validate and blocks reserved ID issuance", async () => {
  const origin = await mkdtemp(join(tmpdir(), "sdd-cli-shallow-origin-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: origin });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: origin });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: origin });
  assert.equal((await execute(["init", "--format", "json"], origin)).exitCode, 0);
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: origin });
  await executeFile("git", ["commit", "--quiet", "-m", "initial"], { cwd: origin });
  await writeFile(join(origin, "README.md"), "second commit\n");
  await executeFile("git", ["add", "README.md"], { cwd: origin });
  await executeFile("git", ["commit", "--quiet", "-m", "second"], { cwd: origin });

  const parent = await mkdtemp(join(tmpdir(), "sdd-cli-shallow-clone-"));
  const clone = join(parent, "project");
  await executeFile("git", ["clone", "--quiet", "--depth", "1", `file://${origin}`, clone]);
  const validated = await execute(["validate", "--format", "json"], clone);
  assert.equal(validated.exitCode, 0, validated.standardOutput);
  const validationValue = JSON.parse(validated.standardOutput) as {
    result: { history: { status: string } };
    diagnostics: readonly { code: string; severity: string }[];
  };
  assert.equal(validationValue.result.history.status, "incomplete");
  assert.ok(
    validationValue.diagnostics.some(
      (diagnostic) => diagnostic.code === "SDD_GIT_HISTORY_INCOMPLETE" && diagnostic.severity === "warning",
    ),
  );

  const generated = await execute(["id", "concept", "--format", "json"], clone);
  assert.equal(generated.exitCode, 3, generated.standardOutput);
  assert.equal(
    (JSON.parse(generated.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_GIT_HISTORY_INCOMPLETE",
  );
});

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
    result: {
      valid: boolean;
      history: { status: string; resolved_ref: string | null };
      fingerprints: readonly { id: string }[];
    };
    diagnostics: readonly { details: { remediation?: string } }[];
  };
  assert.equal(value.schema_version, "1.0");
  assert.equal(value.command, "validate");
  assert.equal(value.project_id, "SDD-17EF8B29");
  assert.equal(value.status, "ok");
  assert.equal(value.result.valid, true);
  assert.equal(value.result.history.status, "complete");
  assert.equal(typeof value.result.history.resolved_ref, "string");
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

test("REQ-24073D4F trace returns only deterministic graph relationships without test conclusions", async () => {
  const traced = await execute(["trace", "REQ-DD91AD0F", "--format", "json"]);
  assert.equal(traced.exitCode, 0, traced.standardOutput);
  const value = JSON.parse(traced.standardOutput) as {
    status: string;
    result: {
      object_id: string;
      ancestry: readonly string[];
      dependencies: readonly string[];
      dependents: readonly string[];
      referrers: readonly { type: string; source_id: string }[];
    };
  };
  assert.equal(value.status, "ok");
  assert.deepEqual(Object.keys(value.result), ["object_id", "ancestry", "dependencies", "dependents", "referrers"]);
  assert.deepEqual(value.result, {
    object_id: "REQ-DD91AD0F",
    ancestry: ["CAP-79E22870"],
    dependencies: [],
    dependents: [],
    referrers: [],
  });
  assert.equal("mapped_tests" in value.result, false);
  assert.equal("coverage" in value.result, false);

  const human = await execute(["trace", "REQ-DD91AD0F"]);
  assert.equal(human.exitCode, 0);
  assert.match(human.standardOutput, /^trace: ok\nproject: SDD-17EF8B29\nobject: REQ-DD91AD0F\n/u);

  const missing = await execute(["trace", "REQ-FFFFFFFF", "--format", "json"]);
  assert.equal(missing.exitCode, 3);
  assert.equal(
    (JSON.parse(missing.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_GRAPH_OBJECT_UNKNOWN",
  );
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

test("REQ-0361538D REQ-7C848ED0 rejects unknown identities and guides project-selector recovery", async () => {
  const missing = await execute(["inspect", "REQ-FFFFFFFF", "--format", "json"]);
  assert.equal(missing.exitCode, 3);
  assert.equal((JSON.parse(missing.standardOutput) as { status: string }).status, "error");

  const invalid = await execute(["validate", "--config", ".sdd/config.yaml", "--cwd", ".", "--format", "json"]);
  assert.equal(invalid.exitCode, 3);
  const invalidValue = JSON.parse(invalid.standardOutput) as {
    status: string;
    diagnostics: readonly { details: { remediation: string } }[];
  };
  assert.equal(invalidValue.status, "error");
  assert.equal(
    invalidValue.diagnostics[0]?.details.remediation,
    "Use --cwd <project-root> or --config <project-root>/.sdd/config.yaml to select one SDD Project.",
  );

  const unsupported = await execute(["validate", "--project", ".", "--format", "json"]);
  assert.equal(unsupported.exitCode, 3);
  const unsupportedValue = JSON.parse(unsupported.standardOutput) as {
    diagnostics: readonly { code: string; message: string; details: { remediation: string } }[];
  };
  assert.deepEqual(unsupportedValue.diagnostics[0], {
    code: "SDD_CONFIG_CLI_ARGUMENT_INVALID",
    severity: "error",
    message: "The --project selector is unsupported.",
    details: {
      remediation: "Use --cwd <project-root> or --config <project-root>/.sdd/config.yaml to select one SDD Project.",
    },
  });

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
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
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
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
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
