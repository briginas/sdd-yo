# Workflow artifacts and schemas

## Status

This document defines the version 1 logical contracts. Versioned JSON Schema
files under `contracts/v1/schemas/` are the single typed source for external
JSON artifacts. The maintained schema generator derives TypeScript types from
those schemas and checks that generated output remains synchronized with the
checked-in source. A later change may replace the authoring representation only
if the generated schemas remain compatible and this source-of-truth rule is
updated in the same change.

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

The contract parse, schema, project, and subject cases are enumerated by the
[`artifact fixture matrix`](../../fixtures/v1/artifacts/cases.json).

CandidateTreeManifest is materialized only as the fixed `candidate-tree.json`
member of a proposal bundle.

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
values by SDD Project. It preserves exact artifact bytes, including complete
proposal bundles; an external manifest or content-addressed key may describe
that retained set, but it is not hidden CLI workflow state and does not replace
the versioned artifact subjects.

Before a command, the invoker materializes the required immutable values under
an ignored staging root inside the selected project. The staging root is
excluded from every assessed ref and is established before subject-bound
evidence is produced; retaining an artifact must not create a commit, branch,
tag, or other Git subject. The CLI receives only explicit project-relative
paths and applies its existing real-path, regular-file, size, and symlink
checks. Primary output is written to the same staging boundary or captured from
stdout, then exported byte-for-byte to durable storage before optional staging
cleanup.

An authored candidate directory is transient input to `proposal materialize`
only in `spec-code` and `spec` modes. A Skill-owned source candidate is created
outside the selected repository through the host temporary-directory boundary;
it is removed after successful bundle publication and preserved with its exact
path on failure. A caller-owned candidate remains caller-owned and is never
removed by the Skill. The command converts either source into the fixed
`candidate-tree.json` bundle member; downstream commands never accept a
candidate directory, a raw CandidateTreeManifest, or an archive. The embedded
member contains only configured specification-tree files and never embeds a
second `.sdd/config.yaml`, so bundle retention cannot create a nested project.

For a confirmed authored `spec-code` or `spec` candidate, `proposal
materialize` creates the handoff without conversational JSON transcription. It
atomically publishes one new ignored directory with exactly these versioned
artifact members:

```text
<bundle>/candidate-tree.json
<bundle>/proposal-package.json
```

The first member is the deterministic CandidateTreeManifest derived from the
complete authored candidate. The second is the exact ProposalPackage validated
from that manifest. The package therefore records `candidate.source` as
`manifest`, and both files retain the same candidate-tree fingerprint. The
directory is a publication boundary rather than a third JSON artifact: its
fixed member names and all-or-nothing creation are part of the CLI contract.
Downstream commands receive the bundle path and derive its fixed members.

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

CandidateTreeManifest is not a standalone workflow artifact or CLI input. In
`spec-code` and `spec` modes, `proposal materialize` derives it from the
complete authored candidate and atomically publishes it only as the fixed
`candidate-tree.json` member of a new bundle. The manifest contains only
configured specification-tree files; it does not embed another
`.sdd/config.yaml`. `code` bundles omit the member because their candidate is
the resolved base.

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
    "source": "manifest",
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

For specification-changing modes, ProposalPackage records candidate source
`manifest` because its candidate is the bundle's embedded
CandidateTreeManifest. No directory, archive, or standalone manifest source
is accepted by a command. Equivalent normalized candidate
trees produce identical tree fingerprints, object deltas, code targets, and
affected scope.

The optimized `code` route uses candidate source `base`: the CLI derives the
unchanged candidate directly from the once-resolved base, retains only the
ProposalPackage, and binds each selected active Requirement to its current
semantic and structural fingerprints. Source `base` is invalid for an authored
specification-changing candidate.

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
    "base": {"git_ref": "4f88...", "tree_fingerprint": "sha256:..."},
    "candidate": {"source": "manifest", "tree_fingerprint": "sha256:..."},
    "object_delta": {
      "semantic_fingerprint": "sha256:...",
      "structural_fingerprint": "sha256:...",
      "added": ["REQ-7F3A2C91"],
      "modified": [],
      "deleted": []
    },
    "code_targets": [],
    "affected_scope": {
      "fingerprint": "sha256:...",
      "requirements": ["REQ-7F3A2C91"],
      "capabilities": ["CAP-CB22A5A3"]
    }
  },
  "reason": "optional human-readable note"
}
```

The subject retains the exact base, candidate, object delta, code targets, and
affected scope derived from the displayed ProposalPackage. The CLI validates
schema, issuer syntax, decision, mode, and that complete subject. Issuer
text is untrusted provenance. Authentication, signature verification, actor
authorization, and organizational policy remain external. Negative and
contradictory decisions prevent `PASS`.

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

Evidence assessment accepts only valid issuer syntax and exact current
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

`semantic-review materialize` constructs this existing schema from an exact
Change, retained proposal bundle, current refs, fixed human-review analyzer,
and zero or more explicit current Findings. The command publishes the manifest
to a new safe ignored path and returns a separate response-only review subject;
the subject is not another retained artifact schema.

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

`semantic-review record` constructs these bytes only after recomputing the
same current review subject and matching the retained manifest. The recorder
derives `candidate_input_fingerprint` and canonical sorted `finding_ids`, and
records explicit issuer, actor, and constant `reviewed` decision without an
ambient timestamp. The existing version 1 artifact schema is unchanged.

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
