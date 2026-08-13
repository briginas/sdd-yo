import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { resolveProject } from "../src/config/resolve-project.ts";
import type { Fingerprint, GitObjectId, ProjectPath } from "../src/contracts/identifiers.ts";
import { loadCanonicalProjectGraphAt } from "../src/ids/history-index.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";
import { prepareApprovedProposal } from "../src/proposal/prepare-proposal.ts";
import type { ProposalPackage } from "../src/proposal/validate-proposal.ts";
import { fingerprintTestInput } from "../src/tests/test-index.ts";
import type { TestIndex } from "../src/tests/test-index.ts";
import { runCli } from "../src/cli/run-cli.ts";
import type { ApprovalEvidence, QaEvidence, TestExecutionEvidence } from "../src/verification/evidence.ts";
import { runMergeGate } from "../src/verification/merge-report.ts";
import { buildSemanticAnalysisInputManifest } from "../src/verification/semantic-review.ts";

const executeFile = promisify(execFile);

const index = `---\nsdd:\n  type: index\n---\n# Merge gate\n\n## Capabilities <!-- sdd:capabilities -->\n\n- [CAP-A1000001 — Delivery](capabilities/delivery.md)\n\n## Domain concepts <!-- sdd:concepts -->\n`;
const capability = `---\nsdd:\n  type: capability\n  id: CAP-A1000001\n---\n\n# Delivery\n\n## Purpose <!-- sdd:purpose -->\n\nDeliver safely.\n\n<a id="req-a1000001"></a>\n\n## REQ-A1000001 — Deliver item\n\n\`\`\`sdd\nkind: behavior\nverification: automated\n\`\`\`\n\n### Relations <!-- sdd:relations -->\n\n### Statement <!-- sdd:statement -->\n\nThe system shall deliver one item.\n\n### Acceptance criteria <!-- sdd:acceptance -->\n\n- Delivery is observable.\n`;

async function cli(argv: readonly string[], root: string) {
  const output: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: root,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (value) => output.push(value),
    writeStandardError: () => {},
    writeOutputFile: () => {
      throw new Error("Unexpected output file.");
    },
  });
  return { exitCode, value: JSON.parse(output.join("")) as any };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "sdd-merge-bundle-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await cli(["init", "--format", "json"], root)).exitCode, 0);
  await writeFile(join(root, "spec/README.md"), index);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capability);
  await writeFile(join(root, ".gitignore"), ".sdd-stage/\n");
  await mkdir(join(root, ".sdd-stage"));
  await executeFile("git", ["add", ".sdd/config.yaml", "spec", ".gitignore"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim() as GitObjectId;
  const candidate = await mkdtemp(join(tmpdir(), "sdd-merge-bundle-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  const candidateFile = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(candidateFile, (await readFile(candidateFile, "utf8")).replace("one item", "each item exactly once"));
  const bundlePath = ".sdd-stage/proposal" as ProjectPath;
  const materialized = await cli(
    [
      "proposal",
      "materialize",
      "--mode",
      "spec-code",
      "--base",
      base,
      "--candidate",
      candidate,
      "--bundle",
      bundlePath,
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(materialized.exitCode, 0, JSON.stringify(materialized.value));
  const packageValue = materialized.value.result.proposal as ProposalPackage;
  const selected = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: root });
  assert.ok(selected.ok);
  if (!selected.ok) throw new Error("Project selection failed.");
  const reader = await import("../src/platform/process-git-reader.ts").then(({ discoverProcessGitReader }) =>
    discoverProcessGitReader(nodeProcessRunner, root),
  );
  const approval: ApprovalEvidence = {
    schema_version: "1.0",
    artifact_type: "approval_evidence",
    project_id: packageValue.project_id,
    issuer: "review",
    actor: "user:1",
    decision: "approved",
    mode: packageValue.mode,
    subject: {
      base: packageValue.base,
      candidate: packageValue.candidate,
      object_delta: packageValue.object_delta,
      code_targets: packageValue.code_targets,
      affected_scope: packageValue.affected_scope,
    },
  };
  await executeFile("git", ["checkout", "--quiet", "-b", "change"], { cwd: root });
  await cp(join(candidate, "spec"), join(root, "spec"), { recursive: true, force: true });
  await executeFile("git", ["add", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "candidate"], { cwd: root });
  const branchHead = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim() as GitObjectId;
  const prepared = await prepareApprovedProposal({
    fileSystem: nodeFileSystem,
    gitReader: reader,
    project: selected.value,
    bundlePath,
    branchHead,
    integrationRef: base,
    approvalEvidence: [approval],
  });
  const testIndex: TestIndex = {
    schema_version: "1.0",
    artifact_type: "test_index",
    project_id: packageValue.project_id,
    subject: {
      head_ref: branchHead,
      config_fingerprint: prepared.report.config_fingerprint,
      adapter_fingerprints: { unit: packageValue.object_delta.semantic_fingerprint },
    },
    tests: [
      {
        test_ref: "unit:delivery",
        adapter_id: "unit",
        local_id: "delivery",
        full_name: "REQ-A1000001 delivery",
        requirement_ids: ["REQ-A1000001" as TestIndex["tests"][number]["requirement_ids"][number]],
      },
    ],
  };
  const execution: TestExecutionEvidence = {
    schema_version: "1.0",
    artifact_type: "test_execution_evidence",
    project_id: packageValue.project_id,
    issuer: "ci",
    subject: {
      head_ref: branchHead,
      test_index_fingerprint: fingerprintTestInput(testIndex),
      config_fingerprint: prepared.report.config_fingerprint,
    },
    results: [{ test_ref: "unit:delivery", status: "passed" }],
  };
  const qa: QaEvidence = {
    schema_version: "1.0",
    artifact_type: "qa_evidence",
    project_id: packageValue.project_id,
    issuer: "qa",
    actor: "user:1",
    decision: "passed",
    subject: {
      head_ref: branchHead,
      integration_ref: base,
      affected_scope_fingerprint: packageValue.affected_scope.fingerprint,
    },
    capability_ids: packageValue.affected_scope.capabilities,
    manual_requirements: [],
  };
  const baseGraph = await loadCanonicalProjectGraphAt(reader, base, packageValue.project_id);
  const headGraph = await loadCanonicalProjectGraphAt(reader, branchHead, packageValue.project_id);
  assert.ok(baseGraph && headGraph);
  const semantic = buildSemanticAnalysisInputManifest({
    base: baseGraph,
    candidate: headGraph,
    project_id: packageValue.project_id,
    analyzer: { name: "semantic-review", version: "1.0" },
  });
  const input = {
    fileSystem: nodeFileSystem,
    gitReader: reader,
    project: selected.value,
    bundlePath,
    branch_head_ref: "change",
    integration_ref: "main",
    approvals: [{ artifact: approval, source: "evidence/approval.json" as ProjectPath }],
    governance: [],
    test_index: { artifact: testIndex, source: "evidence/test-index.json" as ProjectPath },
    test_execution: [{ artifact: execution, source: "evidence/execution.json" as ProjectPath }],
    qa: [{ artifact: qa, source: "evidence/qa.json" as ProjectPath }],
    semantic_review: {
      manifest: { artifact: semantic, source: "evidence/semantic.json" as ProjectPath },
      findings: [],
      resolutions: [],
      human_reviews: [],
      model_analysis_performed: true,
    },
    current_adapter_fingerprints: { unit: packageValue.object_delta.semantic_fingerprint } as Readonly<
      Record<string, Fingerprint>
    >,
  } as const;
  return { root, base, branchHead, bundlePath, packageValue, approval, input, testIndex, execution, qa, semantic };
}

test("REQ-64DB876B REQ-93A4C44B emits a deterministic read-only MergeReport from one retained bundle", async () => {
  const value = await fixture();
  const first = await runMergeGate(value.input);
  const second = await runMergeGate(value.input);
  assert.deepEqual(first, second);
  assert.equal(first.status, "PASS", JSON.stringify(first.diagnostics));
  assert.equal(first.branch_head, value.branchHead);
  assert.equal(first.integration_ref, value.base);
  assert.ok(first.input_manifest.some((entry) => entry.source === ".sdd-stage/proposal/proposal-package.json"));
});

test("REQ-E85A06C3 REQ-3B9FC7FF REQ-8E2D9A5F REQ-BCFA15D8 blocks stale refs and evidence", async () => {
  const value = await fixture();
  const stale = await runMergeGate({ ...value.input, integration_ref: "change" });
  assert.equal(stale.status, "BLOCKED");
  const rejected = await runMergeGate({
    ...value.input,
    approvals: [
      {
        artifact: { ...value.approval, decision: "rejected" as const },
        source: "evidence/rejected.json" as ProjectPath,
      },
    ],
  });
  assert.equal(rejected.status, "BLOCKED");
});

test("REQ-41EDF9A3 REQ-220945C2 REQ-82256D82 REQ-44068C1A REQ-7FCCF943 REQ-FDD51416 merge check consumes a bundle rather than package and candidate paths", async () => {
  const value = await fixture();
  const evidence = join(value.root, "evidence");
  await mkdir(evidence);
  await Promise.all([
    writeFile(
      join(evidence, "change.json"),
      JSON.stringify({
        schema_version: "1.0",
        artifact_type: "change_descriptor",
        project_id: value.packageValue.project_id,
        mode: value.packageValue.mode,
        integration_ref: "main",
        proposal_ref: "change",
        approved_delta: {
          semantic: value.packageValue.object_delta.semantic_fingerprint,
          structural: value.packageValue.object_delta.structural_fingerprint,
        },
        code_targets: value.packageValue.code_targets,
      }),
    ),
    writeFile(join(evidence, "approval.json"), JSON.stringify(value.approval)),
    writeFile(join(evidence, "test-index.json"), JSON.stringify(value.testIndex)),
    writeFile(join(evidence, "execution.json"), JSON.stringify(value.execution)),
    writeFile(join(evidence, "qa.json"), JSON.stringify(value.qa)),
    writeFile(join(evidence, "semantic.json"), JSON.stringify(value.semantic)),
  ]);
  const result = await cli(
    [
      "merge",
      "check",
      "--change",
      "evidence/change.json",
      "--bundle",
      value.bundlePath,
      "--approval",
      "evidence/approval.json",
      "--test-index",
      "evidence/test-index.json",
      "--test-evidence",
      "evidence/execution.json",
      "--qa",
      "evidence/qa.json",
      "--input-manifest",
      "evidence/semantic.json",
      "--format",
      "json",
    ],
    value.root,
  );
  assert.equal(result.exitCode, 0, JSON.stringify(result.value));
  assert.equal(result.value.status, "ok");
});
