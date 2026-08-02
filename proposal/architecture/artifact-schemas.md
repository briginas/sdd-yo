# Workflow artifacts and schemas

## Status

This document defines the version 1 logical contracts. During Stage 0,
versioned JSON Schema files under `contracts/v1/schemas/` are the single typed
source for external JSON artifacts. Milestone 1 shall generate TypeScript
types from those schemas and shall verify that published schemas are
byte-for-byte identical to the checked-in source. A later change may replace
the authoring representation only if the generated schemas remain compatible
and this source-of-truth rule is updated in the same change.

The schemas use JSON Schema Draft 2020-12. Shared lexical and envelope values
live in `common.schema.json`; artifact schemas reference them rather than
copying their definitions. Examples omit optional fields but are otherwise
representative.

The complete version 1 artifact schema set is:

| Artifact | Materialized schema |
| --- | --- |
| ChangeDescriptor | [`change-descriptor.schema.json`](../../contracts/v1/schemas/change-descriptor.schema.json) |
| CandidateTreeManifest | [`candidate-tree-manifest.schema.json`](../../contracts/v1/schemas/candidate-tree-manifest.schema.json) |
| ProposalPackage | [`proposal-package.schema.json`](../../contracts/v1/schemas/proposal-package.schema.json) |
| SpecPatch | [`spec-patch.schema.json`](../../contracts/v1/schemas/spec-patch.schema.json) |
| ApprovalEvidence | [`approval-evidence.schema.json`](../../contracts/v1/schemas/approval-evidence.schema.json) |
| TestIndex | [`test-index.schema.json`](../../contracts/v1/schemas/test-index.schema.json) |
| TestExecutionEvidence | [`test-execution-evidence.schema.json`](../../contracts/v1/schemas/test-execution-evidence.schema.json) |
| QAEvidence | [`qa-evidence.schema.json`](../../contracts/v1/schemas/qa-evidence.schema.json) |
| GovernanceEvidence | [`governance-evidence.schema.json`](../../contracts/v1/schemas/governance-evidence.schema.json) |
| Finding | [`finding.schema.json`](../../contracts/v1/schemas/finding.schema.json) |
| FindingResolution | [`finding-resolution.schema.json`](../../contracts/v1/schemas/finding-resolution.schema.json) |
| HumanSemanticReviewEvidence | [`human-semantic-review-evidence.schema.json`](../../contracts/v1/schemas/human-semantic-review-evidence.schema.json) |
| SemanticAnalysisInputManifest | [`semantic-analysis-input-manifest.schema.json`](../../contracts/v1/schemas/semantic-analysis-input-manifest.schema.json) |
| ConflictReport | [`conflict-report.schema.json`](../../contracts/v1/schemas/conflict-report.schema.json) |
| VerificationReport | [`verification-report.schema.json`](../../contracts/v1/schemas/verification-report.schema.json) |
| MergeReport | [`merge-report.schema.json`](../../contracts/v1/schemas/merge-report.schema.json) |

The Stage 0 parse, schema, project, and subject cases are enumerated by the
[`artifact fixture matrix`](../../fixtures/v1/artifacts/cases.json).

## Common envelope

Every external artifact uses this envelope:

```json
{
  "schema_version": "1.0",
  "artifact_type": "approval_evidence",
  "project_id": "SDD-17EF8B29",
  "created_at": "2026-07-30T12:00:00Z",
  "producer": {
    "name": "example-review-service",
    "version": "4.2.0"
  }
}
```

Rules:

- `schema_version`, `artifact_type`, and `project_id` are required;
- `created_at` and `producer` are optional provenance metadata and do not
  change a decision subject;
- `schema_version` is `<major>.<minor>`; an unknown major is rejected.
- `artifact_type` must match the invoked command and schema.
- `project_id` must match the selected [SDD Project](../../spec/concepts/sdd-project.md).
- timestamps are RFC 3339 UTC values and are informational unless a configured
  issuer policy uses them;
- fingerprints are lowercase SHA-256 hex strings prefixed with `sha256:`;
- Git object IDs are opaque non-empty strings;
- object IDs use their canonical uppercase spelling;
- project paths use `/`, are relative, and contain no `.` or `..` segment;
- unknown fields are rejected in signed or decision-bearing artifacts and may
  be retained in explicitly extensible diagnostic objects.

Artifacts are immutable values. A correction creates a new artifact.

## Retention topology

The CLI keeps workflow state external as required by
[`REQ-A3C3B779`](../../spec/capabilities/proposal-modes-and-workflow-gates.md#req-a3c3b779).
Durable retention and project-scoped CLI access are separate layers:

```text
project-namespaced durable store
  |
  | materialize exact immutable bytes
  v
ignored project-local staging root
  |
  | explicit project-relative CLI paths
  v
deterministic report
  |
  | export exact bytes before cleanup
  v
project-namespaced durable store
```

The durable store may be a local archive, CI artifact service, or issuer-owned
system. It is outside the Git refs being assessed and namespaces retained
values by SDD Project. It preserves the exact artifact bytes and any candidate
bytes needed to reproduce a command; an external manifest or content-addressed
key may describe that retained set, but it is not hidden CLI workflow state and
does not replace the versioned artifact subjects.

Before a command, the invoker materializes the required immutable values under
an ignored staging root inside the selected project. The staging root is
excluded from every assessed ref and is established before subject-bound
evidence is produced; retaining an artifact must not create a commit, branch,
tag, or other Git subject. The CLI receives only explicit project-relative
paths and applies its existing real-path, regular-file, size, and symlink
checks. Primary output is written to the same staging boundary or captured from
stdout, then exported byte-for-byte to durable storage before optional staging
cleanup.

Candidate bytes follow the same lifecycle: the retained source is immutable,
and the exact directory or CandidateTreeManifest accepted by the current
command is materialized inside the project only for the run. A retained
directory containing another `.sdd/config.yaml` must not remain discoverable
as a nested project. The candidate-snapshot command writes a
CandidateTreeManifest directly under the staging boundary from explicit Git
refs, so later commands consume that file without directory extraction. This
workflow does not add archive ingestion or weaken project discovery.

Reproduction resolves the declared mutable refs again and accepts each
retained value only when its exact subject still applies. Ref movement
invalidates only artifacts that bind the moved subject: for example,
branch-head movement invalidates test and QA evidence, while an approval bound
to an unchanged base and object delta remains applicable across independent
integration additions. The invoker produces new evidence for a changed subject
instead of moving a ref backward, rewriting an artifact, or committing the old
artifact onto the ref it describes.

## Change descriptor

A Change is transient input, not a canonical specification object:

```json
{
  "schema_version": "1.0",
  "artifact_type": "change_descriptor",
  "project_id": "SDD-17EF8B29",
  "mode": "spec-code",
  "integration_ref": "refs/remotes/origin/main",
  "proposal_ref": "refs/heads/add-export",
  "approved_delta": {
    "semantic": "sha256:...",
    "structural": "sha256:..."
  },
  "code_targets": []
}
```

`code_targets` is required and non-empty only in `code` mode. Each entry names
an active Requirement and its approved semantic and structural fingerprints.
The descriptor does not grant approval; it only states what other evidence is
expected to approve.

## CandidateTreeManifest

A virtual candidate tree contains its base tree fingerprint and a
deterministically path-sorted set of UTF-8 files. Every file entry binds a
project-relative path, its exact SHA-256 content hash, and its UTF-8 content.
Duplicate paths, unsafe paths, unknown fields, and a content/hash mismatch are
invalid; hash revalidation is a runtime check over schema-valid input.

`sdd candidate snapshot` produces this artifact from one explicitly resolved
base ref and one explicitly resolved candidate ref. It loads the selected SDD
Project configuration and specification tree from both refs, rejects a
missing, mismatched, or invalid project snapshot, omits provenance fields so
identical inputs produce identical bytes, and creates a new manifest without
replacing an existing retained value. The output path must be ignored by Git.
The manifest contains only configured specification-tree files; it does not
embed another `.sdd/config.yaml`.

## ProposalPackage

```json
{
  "schema_version": "1.0",
  "artifact_type": "proposal_package",
  "project_id": "SDD-17EF8B29",
  "mode": "spec-code",
  "base": {
    "git_ref": "4f88...",
    "tree_fingerprint": "sha256:..."
  },
  "candidate": {
    "source": "directory",
    "tree_fingerprint": "sha256:..."
  },
  "object_delta": {
    "semantic_fingerprint": "sha256:...",
    "structural_fingerprint": "sha256:...",
    "added": ["REQ-7F3A2C91"],
    "modified": ["CON-88F1C731"],
    "deleted": []
  },
  "code_targets": [],
  "affected_scope": {
    "fingerprint": "sha256:...",
    "requirements": ["REQ-7F3A2C91"],
    "capabilities": ["CAP-CB22A5A3"]
  },
  "diagnostics": [],
  "semantic_candidates": []
}
```

A package is the deterministic mechanical output of proposal validation.
`code_targets` is non-empty only in `code` mode and binds every active target
Requirement to its semantic and structural fingerprints; it is empty in the
other modes. `affected_scope` binds the exact affected Requirement and
Capability sets to their canonical fingerprint. The Proposal Gate populates
`semantic_candidates` deterministically from the base and candidate graphs.
Those candidates are review inputs: they do not block an otherwise valid
package, declare Findings, or grant approval.

Candidate content accepted by the version 1 CLI lives in an SDD Project
directory or CandidateTreeManifest. The schema reserves `archive` as a source
value, but version 1 commands do not ingest archives. Equivalent normalized
candidate trees produce identical tree fingerprints, object deltas, code
targets, and affected scope; `candidate.source` still records the selected
input form and therefore may differ between a directory and a manifest.

## SpecPatch

```json
{
  "schema_version": "1.0",
  "artifact_type": "spec_patch",
  "project_id": "SDD-17EF8B29",
  "base_tree_fingerprint": "sha256:...",
  "result_tree_fingerprint": "sha256:...",
  "operations": [
    {
      "operation": "replace",
      "path": "spec/capabilities/export.md",
      "before_sha256": "sha256:...",
      "after_sha256": "sha256:...",
      "content_utf8": "---\nsdd:\n..."
    }
  ]
}
```

Supported operations are `create`, `replace`, and `delete`. A create requires
the path not to exist; replace and delete require an exact `before_sha256`.
Every operation is validated before any write. The final tree must equal
`result_tree_fingerprint`.

## ApprovalEvidence

```json
{
  "schema_version": "1.0",
  "artifact_type": "approval_evidence",
  "project_id": "SDD-17EF8B29",
  "issuer": "product-review",
  "actor": "user:42",
  "decision": "approved",
  "mode": "spec-code",
  "subject": {
    "base_ref": "4f88...",
    "semantic_delta_fingerprint": "sha256:...",
    "structural_delta_fingerprint": "sha256:..."
  },
  "reason": "optional human-readable note"
}
```

The CLI validates schema, configured issuer name, decision, mode, and subject.
Issuer authentication, signature verification, actor authorization, and
organizational policy remain external. Negative and contradictory decisions
prevent `PASS`.

## TestIndex

`TestIndex` is the normalized discovery snapshot described in
[Test adapters](test-adapters.md):

```json
{
  "schema_version": "1.0",
  "artifact_type": "test_index",
  "project_id": "SDD-17EF8B29",
  "subject": {
    "head_ref": "9aa1...",
    "config_fingerprint": "sha256:...",
    "adapter_fingerprints": {
      "unit": "sha256:..."
    }
  },
  "tests": [
    {
      "test_ref": "unit:test-818",
      "adapter_id": "unit",
      "local_id": "test-818",
      "full_name": "Export REQ-7F3A2C91 writes UTF-8",
      "requirement_ids": ["REQ-7F3A2C91"],
      "source": {"path": "test/export.test.ts", "line": 18}
    }
  ]
}
```

The final `requirement_ids` are computed by the core from normalized suite and
test names, not trusted from adapter claims.

## TestExecutionEvidence

```json
{
  "schema_version": "1.0",
  "artifact_type": "test_execution_evidence",
  "project_id": "SDD-17EF8B29",
  "issuer": "ci",
  "subject": {
    "head_ref": "9aa1...",
    "test_index_fingerprint": "sha256:...",
    "config_fingerprint": "sha256:..."
  },
  "results": [
    {
      "test_ref": "unit:test-818",
      "status": "passed",
      "duration_ms": 31
    }
  ]
}
```

Allowed statuses are `passed`, `failed`, `skipped`, `todo`, `disabled`,
`xfailed`, and `error`; only `passed` satisfies required execution.

## QAEvidence

```json
{
  "schema_version": "1.0",
  "artifact_type": "qa_evidence",
  "project_id": "SDD-17EF8B29",
  "issuer": "qa",
  "actor": "user:84",
  "decision": "passed",
  "subject": {
    "head_ref": "9aa1...",
    "integration_ref": "4f88...",
    "affected_scope_fingerprint": "sha256:..."
  },
  "capability_ids": ["CAP-15DBC157"],
  "manual_requirements": [
    {"requirement_id": "REQ-CDE94D0B", "decision": "passed"}
  ],
  "notes": "optional"
}
```

Capability coverage and manual Requirement decisions are evaluated
independently. A general `passed` value cannot imply an omitted manual
Requirement.

### Execution and QA evidence validation boundary

The version 1 core strictly parses TestExecutionEvidence and QAEvidence under
explicit artifact byte, array-item, string-byte, and nesting-depth limits.
File imports resolve real paths, accept only regular files inside the selected
project, and reject symlink escape.

Evidence assessment accepts only configured issuer names and exact current
subjects. Test execution binds project, head, configuration, and the canonical
TestIndex fingerprint. QA binds project, head, integration ref, and the
affected-scope fingerprint. The TestIndex itself must match the project, head,
configuration, current adapter fingerprints, and active Requirement context.

For each affected automated Requirement, coverage requires at least one mapped
test and execution requires exactly one current `passed` result for every
mapped test. Missing, duplicate, non-passing, or out-of-index results are
blocking. Manual Requirement decisions and Capability QA are independent:
missing current human evidence is review-required, while failed or
contradictory current evidence is blocking. The core returns deterministic
satisfied/unsatisfied partitions and sorted issue classifications; Milestone 6
owns readiness-status composition and VerificationReport/MergeReport emission.

## GovernanceEvidence

Governance evidence records an authorized human decision to move a project
between `incremental` and `complete` adoption. Its subject binds the
configuration fingerprint, declared project-scope fingerprint, and exact
before and after adoption modes. A no-op transition is invalid.

## SemanticAnalysisInputManifest

The semantic analysis manifest names the analyzer and binds the complete
selected input by fingerprint. It separately lists changed objects, related
objects, included normative section content, and the deterministic candidate
reasons that caused each object set to be selected. The manifest is the only
context contract for model-assisted or equivalent human semantic review.

## Finding and FindingResolution

```json
{
  "schema_version": "1.0",
  "artifact_type": "finding",
  "project_id": "SDD-17EF8B29",
  "finding_id": "FND-5D5B4366CBB7",
  "analyzer": {"name": "semantic-review", "version": "1.0"},
  "kind": "semantic_conflict",
  "severity": "blocking",
  "input_fingerprint": "sha256:...",
  "objects": ["REQ-AAAA0001", "REQ-BBBB0002"],
  "sections": [
    {"object_id": "REQ-AAAA0001", "section": "statement"}
  ],
  "summary": "The requirements prescribe incompatible outcomes.",
  "confidence": 0.82,
  "waiver_eligible": false
}
```

```json
{
  "schema_version": "1.0",
  "artifact_type": "finding_resolution",
  "project_id": "SDD-17EF8B29",
  "issuer": "architecture-review",
  "actor": "user:23",
  "finding_id": "FND-5D5B4366CBB7",
  "input_fingerprint": "sha256:...",
  "decision": "dismissed",
  "reason": "The outcomes apply to disjoint declared states."
}
```

Decisions are `dismissed`, `waived`, and `confirmed`. `waived` is rejected
unless the Finding is explicitly eligible and is never valid for
`semantic_conflict`.

## HumanSemanticReviewEvidence

When model analysis is unavailable, a human may review the same deterministic
candidate set:

```json
{
  "schema_version": "1.0",
  "artifact_type": "human_semantic_review_evidence",
  "project_id": "SDD-17EF8B29",
  "issuer": "semantic-review",
  "actor": "user:23",
  "decision": "reviewed",
  "candidate_input_fingerprint": "sha256:...",
  "finding_ids": []
}
```

An empty `finding_ids` list records a performed review, not proof that no
semantic problem exists.

## ConflictReport and MergeReport

A ConflictReport binds integration ref, branch head, merge base, configuration,
mechanical conflicts, deterministic semantic candidates, and their combined
fingerprint. Approval-bound preparation also includes the canonical
ApprovalEvidence set in that input fingerprint without embedding authority or
signature claims into the report.

A VerificationReport binds the same selected project to exact head,
integration, configuration, and affected-scope fingerprints. It reports
affected Requirement and Capability IDs, satisfied and unsatisfied test,
manual, and QA checks, Finding states, diagnostics, and one gate status.
The status composition gives any definite blocker precedence over pending
human decisions; absent blockers, missing current human decisions yield
`REVIEW_REQUIRED`, otherwise the result is `PASS`.

A MergeReport contains:

- exact integration ref, branch head, and merge base;
- project and configuration fingerprints;
- mode and approved object deltas or code targets;
- affected Requirements and Capabilities;
- test traceability and execution summaries;
- QA and manual verification coverage;
- open, resolved, stale, and contradictory findings/evidence;
- adoption status and governed scope;
- stable diagnostics;
- one status: `PASS`, `REVIEW_REQUIRED`, or `BLOCKED`.

The test and QA summary status is `PASS`, `REVIEW_REQUIRED`, or `BLOCKED` when
the recomputed affected scope is non-empty. When both the affected Requirement
and Capability sets are empty, both summaries instead use `NOT_APPLICABLE`
with zero satisfied and zero unsatisfied objects. `NOT_APPLICABLE` is a nested
summary state only: it does not extend the Merge Gate's three top-level
readiness statuses or override blocker-first status composition.

The report records its complete input manifest so the result can be reproduced.
It never embeds secrets, hidden model reasoning, or an assertion of semantic
completeness.

## Diagnostic contract

Every diagnostic has:

```json
{
  "code": "SDD_GRAPH_UNKNOWN_REQUIREMENT",
  "severity": "error",
  "message": "Relation references unknown Requirement REQ-12345678.",
  "location": {
    "path": "spec/capabilities/example.md",
    "line": 42,
    "column": 15
  },
  "object_id": "REQ-ABCDEF12",
  "details": {}
}
```

Codes and severity are stable within a schema major. Messages are explanatory
and may improve without being an automation contract.
