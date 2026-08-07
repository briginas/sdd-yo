import assert from "node:assert/strict";
import test from "node:test";

import { isFingerprint, isGitObjectId, isObjectId, isProjectId, isProjectPath } from "../src/contracts/identifiers.ts";
import type { Fingerprint, GitObjectId, ObjectId, ProjectId } from "../src/contracts/identifiers.ts";
import { validateSpecificationGraph } from "../src/graph/validate-graph.ts";
import type { ValidatedSpecificationGraph } from "../src/graph/validate-graph.ts";
import { parseSpecificationDocument } from "../src/markdown/parse-markdown.ts";
import { fingerprintTestInput } from "../src/tests/test-index.ts";
import type { TestIndex } from "../src/tests/test-index.ts";
import type { QaEvidence, TestExecutionEvidence } from "../src/verification/evidence.ts";
import { deriveFindingId } from "../src/verification/findings.ts";
import type { Finding, FindingResolution, ParsedSemanticAnalysisInputManifest } from "../src/verification/findings.ts";
import { fingerprintSemanticAnalysisInputManifest } from "../src/verification/semantic-review.ts";
import { buildVerificationReport } from "../src/verification/verification-report.ts";

const indexSource = `---
sdd:
  type: index
---
# Verification

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Verification](capability.md)

## Concepts <!-- sdd:concepts -->
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Verification

## Purpose <!-- sdd:purpose -->

Verify one change.

<a id="req-a1000001"></a>

## REQ-A1000001 — Automated outcome

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

### Statement <!-- sdd:statement -->

The system shall produce the current automated outcome.

### Acceptance criteria <!-- sdd:acceptance -->

- The automated outcome passes.

<a id="req-a1000002"></a>

## REQ-A1000002 — Manual outcome

\`\`\`sdd
kind: constraint
verification: manual
\`\`\`

### Relations <!-- sdd:relations -->

- depends-on: [REQ-A1000001 — Automated outcome](capability.md#req-a1000001)

### Statement <!-- sdd:statement -->

The system shall expose the manual outcome.

### Acceptance criteria <!-- sdd:acceptance -->

- The manual outcome is reviewed.
`;

function graph(capability: string): ValidatedSpecificationGraph {
  const documents = [
    ["README.md", indexSource],
    ["capability.md", capability],
  ].map(([path, source]) => {
    assert.ok(isProjectPath(path));
    const parsed = parseSpecificationDocument(path, new TextEncoder().encode(source));
    assert.ok(parsed.ok, parsed.ok ? undefined : parsed.diagnostics[0]?.code);
    return parsed.value;
  });
  const entrypoint: unknown = "README.md";
  assert.ok(isProjectPath(entrypoint));
  const result = validateSpecificationGraph(documents, entrypoint);
  assert.ok(result.ok, result.ok ? undefined : result.diagnostics[0]?.code);
  return result.value;
}

function opaque<T>(value: unknown, guard: (candidate: unknown) => candidate is T): T {
  assert.ok(guard(value));
  return value;
}

function objectId(value: string): ObjectId {
  return opaque(value, isObjectId);
}

function fixture() {
  const projectId = opaque<ProjectId>("SDD-A1000001", isProjectId);
  const headRef = opaque<GitObjectId>("head", isGitObjectId);
  const integrationRef = opaque<GitObjectId>("integration", isGitObjectId);
  const configFingerprint = opaque<Fingerprint>(`sha256:${"1".repeat(64)}`, isFingerprint);
  const adapterFingerprint = opaque<Fingerprint>(`sha256:${"2".repeat(64)}`, isFingerprint);
  const baseGraph = graph(capabilitySource.replace("current automated outcome", "previous automated outcome"));
  const headGraph = graph(capabilitySource);
  const index: TestIndex = {
    schema_version: "1.0",
    artifact_type: "test_index",
    project_id: projectId,
    subject: {
      head_ref: headRef,
      config_fingerprint: configFingerprint,
      adapter_fingerprints: { unit: adapterFingerprint },
    },
    tests: [
      {
        test_ref: "unit:auto",
        adapter_id: "unit",
        local_id: "auto",
        full_name: "REQ-A1000001 automated outcome",
        requirement_ids: [objectId("REQ-A1000001") as TestIndex["tests"][number]["requirement_ids"][number]],
      },
    ],
  };
  const execution: TestExecutionEvidence = {
    schema_version: "1.0",
    artifact_type: "test_execution_evidence",
    project_id: projectId,
    issuer: "ci",
    subject: {
      head_ref: headRef,
      test_index_fingerprint: fingerprintTestInput(index),
      config_fingerprint: configFingerprint,
    },
    results: [{ test_ref: "unit:auto", status: "passed" }],
  };
  const qa = (decision: "passed" | "failed" = "passed"): QaEvidence => ({
    schema_version: "1.0",
    artifact_type: "qa_evidence",
    project_id: projectId,
    issuer: "qa",
    actor: "user:1",
    decision,
    subject: {
      head_ref: headRef,
      integration_ref: integrationRef,
      affected_scope_fingerprint: buildVerificationReport({
        project_id: projectId,
        head_ref: headRef,
        integration_ref: integrationRef,
        config_fingerprint: configFingerprint,
        current_adapter_fingerprints: { unit: adapterFingerprint },
        base_graph: baseGraph,
        head_graph: headGraph,
        test_index: index,
        test_execution_evidence: [execution],
        qa_evidence: [],
        semantic_review: semanticReview(),
      }).affected_scope_fingerprint,
    },
    capability_ids: [objectId("CAP-A1000001") as QaEvidence["capability_ids"][number]],
    manual_requirements: [
      {
        requirement_id: objectId("REQ-A1000002") as QaEvidence["manual_requirements"][number]["requirement_id"],
        decision,
      },
    ],
  });
  return {
    projectId,
    headRef,
    integrationRef,
    configFingerprint,
    adapterFingerprint,
    baseGraph,
    headGraph,
    index,
    execution,
    qa,
  };
}

function semanticReview(findings: readonly Finding[] = [], resolutions: readonly FindingResolution[] = []) {
  const payload = {
    schema_version: "1.0" as const,
    artifact_type: "semantic_analysis_input_manifest" as const,
    project_id: opaque<ProjectId>("SDD-A1000001", isProjectId),
    analyzer: { name: "semantic-review", version: "1.0" },
    changed_objects: [objectId("REQ-A1000001")],
    related_objects: [] as ObjectId[],
    normative_sections: [
      { object_id: objectId("REQ-A1000001"), section: "statement" as const, content: "Current outcome." },
    ],
    candidate_reasons: [],
  };
  const manifest: ParsedSemanticAnalysisInputManifest = {
    ...payload,
    input_fingerprint: fingerprintSemanticAnalysisInputManifest(payload),
  };
  return { manifest, findings, resolutions, human_reviews: [], model_analysis_performed: true };
}

function finding(): Finding {
  const manifest = semanticReview().manifest;
  const payload = {
    schema_version: "1.0" as const,
    artifact_type: "finding" as const,
    project_id: manifest.project_id,
    analyzer: manifest.analyzer,
    kind: "semantic_conflict" as const,
    severity: "blocking" as const,
    input_fingerprint: manifest.input_fingerprint,
    objects: [objectId("REQ-A1000001")],
    sections: [{ object_id: objectId("REQ-A1000001"), section: "statement" as const }],
    summary: "The outcome may conflict.",
    confidence: 0.8,
    waiver_eligible: false,
  };
  return { ...payload, finding_id: deriveFindingId(payload) };
}

function build(overrides: Record<string, unknown> = {}) {
  const value = fixture();
  return buildVerificationReport({
    project_id: value.projectId,
    head_ref: value.headRef,
    integration_ref: value.integrationRef,
    config_fingerprint: value.configFingerprint,
    current_adapter_fingerprints: { unit: value.adapterFingerprint },
    base_graph: value.baseGraph,
    head_graph: value.headGraph,
    test_index: value.index,
    test_execution_evidence: [value.execution],
    qa_evidence: [value.qa()],
    semantic_review: semanticReview(),
    ...overrides,
  });
}

test("REQ-E451458E REQ-5A832396 REQ-CDE94D0B REQ-C11ACC55 emits a deterministic PASS report", () => {
  const first = build();
  const second = build();
  assert.deepEqual(first, second);
  assert.equal(first.status, "PASS");
  assert.deepEqual(first.affected_requirements, ["REQ-A1000001", "REQ-A1000002"]);
  assert.deepEqual(first.test_coverage, { satisfied: ["REQ-A1000001"], unsatisfied: [] });
  assert.deepEqual(first.test_execution, { satisfied: ["REQ-A1000001"], unsatisfied: [] });
  assert.deepEqual(first.manual_verification, { satisfied: ["REQ-A1000002"], unsatisfied: [] });
  assert.deepEqual(first.qa_coverage, { satisfied: ["CAP-A1000001"], unsatisfied: [] });
  assert.deepEqual(first.diagnostics, []);
});

test("REQ-CDE94D0B REQ-C11ACC55 REQ-2AF962EB gives blockers precedence over pending human review", () => {
  const blocked = build({ test_execution_evidence: [], qa_evidence: [], semantic_review: undefined });
  assert.equal(blocked.status, "BLOCKED");
  assert.ok(blocked.diagnostics.some((item) => item.code === "SDD_EVIDENCE_TEST_RESULT_MISSING"));
  assert.ok(blocked.diagnostics.some((item) => item.code === "SDD_EVIDENCE_QA_MISSING"));
  assert.ok(blocked.diagnostics.some((item) => item.code === "SDD_SEMANTIC_REVIEW_REQUIRED"));
  assert.deepEqual(
    blocked.diagnostics,
    [...blocked.diagnostics].toSorted((left, right) =>
      `${left.code}\0${left.object_id ?? ""}\0${JSON.stringify(left.details ?? {})}` <
      `${right.code}\0${right.object_id ?? ""}\0${JSON.stringify(right.details ?? {})}`
        ? -1
        : 1,
    ),
  );
});

test("REQ-CDE94D0B REQ-C11ACC55 REQ-2AF962EB distinguishes missing human review from negative evidence", () => {
  assert.equal(build({ qa_evidence: [] }).status, "REVIEW_REQUIRED");
  assert.equal(build({ qa_evidence: [fixture().qa("failed")] }).status, "BLOCKED");
  assert.equal(build({ semantic_review: undefined }).status, "REVIEW_REQUIRED");
  assert.equal(build({ test_index: undefined }).status, "BLOCKED");
});

test("REQ-20AAA622 REQ-FB66E5D6 REQ-2AF962EB composes finding and semantic-review decisions", () => {
  const current = finding();
  assert.equal(build({ semantic_review: semanticReview([current]) }).status, "REVIEW_REQUIRED");
  const dismissed: FindingResolution = {
    schema_version: "1.0",
    artifact_type: "finding_resolution",
    project_id: current.project_id,
    issuer: "review",
    actor: "user:1",
    finding_id: current.finding_id,
    input_fingerprint: current.input_fingerprint,
    decision: "dismissed",
    reason: "False conflict.",
  };
  assert.equal(build({ semantic_review: semanticReview([current], [dismissed]) }).status, "PASS");
  assert.equal(
    build({ semantic_review: semanticReview([current], [{ ...dismissed, decision: "waived" }]) }).status,
    "BLOCKED",
  );
  assert.equal(
    build({ semantic_review: { ...semanticReview(), model_analysis_performed: false } }).status,
    "REVIEW_REQUIRED",
  );
});
