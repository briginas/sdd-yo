import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { resolveProject } from "../src/config/resolve-project.ts";
import { isProjectPath } from "../src/contracts/identifiers.ts";
import type { GitObjectId, ProjectPath } from "../src/contracts/identifiers.ts";
import { loadCanonicalProjectGraphAt } from "../src/ids/history-index.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { discoverProcessGitReader } from "../src/platform/process-git-reader.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { prepareApprovedProposal } from "../src/proposal/prepare-proposal.ts";
import { validateProposal } from "../src/proposal/validate-proposal.ts";
import { runCli } from "../src/cli/run-cli.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";
import { fingerprintTestInput } from "../src/tests/test-index.ts";
import type { TestIndex } from "../src/tests/test-index.ts";
import type {
  ApprovalEvidence,
  GovernanceEvidence,
  QaEvidence,
  TestExecutionEvidence,
} from "../src/verification/evidence.ts";
import { buildSemanticAnalysisInputManifest } from "../src/verification/semantic-review.ts";
import { runMergeGate } from "../src/verification/merge-report.ts";
import type { VersionedMergeInput } from "../src/verification/merge-report.ts";

const executeFile = promisify(execFile);

const indexSource = `---
sdd:
  type: index
---
# Merge gate

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Delivery](capabilities/delivery.md)

## Domain concepts <!-- sdd:concepts -->
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Delivery

## Purpose <!-- sdd:purpose -->

Deliver safely.

<a id="req-a1000001"></a>

## REQ-A1000001 — Deliver item

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

### Statement <!-- sdd:statement -->

The system shall deliver one item.

### Acceptance criteria <!-- sdd:acceptance -->

- Delivery is observable.
`;

function source(value: string): ProjectPath {
  assert.ok(isProjectPath(value));
  return value;
}

function versioned<T>(artifact: T, path: string = "stdin"): VersionedMergeInput<T> {
  return { artifact, source: path === "stdin" ? "stdin" : source(path) };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "sdd-merge-gate-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  await runCli({
    argv: ["init", "--format", "json"],
    workingDirectory: root,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: () => {},
    writeStandardError: () => {},
    writeOutputFile: () => {},
  });
  const configPath = join(root, ".sdd/config.yaml");
  await writeFile(
    configPath,
    (await readFile(configPath, "utf8")).replace(
      "allowed_issuers: []",
      "allowed_issuers: [ci, qa, review, governance]",
    ),
  );
  await writeFile(join(root, "spec/README.md"), indexSource);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capabilitySource);
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim() as GitObjectId;
  const candidate = await mkdtemp(join(tmpdir(), "sdd-merge-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  const candidateFile = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(
    candidateFile,
    (await readFile(candidateFile, "utf8")).replace("deliver one item", "deliver each item exactly once"),
  );
  const selected = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: root });
  assert.ok(selected.ok);
  if (!selected.ok) throw new Error("Project resolution failed.");
  const reader = await discoverProcessGitReader(nodeProcessRunner, root);
  const packageValue = await validateProposal({
    fileSystem: nodeFileSystem,
    gitReader: reader,
    project: selected.value,
    baseRef: base,
    candidatePath: candidate,
    mode: "spec-code",
    codeTargets: [],
  });
  const approval: ApprovalEvidence = {
    schema_version: "1.0",
    artifact_type: "approval_evidence",
    project_id: packageValue.project_id,
    issuer: "review",
    actor: "user:1",
    decision: "approved",
    mode: packageValue.mode,
    subject: {
      base_ref: packageValue.base.git_ref,
      semantic_delta_fingerprint: packageValue.object_delta.semantic_fingerprint,
      structural_delta_fingerprint: packageValue.object_delta.structural_fingerprint,
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
    package: packageValue,
    candidatePath: candidate,
    branchHead,
    integrationRef: base,
    approvalEvidence: [approval],
  });
  const index: TestIndex = {
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
      test_index_fingerprint: fingerprintTestInput(index),
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
  const manifest = buildSemanticAnalysisInputManifest({
    base: baseGraph,
    candidate: headGraph,
    project_id: packageValue.project_id,
    analyzer: { name: "semantic-review", version: "1.0" },
  });
  const input = {
    fileSystem: nodeFileSystem,
    gitReader: reader,
    project: selected.value,
    package: versioned(packageValue),
    candidatePath: candidate,
    branch_head_ref: "change",
    integration_ref: "main",
    approvals: [versioned(approval, "evidence/approval.json")],
    governance: [],
    test_index: versioned(index, "evidence/test-index.json"),
    test_execution: [versioned(execution, "evidence/execution.json")],
    qa: [versioned(qa, "evidence/qa.json")],
    semantic_review: {
      manifest: versioned(manifest, "evidence/semantic-input.json"),
      findings: [],
      resolutions: [],
      human_reviews: [],
      model_analysis_performed: true,
    },
    current_adapter_fingerprints: { unit: packageValue.object_delta.semantic_fingerprint },
  } as const;
  return { root, base, branchHead, reader, input, approval, packageValue };
}

test("REQ-64DB876B REQ-93A4C44B emits a deterministic read-only MergeReport", async () => {
  const value = await fixture();
  const before = (await executeFile("git", ["status", "--porcelain=v1"], { cwd: value.root })).stdout;
  const first = await runMergeGate(value.input);
  const second = await runMergeGate(value.input);
  assert.deepEqual(first, second);
  assert.equal(first.status, "PASS");
  assert.equal(first.branch_head, value.branchHead);
  assert.equal(first.integration_ref, value.base);
  assert.equal(first.test_summary.status, "PASS");
  assert.equal(first.qa_summary.status, "PASS");
  assert.ok(first.input_manifest.length >= 5);
  assert.deepEqual(
    first.input_manifest,
    [...first.input_manifest].toSorted((left, right) =>
      `${left.artifact_type}\0${left.fingerprint}\0${left.source}` <
      `${right.artifact_type}\0${right.fingerprint}\0${right.source}`
        ? -1
        : 1,
    ),
  );
  assert.equal((await executeFile("git", ["status", "--porcelain=v1"], { cwd: value.root })).stdout, before);
});

test("REQ-E85A06C3 REQ-3B9FC7FF REQ-8E2D9A5F REQ-BCFA15D8 blocks stale refs and mode evidence", async () => {
  const value = await fixture();
  const staleRef = await runMergeGate({ ...value.input, integration_ref: "change" });
  assert.equal(staleRef.status, "BLOCKED");
  assert.ok(staleRef.diagnostics.some((item) => item.code === "SDD_MERGE_INTEGRATION_REF_NOT_CURRENT"));
  const wrongModeApproval = { ...value.approval, mode: "spec" as const };
  const staleMode = await runMergeGate({ ...value.input, approvals: [versioned(wrongModeApproval)] });
  assert.equal(staleMode.status, "BLOCKED");
  assert.equal(staleMode.findings_and_evidence.evidence_status, "stale");
  const staleSemantic = await runMergeGate({
    ...value.input,
    semantic_review: {
      ...value.input.semantic_review,
      manifest: versioned({
        ...value.input.semantic_review.manifest.artifact,
        input_fingerprint: value.packageValue.object_delta.semantic_fingerprint,
      }),
    },
  });
  assert.equal(staleSemantic.status, "BLOCKED");
  assert.ok(staleSemantic.diagnostics.some((item) => item.code === "SDD_MERGE_SEMANTIC_INPUT_STALE"));
});

test("REQ-FDD51416 REQ-BCFA15D8 applies blocker precedence to history and human evidence", async () => {
  const value = await fixture();
  const incompleteReader = { ...value.reader, historyStatus: async () => "incomplete" as const };
  const blocked = await runMergeGate({
    ...value.input,
    gitReader: incompleteReader,
    approvals: [],
    qa: [],
  });
  assert.equal(blocked.status, "BLOCKED");
  assert.ok(blocked.diagnostics.some((item) => item.code === "SDD_MERGE_HISTORY_INCOMPLETE"));
  assert.ok(blocked.diagnostics.some((item) => item.code === "SDD_EVIDENCE_APPROVAL_MISSING"));
  const review = await runMergeGate({ ...value.input, qa: [] });
  assert.equal(review.status, "REVIEW_REQUIRED");
});

test("REQ-E85A06C3 binds applicable governance decisions to governed scope", async () => {
  const value = await fixture();
  const initial = await runMergeGate(value.input);
  const governance: GovernanceEvidence = {
    schema_version: "1.0",
    artifact_type: "governance_evidence",
    project_id: value.packageValue.project_id,
    issuer: "governance",
    actor: "user:2",
    decision: "approved",
    subject: {
      config_fingerprint: initial.config_fingerprint,
      project_scope_fingerprint: initial.adoption.project_scope_fingerprint,
      from_adoption_mode: "complete",
      to_adoption_mode: "incremental",
    },
  };
  const current = await runMergeGate({
    ...value.input,
    governance: [versioned(governance)],
    adoption_transition: { from: "complete", to: "incremental" },
  });
  assert.equal(current.status, "PASS");
  const rejected = await runMergeGate({
    ...value.input,
    governance: [versioned({ ...governance, decision: "rejected" as const })],
    adoption_transition: { from: "complete", to: "incremental" },
  });
  assert.equal(rejected.status, "BLOCKED");
  assert.equal(rejected.findings_and_evidence.evidence_status, "negative");
});
