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
  assessVerificationEvidence,
  EvidenceInputError,
  importQaEvidenceFile,
  parseQaEvidence,
  parseTestExecutionEvidence,
} from "../src/verification/evidence.ts";
import type { EvidenceInputLimits, QaEvidence, TestExecutionEvidence } from "../src/verification/evidence.ts";

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
    allowed_issuers: new Set(["ci", "qa"]),
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
