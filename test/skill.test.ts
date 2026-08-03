import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const executeFile = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const skillRoot = join(repositoryRoot, "skills/sdd-yo");
const checker = join(skillRoot, "scripts/check-cli-compatibility");

async function fakeCli(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sdd-skill-cli-"));
  const executable = join(root, "sdd");
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
const command = args[0];
const operation = command === "proposal" ? \`proposal.\${args[1] ?? ""}\` : command;
const mode = process.env.SDD_SKILL_FAKE_MODE ?? "valid";
if (mode === "malformed") process.stdout.write("not json");
else if (mode === "interrupted") process.kill(process.pid, "SIGTERM");
else {
  const rootIndex = args.indexOf("--root");
  const projectRoot = rootIndex === -1 ? undefined : args[rootIndex + 1];
  if (command === "init" && projectRoot !== undefined) {
    mkdirSync(join(projectRoot, ".sdd"), { recursive: true });
    mkdirSync(join(projectRoot, "spec/capabilities"), { recursive: true });
    mkdirSync(join(projectRoot, "spec/concepts"), { recursive: true });
    writeFileSync(join(projectRoot, ".sdd/config.yaml"), "project_id: SDD-A1000001\\n");
    writeFileSync(join(projectRoot, "spec/README.md"), "# Specification\\n");
  }
  const schema_version = mode === "incompatible" ? "2.0" : "1.0";
  const idKind = args[1];
  const idPrefix = idKind === "capability" ? "CAP" : idKind === "requirement" ? "REQ" : "CON";
  const countIndex = args.indexOf("--count");
  const count = countIndex === -1 ? 1 : Number(args[countIndex + 1]);
  const candidates = Array.from({ length: count }, (_, index) => \`${"${idPrefix}"}-A100000\${index + 1}\`);
  const fingerprint = "sha256:" + "a".repeat(64);
  const semanticCandidate = { objects: ["REQ-A1000001", "REQ-A1000002"], reason: "requirement-dependency" };
  const proposalPackage = {
    schema_version: "1.0", artifact_type: "proposal_package", project_id: "SDD-A1000001", mode: "spec-code",
    base: { git_ref: "base123", tree_fingerprint: fingerprint },
    candidate: { source: "manifest", tree_fingerprint: fingerprint },
    object_delta: { semantic_fingerprint: fingerprint, structural_fingerprint: fingerprint, added: ["REQ-A1000001"], modified: [], deleted: [] },
    code_targets: [],
    affected_scope: { fingerprint, requirements: ["REQ-A1000001"], capabilities: ["CAP-A1000001"] },
    diagnostics: [], semantic_candidates: [semanticCandidate],
  };
  const conflictReport = {
    schema_version: "1.0", artifact_type: "conflict_report", project_id: "SDD-A1000001",
    integration_ref: "integration123", branch_head: "branch123", merge_base: "base123",
    config_fingerprint: fingerprint, mechanical_conflicts: [], semantic_candidates: [semanticCandidate], input_fingerprint: fingerprint,
  };
  const specPatch = {
    schema_version: "1.0", artifact_type: "spec_patch", project_id: "SDD-A1000001",
    base_tree_fingerprint: fingerprint, result_tree_fingerprint: fingerprint, operations: [],
  };
  const result = command === "init"
    ? { created_paths: [".sdd/config.yaml", "spec/README.md", "spec/capabilities", "spec/concepts"] }
    : command === "id"
      ? {
          candidates: mode === "wrong-id-prefix" ? ["CON-A1000001"] : mode === "duplicate-id" ? ["REQ-A1000001", "REQ-A1000001"] : candidates,
          history: mode === "unchecked-id" ? { status: "unchecked", resolved_ref: null } : { status: "complete", resolved_ref: "abc123" },
        }
      : operation === "proposal.validate"
        ? mode === "invalid-proposal" ? { ...proposalPackage, semantic_candidates: null } : proposalPackage
        : operation === "proposal.prepare"
          ? { conflict_report: conflictReport, spec_patch: mode === "review-required" ? null : mode === "invalid-patch" ? { ...specPatch, project_id: "SDD-B1000001" } : specPatch }
          : operation === "proposal.apply"
            ? { result_tree_fingerprint: fingerprint, applied_paths: mode === "invalid-apply" ? ["../outside"] : ["spec/capabilities/example.md"] }
            : { valid: true, fingerprints: [] };
  const status = mode === "review-required" ? "review_required" : "ok";
  process.stdout.write(JSON.stringify({ schema_version, command: operation, project_id: "SDD-A1000001", status, result, diagnostics: [] }));
  if (mode === "review-required") process.exitCode = 2;
}
`,
  );
  await chmod(executable, 0o755);
  return executable;
}

async function runChecker(
  cli: string,
  args: readonly string[],
  mode = "valid",
): Promise<{ readonly stdout: string; readonly stderr: string; readonly code: number }> {
  try {
    const result = await executeFile(process.execPath, [checker, "--cli", cli, "--", ...args], {
      env: { ...process.env, SDD_SKILL_FAKE_MODE: mode },
    });
    return { stdout: result.stdout, stderr: result.stderr, code: 0 };
  } catch (error) {
    const failure = error as { readonly stdout: string; readonly stderr: string; readonly code: number };
    return { stdout: failure.stdout, stderr: failure.stderr, code: failure.code };
  }
}

test("REQ-E26A859E skill package discloses only the bounded 8.3 routes", async () => {
  const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
  const agentMetadata = await readFile(join(skillRoot, "agents/openai.yaml"), "utf8");
  const references = await readdir(join(skillRoot, "references"));
  const scripts = await readdir(join(skillRoot, "scripts"));
  const templates = await readdir(join(skillRoot, "templates"));

  assert.match(skill, /^---\nname: sdd-yo\n/u);
  assert.deepEqual(references.toSorted(), [
    "authoring.md",
    "branch-preparation.md",
    "diagnostics.md",
    "modes.md",
    "object-model.md",
    "onboarding.md",
    "proposal-gate.md",
  ]);
  assert.deepEqual(scripts, ["check-cli-compatibility"]);
  assert.deepEqual(templates.toSorted(), ["capability.md", "concept.md"]);
  assert.match(skill, /references\/modes\.md/u);
  assert.match(skill, /references\/authoring\.md/u);
  assert.match(agentMetadata, /review, or prepare an exact approved change/u);
  assert.match(skill, /references\/proposal-gate\.md/u);
  assert.match(skill, /references\/branch-preparation\.md/u);
  assert.doesNotMatch(skill, /references\/(?:verification|semantic-review)\.md/u);
});

test("REQ-E26A859E authoring route keeps modes distinct and candidates unapplied", async () => {
  const modes = await readFile(join(skillRoot, "references/modes.md"), "utf8");
  const authoring = await readFile(join(skillRoot, "references/authoring.md"), "utf8");
  const capabilityTemplate = await readFile(join(skillRoot, "templates/capability.md"), "utf8");
  const conceptTemplate = await readFile(join(skillRoot, "templates/concept.md"), "utf8");

  assert.match(modes, /Select `spec-code` when the requested observable product behavior will\s+change/u);
  assert.match(modes, /Select `spec` when implementation behavior already exists/u);
  assert.match(modes, /Select `code` when the active Requirement is correct/u);
  assert.match(modes, /Ask the user before selecting a mode/u);
  assert.match(authoring, /preserve the complete specification tree byte-for-byte/u);
  assert.match(authoring, /Do not write it into the active specification or implementation/u);
  assert.match(authoring, /not a ProposalPackage or\s+gate result/u);
  assert.match(capabilityTemplate, /CAP-CLI_GENERATED/u);
  assert.match(capabilityTemplate, /REQ-CLI_GENERATED/u);
  assert.match(conceptTemplate, /CON-CLI_GENERATED/u);
});

test("REQ-382BBBD6 REQ-BFC18F28 compatibility wrapper verifies only reported init paths", async () => {
  const cli = await fakeCli();
  const projectRoot = await mkdtemp(join(tmpdir(), "sdd-skill-project-"));
  await writeFile(join(projectRoot, "unrelated.txt"), "preserve\n");

  const result = await runChecker(cli, ["init", "--root", projectRoot, "--adoption", "incremental"]);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as {
    readonly schema_version: string;
    readonly project_id: string;
    readonly result: { readonly created_paths: readonly string[] };
  };
  assert.equal(response.schema_version, "1.0");
  assert.equal(response.project_id, "SDD-A1000001");
  assert.deepEqual(response.result.created_paths, [
    ".sdd/config.yaml",
    "spec/README.md",
    "spec/capabilities",
    "spec/concepts",
  ]);
  assert.equal(await readFile(join(projectRoot, "unrelated.txt"), "utf8"), "preserve\n");
});

test("REQ-0361538D compatibility wrapper fails closed on unavailable or invalid CLI results", async () => {
  const cli = await fakeCli();
  const selector = ["validate", "--cwd", repositoryRoot] as const;

  for (const mode of ["malformed", "incompatible", "interrupted"] as const) {
    const result = await runChecker(cli, selector, mode);
    assert.equal(result.code, 3, `${mode}: ${result.stderr}`);
  }

  const missing = await runChecker(join(repositoryRoot, "does-not-exist-sdd"), selector);
  assert.equal(missing.code, 3);
  assert.match(missing.stderr, /CLI is missing/u);

  const unsupported = await runChecker(cli, ["findings", "validate", "--cwd", repositoryRoot]);
  assert.equal(unsupported.code, 3);
  assert.match(unsupported.stderr, /proposal validate, prepare, or apply/u);
});

test("REQ-2C8E8085 compatibility wrapper accepts only project-aware authoring IDs", async () => {
  const cli = await fakeCli();
  const selector = ["--cwd", repositoryRoot] as const;
  const generated = await runChecker(cli, ["id", "requirement", "--count", "2", ...selector]);
  assert.equal(generated.code, 0, generated.stderr);
  assert.deepEqual((JSON.parse(generated.stdout) as { result: { candidates: readonly string[] } }).result.candidates, [
    "REQ-A1000001",
    "REQ-A1000002",
  ]);

  for (const mode of ["unchecked-id", "wrong-id-prefix", "duplicate-id"] as const) {
    const result = await runChecker(cli, ["id", "requirement", "--count", "2", ...selector], mode);
    assert.equal(result.code, 3, mode);
    assert.match(result.stderr, /invalid project-aware ID result/u);
  }

  const projectId = await runChecker(cli, ["id", "project", ...selector]);
  assert.equal(projectId.code, 3);
  assert.match(projectId.stderr, /only capability, requirement, or concept IDs/u);

  const projectless = await runChecker(cli, ["id", "concept"]);
  assert.equal(projectless.code, 3);
  assert.match(projectless.stderr, /requires an explicit --cwd or --config selector/u);
});

test("REQ-8DE9E078 REQ-E80F09C6 REQ-18F84CE2 review route accepts only deterministic ProposalPackage JSON", async () => {
  const cli = await fakeCli();
  const args = [
    "proposal",
    "validate",
    "--mode",
    "spec-code",
    "--base",
    "main",
    "--candidate",
    ".sdd/staging/candidate.json",
    "--cwd",
    repositoryRoot,
  ] as const;
  const result = await runChecker(cli, args);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as {
    readonly command: string;
    readonly result: { readonly artifact_type: string; readonly semantic_candidates: readonly unknown[] };
  };
  assert.equal(response.command, "proposal.validate");
  assert.equal(response.result.artifact_type, "proposal_package");
  assert.equal(response.result.semantic_candidates.length, 1);

  const invalid = await runChecker(cli, args, "invalid-proposal");
  assert.equal(invalid.code, 3);
  assert.match(invalid.stderr, /invalid ProposalPackage result/u);

  const missingCandidate = await runChecker(cli, [
    "proposal",
    "validate",
    "--mode",
    "spec-code",
    "--base",
    "main",
    "--cwd",
    repositoryRoot,
  ]);
  assert.equal(missingCandidate.code, 3);
  assert.match(missingCandidate.stderr, /requires --candidate/u);
});

test("REQ-AFD65A03 REQ-A8739118 REQ-7341DBB7 REQ-964B9F80 preparation preserves approval authority and exact patches", async () => {
  const cli = await fakeCli();
  const args = [
    "proposal",
    "prepare",
    "--package",
    ".sdd/staging/package.json",
    "--candidate",
    ".sdd/staging/candidate.json",
    "--branch-head",
    "HEAD",
    "--integration-ref",
    "main",
    "--approval",
    ".sdd/staging/approval.json",
    "--cwd",
    repositoryRoot,
  ] as const;
  const prepared = await runChecker(cli, args);
  assert.equal(prepared.code, 0, prepared.stderr);
  const response = JSON.parse(prepared.stdout) as {
    readonly result: {
      readonly conflict_report: { readonly artifact_type: string };
      readonly spec_patch: { readonly artifact_type: string };
    };
  };
  assert.equal(response.result.conflict_report.artifact_type, "conflict_report");
  assert.equal(response.result.spec_patch.artifact_type, "spec_patch");

  const review = await runChecker(cli, args, "review-required");
  assert.equal(review.code, 2, review.stderr);
  assert.equal((JSON.parse(review.stdout) as { result: { spec_patch: unknown } }).result.spec_patch, null);

  const invalid = await runChecker(cli, args, "invalid-patch");
  assert.equal(invalid.code, 3);
  assert.match(invalid.stderr, /invalid proposal preparation result/u);
});

test("REQ-3BF12AAD REQ-7AFE9904 exact application route validates selected patch JSON", async () => {
  const cli = await fakeCli();
  const preparation = await readFile(join(skillRoot, "references/branch-preparation.md"), "utf8");
  assert.match(preparation, /Ask the\s+user to select this exact patch for application/u);
  assert.match(preparation, /Never create ApprovalEvidence/u);
  assert.doesNotMatch(preparation, /merge check/u);

  const args = ["proposal", "apply", "--patch", ".sdd/staging/patch.json", "--cwd", repositoryRoot] as const;
  const applied = await runChecker(cli, args);
  assert.equal(applied.code, 0, applied.stderr);
  assert.deepEqual(
    (JSON.parse(applied.stdout) as { result: { applied_paths: readonly string[] } }).result.applied_paths,
    ["spec/capabilities/example.md"],
  );

  const invalid = await runChecker(cli, args, "invalid-apply");
  assert.equal(invalid.code, 3);
  assert.match(invalid.stderr, /invalid proposal apply result/u);
});
