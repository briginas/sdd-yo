import assert from "node:assert/strict";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  isFingerprint,
  isGitObjectId,
  isProjectId,
  isProjectPath,
  isRequirementId,
} from "../src/contracts/identifiers.ts";
import type { Fingerprint, GitObjectId, ProjectId, ProjectPath, RequirementId } from "../src/contracts/identifiers.ts";
import { validateSpecificationGraph } from "../src/graph/validate-graph.ts";
import type { ValidatedSpecificationGraph } from "../src/graph/validate-graph.ts";
import { parseSpecificationDocument } from "../src/markdown/parse-markdown.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { fingerprintTestInput } from "../src/tests/test-index.ts";
import type { TestIndex } from "../src/tests/test-index.ts";
import type { AffectedScope } from "../src/verification/affected-scope.ts";
import {
  assessApprovalEvidence,
  assessGovernanceEvidence,
  assessVerificationEvidence,
  EvidenceInputError,
  importApprovalEvidenceFile,
  importGovernanceEvidenceFile,
  importQaEvidenceFile,
  parseApprovalEvidence,
  parseGovernanceEvidence,
  parseQaEvidence,
  parseTestExecutionEvidence,
} from "../src/verification/evidence.ts";
import type {
  ApprovalEvidence,
  EvidenceInputLimits,
  GovernanceEvidence,
  QaEvidence,
  TestExecutionEvidence,
} from "../src/verification/evidence.ts";

const limits: EvidenceInputLimits = {
  max_artifact_bytes: 64 * 1024,
  max_array_items: 100,
  max_string_bytes: 16 * 1024,
  max_nesting_depth: 16,
};

const indexSource = `---
sdd:
  type: index
---
# Evidence graph

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Evidence](capability.md)

## Concepts <!-- sdd:concepts -->
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Evidence

## Purpose <!-- sdd:purpose -->

Exercise evidence validation.

<a id="req-a1000001"></a>

## REQ-A1000001 — Automated behavior

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

### Statement <!-- sdd:statement -->

The automated behavior shall be tested.

### Acceptance criteria <!-- sdd:acceptance -->

- The automated result passes.

<a id="req-a1000002"></a>

## REQ-A1000002 — Manual behavior

\`\`\`sdd
kind: constraint
verification: manual
\`\`\`

### Relations <!-- sdd:relations -->

### Statement <!-- sdd:statement -->

The manual behavior shall be reviewed.

### Acceptance criteria <!-- sdd:acceptance -->

- The manual result is explicit.
`;

function graph(): ValidatedSpecificationGraph {
  const documents = [
    ["README.md", indexSource],
    ["capability.md", capabilitySource],
  ].map(([path, source]) => {
    assert.ok(isProjectPath(path));
    const parsed = parseSpecificationDocument(path, new TextEncoder().encode(source));
    assert.ok(parsed.ok, parsed.ok ? undefined : parsed.diagnostics[0]?.code);
    return parsed.value;
  });
  const entrypointValue: unknown = "README.md";
  assert.ok(isProjectPath(entrypointValue));
  const validated = validateSpecificationGraph(documents, entrypointValue);
  assert.ok(validated.ok, validated.ok ? undefined : validated.diagnostics[0]?.code);
  return validated.value;
}

function values(): {
  projectId: ProjectId;
  headRef: GitObjectId;
  integrationRef: GitObjectId;
  configFingerprint: Fingerprint;
  adapterFingerprint: Fingerprint;
  scopeFingerprint: Fingerprint;
} {
  const projectId: unknown = "SDD-A1000001";
  const headRef: unknown = "head";
  const integrationRef: unknown = "integration";
  const configFingerprint: unknown = `sha256:${"1".repeat(64)}`;
  const adapterFingerprint: unknown = `sha256:${"2".repeat(64)}`;
  const scopeFingerprint: unknown = `sha256:${"3".repeat(64)}`;
  assert.ok(isProjectId(projectId));
  assert.ok(isGitObjectId(headRef));
  assert.ok(isGitObjectId(integrationRef));
  assert.ok(isFingerprint(configFingerprint));
  assert.ok(isFingerprint(adapterFingerprint));
  assert.ok(isFingerprint(scopeFingerprint));
  return { projectId, headRef, integrationRef, configFingerprint, adapterFingerprint, scopeFingerprint };
}

function requirement(value: string): RequirementId {
  assert.ok(isRequirementId(value));
  return value;
}

function context(): {
  graph: ValidatedSpecificationGraph;
  scope: AffectedScope;
  index: TestIndex;
  execution: TestExecutionEvidence;
  qa: QaEvidence;
  input: ReturnType<typeof values>;
} {
  const input = values();
  const targetGraph = graph();
  const scope: AffectedScope = {
    affected_requirements: [requirement("REQ-A1000001"), requirement("REQ-A1000002")],
    affected_capabilities: ["CAP-A1000001" as AffectedScope["affected_capabilities"][number]],
    canonical_bytes: new TextEncoder().encode("scope"),
    fingerprint: input.scopeFingerprint,
  };
  const index: TestIndex = {
    schema_version: "1.0",
    artifact_type: "test_index",
    project_id: input.projectId,
    subject: {
      head_ref: input.headRef,
      config_fingerprint: input.configFingerprint,
      adapter_fingerprints: { unit: input.adapterFingerprint },
    },
    tests: [
      {
        test_ref: "unit:auto",
        adapter_id: "unit",
        local_id: "auto",
        full_name: "REQ-A1000001 automated",
        requirement_ids: [requirement("REQ-A1000001")],
      },
    ],
  };
  const execution: TestExecutionEvidence = {
    schema_version: "1.0",
    artifact_type: "test_execution_evidence",
    project_id: input.projectId,
    issuer: "ci",
    subject: {
      head_ref: input.headRef,
      test_index_fingerprint: fingerprintTestInput(index),
      config_fingerprint: input.configFingerprint,
    },
    results: [{ test_ref: "unit:auto", status: "passed" }],
  };
  const qa: QaEvidence = {
    schema_version: "1.0",
    artifact_type: "qa_evidence",
    project_id: input.projectId,
    issuer: "qa",
    actor: "user:1",
    decision: "passed",
    subject: {
      head_ref: input.headRef,
      integration_ref: input.integrationRef,
      affected_scope_fingerprint: input.scopeFingerprint,
    },
    capability_ids: [scope.affected_capabilities[0]!],
    manual_requirements: [{ requirement_id: requirement("REQ-A1000002"), decision: "passed" }],
  };
  return { graph: targetGraph, scope, index, execution, qa, input };
}

function assess(
  overrides: {
    test_execution_evidence?: readonly TestExecutionEvidence[];
    qa_evidence?: readonly QaEvidence[];
    current_adapter_fingerprints?: Readonly<Record<string, Fingerprint>>;
  } = {},
) {
  const value = context();
  return assessVerificationEvidence({
    project_id: value.input.projectId,
    head_ref: value.input.headRef,
    integration_ref: value.input.integrationRef,
    config_fingerprint: value.input.configFingerprint,
    current_adapter_fingerprints: overrides.current_adapter_fingerprints ?? {
      unit: value.input.adapterFingerprint,
    },
    graph: value.graph,
    scope: value.scope,
    test_index: value.index,
    test_execution_evidence: overrides.test_execution_evidence ?? [value.execution],
    qa_evidence: overrides.qa_evidence ?? [value.qa],
  });
}

test("REQ-5A832396 REQ-CDE94D0B REQ-C11ACC55 strictly parses bounded execution and QA evidence", async () => {
  const executionBytes = await readFile(
    "fixtures/v1/artifacts/tests/test-execution-evidence/maximally-representative-valid.json",
  );
  const qaBytes = await readFile("fixtures/v1/artifacts/evidence/qa-evidence/maximally-representative-valid.json");
  assert.equal(parseTestExecutionEvidence(executionBytes, limits).results.length, 2);
  assert.equal(parseQaEvidence(qaBytes, limits).manual_requirements.length, 2);
  assert.throws(
    () => parseQaEvidence(qaBytes, { ...limits, max_artifact_bytes: qaBytes.byteLength - 1 }),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED",
  );
  const unknown = new TextEncoder().encode(
    JSON.stringify({ ...(JSON.parse(qaBytes.toString("utf8")) as object), unknown: true }),
  );
  assert.throws(
    () => parseQaEvidence(unknown, limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_INVALID",
  );
});

test("REQ-CDE94D0B REQ-C11ACC55 imports only regular project-scoped QA evidence files", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-evidence-project-"));
  const outside = await mkdtemp(join(tmpdir(), "sdd-evidence-outside-"));
  const bytes = await readFile("fixtures/v1/artifacts/evidence/qa-evidence/minimal-valid.json");
  await writeFile(join(root, "qa.json"), bytes);
  await writeFile(join(outside, "qa.json"), bytes);
  const pathValue: unknown = "qa.json";
  const escapeValue: unknown = "escape.json";
  assert.ok(isProjectPath(pathValue) && isProjectPath(escapeValue));
  assert.equal((await importQaEvidenceFile(nodeFileSystem, root, pathValue, limits)).artifact_type, "qa_evidence");
  await symlink(join(outside, "qa.json"), join(root, "escape.json"));
  await assert.rejects(
    importQaEvidenceFile(nodeFileSystem, root, escapeValue, limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_FILE_OUT_OF_SCOPE",
  );
});

test("REQ-E451458E REQ-5A832396 REQ-CDE94D0B REQ-C11ACC55 satisfies every independent evidence check", () => {
  const result = assess();
  assert.deepEqual(result.test_coverage, { satisfied: ["REQ-A1000001"], unsatisfied: [] });
  assert.deepEqual(result.test_execution, { satisfied: ["REQ-A1000001"], unsatisfied: [] });
  assert.deepEqual(result.manual_verification, { satisfied: ["REQ-A1000002"], unsatisfied: [] });
  assert.deepEqual(result.qa_coverage, { satisfied: ["CAP-A1000001"], unsatisfied: [] });
  assert.deepEqual(result.issues, []);
});

test("REQ-5A832396 rejects failed, duplicate, stale, and out-of-index execution evidence", () => {
  const value = context();
  const failed: TestExecutionEvidence = {
    ...value.execution,
    results: [{ test_ref: "unit:auto", status: "failed" }],
  };
  assert.ok(assess({ test_execution_evidence: [failed] }).issues.some((issue) => issue.code.endsWith("NOT_PASSED")));
  assert.ok(
    assess({ test_execution_evidence: [value.execution, value.execution] }).issues.some((issue) =>
      issue.code.endsWith("DUPLICATE"),
    ),
  );
  const stale: TestExecutionEvidence = {
    ...value.execution,
    subject: { ...value.execution.subject, head_ref: "previous" as GitObjectId },
  };
  assert.ok(assess({ test_execution_evidence: [stale] }).issues.some((issue) => issue.code.endsWith("SUBJECT_STALE")));
  const unknown: TestExecutionEvidence = {
    ...value.execution,
    results: [{ test_ref: "unit:unknown", status: "passed" }],
  };
  assert.ok(assess({ test_execution_evidence: [unknown] }).issues.some((issue) => issue.code.endsWith("UNKNOWN")));
  const changedAdapter: unknown = `sha256:${"4".repeat(64)}`;
  assert.ok(isFingerprint(changedAdapter));
  assert.ok(
    assess({ current_adapter_fingerprints: { unit: changedAdapter } }).issues.some(
      (issue) => issue.code === "SDD_EVIDENCE_TEST_INDEX_STALE",
    ),
  );
});

test("REQ-CDE94D0B REQ-C11ACC55 distinguishes missing human evidence from negative and contradictory evidence", () => {
  const missing = assess({ qa_evidence: [] });
  assert.ok(missing.issues.every((issue) => issue.disposition === "REVIEW_REQUIRED"));
  assert.deepEqual(missing.manual_verification.unsatisfied, ["REQ-A1000002"]);
  assert.deepEqual(missing.qa_coverage.unsatisfied, ["CAP-A1000001"]);

  const value = context();
  const failed: QaEvidence = {
    ...value.qa,
    decision: "failed",
    manual_requirements: [{ requirement_id: requirement("REQ-A1000002"), decision: "failed" }],
  };
  const contradictory = assess({ qa_evidence: [value.qa, failed] });
  assert.ok(contradictory.issues.some((issue) => issue.code === "SDD_EVIDENCE_MANUAL_CONTRADICTORY"));
  assert.ok(contradictory.issues.some((issue) => issue.code === "SDD_EVIDENCE_QA_CONTRADICTORY"));
  assert.ok(contradictory.issues.every((issue) => issue.disposition === "BLOCKED"));
});

function approvalEvidence(): ApprovalEvidence {
  const input = values();
  return {
    schema_version: "1.0",
    artifact_type: "approval_evidence",
    project_id: input.projectId,
    issuer: "product-review",
    actor: "user:42",
    decision: "approved",
    mode: "spec-code",
    subject: {
      base: { git_ref: input.integrationRef, tree_fingerprint: input.configFingerprint },
      candidate: { source: "manifest", tree_fingerprint: input.scopeFingerprint },
      object_delta: {
        semantic_fingerprint: input.adapterFingerprint,
        structural_fingerprint: input.scopeFingerprint,
        added: [],
        modified: [],
        deleted: [],
      },
      code_targets: [],
      affected_scope: { fingerprint: input.scopeFingerprint, requirements: [], capabilities: [] },
    },
  };
}

function assessApproval(evidence: readonly ApprovalEvidence[]) {
  const input = values();
  return assessApprovalEvidence({
    project_id: input.projectId,
    mode: "spec-code",
    subject: approvalEvidence().subject,
    evidence,
  });
}

function governanceEvidence(): GovernanceEvidence {
  const input = values();
  return {
    schema_version: "1.0",
    artifact_type: "governance_evidence",
    project_id: input.projectId,
    issuer: "governance",
    actor: "user:12",
    decision: "approved",
    subject: {
      config_fingerprint: input.configFingerprint,
      project_scope_fingerprint: input.scopeFingerprint,
      from_adoption_mode: "incremental",
      to_adoption_mode: "complete",
    },
  };
}

function assessGovernance(evidence: readonly GovernanceEvidence[]) {
  const input = values();
  return assessGovernanceEvidence({
    project_id: input.projectId,
    config_fingerprint: input.configFingerprint,
    project_scope_fingerprint: input.scopeFingerprint,
    from_adoption_mode: "incremental",
    to_adoption_mode: "complete",
    evidence,
  });
}

test("REQ-7341DBB7 REQ-AFD65A03 strictly parses bounded ApprovalEvidence", async () => {
  const bytes = await readFile("fixtures/v1/artifacts/evidence/approval-evidence/maximally-representative-valid.json");
  const parsed = parseApprovalEvidence(bytes, limits);
  assert.equal(parsed.mode, "spec-code");
  assert.equal(parsed.decision, "approved");
  assert.throws(
    () => parseApprovalEvidence(bytes, { ...limits, max_artifact_bytes: bytes.byteLength - 1 }),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED",
  );
  const unknown = new TextEncoder().encode(
    JSON.stringify({ ...(JSON.parse(bytes.toString("utf8")) as object), unknown: true }),
  );
  assert.throws(
    () => parseApprovalEvidence(unknown, limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_INVALID",
  );
});

test("REQ-E85A06C3 REQ-220945C2 strictly parses GovernanceEvidence transitions", async () => {
  const bytes = await readFile(
    "fixtures/v1/artifacts/evidence/governance-evidence/maximally-representative-valid.json",
  );
  const parsed = parseGovernanceEvidence(bytes, limits);
  assert.equal(parsed.subject.from_adoption_mode, "complete");
  assert.equal(parsed.subject.to_adoption_mode, "incremental");
  const noOp = new TextEncoder().encode(
    JSON.stringify({
      ...parsed,
      subject: { ...parsed.subject, to_adoption_mode: parsed.subject.from_adoption_mode },
    }),
  );
  assert.throws(
    () => parseGovernanceEvidence(noOp, limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_INVALID",
  );
});

test("REQ-AFD65A03 REQ-E85A06C3 imports only project-scoped ApprovalEvidence and GovernanceEvidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-human-evidence-project-"));
  const outside = await mkdtemp(join(tmpdir(), "sdd-human-evidence-outside-"));
  const approvalBytes = await readFile("fixtures/v1/artifacts/evidence/approval-evidence/minimal-valid.json");
  const governanceBytes = await readFile("fixtures/v1/artifacts/evidence/governance-evidence/minimal-valid.json");
  await writeFile(join(root, "approval.json"), approvalBytes);
  await writeFile(join(root, "governance.json"), governanceBytes);
  await writeFile(join(outside, "approval.json"), approvalBytes);
  const approvalPath: unknown = "approval.json";
  const governancePath: unknown = "governance.json";
  const escapePath: unknown = "escape.json";
  assert.ok(isProjectPath(approvalPath) && isProjectPath(governancePath) && isProjectPath(escapePath));
  assert.equal(
    (await importApprovalEvidenceFile(nodeFileSystem, root, approvalPath, limits)).artifact_type,
    "approval_evidence",
  );
  assert.equal(
    (await importGovernanceEvidenceFile(nodeFileSystem, root, governancePath, limits)).artifact_type,
    "governance_evidence",
  );
  await symlink(join(outside, "approval.json"), join(root, "escape.json"));
  await assert.rejects(
    importApprovalEvidenceFile(nodeFileSystem, root, escapePath, limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_FILE_OUT_OF_SCOPE",
  );
});

test("REQ-7341DBB7 REQ-AFD65A03 REQ-E85A06C3 assesses exact current ApprovalEvidence subjects", () => {
  const current = approvalEvidence();
  assert.deepEqual(assessApproval([current]), { state: "current", issues: [] });
  assert.equal(assessApproval([]).state, "missing");
  assert.equal(assessApproval([{ ...current, mode: "spec" }]).state, "stale");
  assert.equal(
    assessApproval([
      {
        ...current,
        subject: {
          ...current.subject,
          object_delta: { ...current.subject.object_delta, semantic_fingerprint: values().configFingerprint },
        },
      },
    ]).state,
    "stale",
  );
  assert.equal(assessApproval([{ ...current, decision: "rejected" }]).state, "negative");
  assert.equal(assessApproval([current, { ...current, decision: "rejected" }]).state, "contradictory");
  assert.deepEqual(assessApproval([{ ...current, issuer: "repository-self-review" }]), {
    state: "current",
    issues: [],
  });
});

test("REQ-E85A06C3 REQ-220945C2 assesses exact governance transitions and decisions", () => {
  const current = governanceEvidence();
  assert.deepEqual(assessGovernance([current]), { state: "current", issues: [] });
  assert.equal(assessGovernance([]).state, "missing");
  assert.equal(
    assessGovernance([
      {
        ...current,
        subject: { ...current.subject, project_scope_fingerprint: values().adapterFingerprint },
      },
    ]).state,
    "stale",
  );
  assert.equal(assessGovernance([{ ...current, decision: "rejected" }]).state, "negative");
  assert.equal(assessGovernance([current, { ...current, decision: "rejected" }]).state, "contradictory");
});
