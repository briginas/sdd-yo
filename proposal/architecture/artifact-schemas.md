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
- `project_id` must match the selected [SDD Project](../spec/concepts/sdd-project.md).
- timestamps are RFC 3339 UTC values and are informational unless a configured
  issuer policy uses them;
- fingerprints are lowercase SHA-256 hex strings prefixed with `sha256:`;
- Git object IDs are opaque non-empty strings;
- object IDs use their canonical uppercase spelling;
- project paths use `/`, are relative, and contain no `.` or `..` segment;
- unknown fields are rejected in signed or decision-bearing artifacts and may
  be retained in explicitly extensible diagnostic objects.

Artifacts are immutable values. A correction creates a new artifact.

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
  "diagnostics": [],
  "semantic_candidates": []
}
```

A package is the deterministic output of Proposal Gate. Candidate content may
live in a directory, archive, or virtual stdin manifest, but the normalized
candidate tree and resulting package are identical for identical bytes.

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
fingerprint.

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
