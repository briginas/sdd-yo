# Fingerprints, Git comparison, and exact patches

## Canonicalization

The parser converts Markdown to an AST, resolves graph links to stable IDs, and
then emits schema-versioned canonical JSON.

Normalization includes:

- UTF-8 decoding;
- Unicode normalization;
- normalized line endings;
- stable object and key ordering;
- sorted set-like relations;
- preserved order for acceptance criteria and constraints;
- target IDs instead of relative link paths.

SHA-256 is computed over the exact canonical JSON bytes. A fingerprint string
includes an algorithm prefix:

```text
sha256:<lowercase-hex-digest>
```

### Specification-tree fingerprint version 1 byte contract

Proposal inputs bind the complete configured specification tree, not only the
Markdown documents that contribute graph objects. The tree contains every
regular UTF-8 file at or below `spec.root`; paths are project-relative,
portable, unique, and sorted by Unicode code point. Directories do not produce
entries. Symbolic links and other non-regular entries are invalid.

Each file is hashed as its exact bytes, without newline or Unicode
normalization. The tree fingerprint hashes one compact UTF-8 JSON value with
this exact key order and no trailing newline:

```json
{
  "canonicalization_version": "1",
  "files": [
    { "path": "spec/README.md", "sha256": "sha256:..." },
    { "path": "spec/capabilities/export.md", "sha256": "sha256:..." }
  ]
}
```

The `files` array is sorted by `path`; every entry uses key order `path`, then
`sha256`. CandidateTreeManifest content hashes and the resulting tree
fingerprint are revalidated before graph parsing.

### Canonical JSON version 1 byte contract

Canonicalization version `1` emits one compact JSON value encoded as UTF-8
without a byte-order mark or trailing newline. Input text is normalized to
Unicode NFC before JSON escaping. JSON strings use the escapes required by
JSON and otherwise retain UTF-8 characters; insignificant whitespace is not
emitted.

Object keys use contract-defined order rather than input insertion order. The
fingerprint envelope order is:

```text
canonicalization_version, object_type, object_id, fingerprint_class,
canonical_value
```

Within `canonical_value`, keys follow the fingerprint-class field order listed
below. Set-like ID and test-reference arrays are sorted by Unicode code point
after normalization. Normative sequences, including acceptance criteria,
constraints, and Concept states, retain source order. Empty applicable fields
are emitted; absent inapplicable fields are not. Paths, display titles,
explanatory sections, source formatting, and input object-key order are not
copied into canonical values.

Contract object fixtures use a language-independent parsed-model projection as
their input boundary. That projection is a contract oracle, not a public CLI
wire format. Parser tests demonstrate that Markdown produces the same
projection before the fingerprint implementation consumes it.

## Fingerprint classes

Requirement semantic:

```text
statement, acceptance, constraints
```

Requirement structural:

```text
kind, owner_capability_id, refers_to_ids, depends_on_ids
```

Requirement verification:

```text
verification, test_refs
```

Concept semantic:

```text
definition, identity, states
```

Concept structural:

```text
relates_to_ids
```

Capability structural:

```text
requirement_ids, reachable_fragments
```

The envelope supplies object type and ID for every class. Prose fields in the
contract-fixture projection are normalized block-AST arrays. Version 1 fixtures
cover paragraph and text nodes; node keys are ordered `type`, then `children`
or `value`. Acceptance criteria, constraints, and states are arrays of block-AST
arrays so their outer source order remains observable. `reachable_fragments`
contains sorted arrays of the Requirement IDs contributed by each reachable
fragment, ordered lexicographically by their canonical JSON bytes; it does not
contain document paths.

Titles, rationale, examples, purpose, formatting, and document paths are
excluded from semantic fingerprints.

## Change fingerprints

A change delta is a canonical sorted sequence:

```json
[
  {
    "operation": "add",
    "type": "requirement",
    "id": "REQ-1234ABCD",
    "after": "sha256:..."
  },
  {
    "operation": "modify",
    "type": "concept",
    "id": "CON-1234ABCD",
    "before": "sha256:...",
    "after": "sha256:..."
  },
  {
    "operation": "delete",
    "type": "requirement",
    "id": "REQ-5678EFAB",
    "before": "sha256:..."
  }
]
```

### Object delta version 1 byte contract

Semantic, structural, and verification deltas are canonicalized and
fingerprinted independently. Each delta is one compact JSON array encoded
with the canonical JSON version 1 byte rules. An entry uses key order
`operation`, `type`, `id`, then `before` and/or `after`. `add` includes only
`after`, `modify` includes `before` then `after`, and `delete` includes only
`before`.

Entries are sorted by the NFC-normalized tuple `type`, `id`, `operation`, with
each component compared by Unicode code point. One fingerprint class cannot
contain more than one operation for the same `type` and `id`. An unchanged
class emits no entry, and an empty class is the exact two bytes `[]` before
hashing. A change confined to explanatory content therefore produces empty
semantic, structural, and verification deltas; there is no explanatory
fingerprint class.

The contract byte and truth-table oracle is the
[`fingerprint-deltas` fixture manifest](../../fixtures/v1/fingerprints/deltas/cases.json).

### Base delta computation

Comparison of two validated graphs computes semantic and structural deltas
directly from their versioned object fingerprints. It emits the exact entries,
canonical bytes, and fingerprint for each available class. It does not emit an
approval, gate, semantic-review, or merge-readiness conclusion. Explanatory-only
changes therefore produce exact empty semantic and structural arrays.

The canonical delta format also supports the verification class, but a command
must not report that class as available until both graph snapshots have a
TestIndex-derived verification fingerprint. An unavailable class is distinct
from the exact empty delta `[]` for an available unchanged class.
Version 1 `diff` accepts an optional pair of base and target TestIndex paths;
each index must match the selected project, resolved snapshot ref, and active
Requirement identities. A partial pair is invalid.

### Affected scope fingerprint

Affected-scope computation starts with added or modified active Requirements,
explicit active `code` targets, and active Requirements that refer to a
semantically changed Concept. It expands that set through transitive reverse
`depends-on` edges in the target graph. QA scope contains the target owner of
every affected active Requirement and the former owner of every deleted
Requirement; deleted Requirements themselves are excluded from the active
verification set.

The version 1 affected-scope fingerprint hashes compact UTF-8 JSON with this
exact key order:

```text
canonicalization_version, affected_requirements, affected_capabilities
```

Both ID arrays are deduplicated and sorted by stable ID. The fingerprint is
SHA-256 over those exact bytes.

### Approval binding

Approval binds the explicit Change `mode` together with the semantic and
structural delta fingerprints. Verification deltas remain independently
reportable but are not approval-bound. Reusing the same delta fingerprints
under another mode does not match the approval subject.

## Git model

```text
B = package base commit
P = package-bound candidate specification
H = current branch head
M = current integration commit
```

Comparisons:

```text
B → P  package-bound target delta
P → H  candidate-to-branch drift
B → M  concurrent integration changes
B → H  branch delta
H ↔ M  final integration compatibility
```

The integration branch name is not identity. Resolved commit IDs and object
fingerprints are stored in artifacts.

Every mutable ref is resolved once at command start. A resolved Git object ID
is an opaque non-empty string: implementations do not infer SHA-1, SHA-256, or
any fixed digest length from it.

Workflow artifact retention never advances, rewinds, or duplicates these Git
subjects. Evidence, candidate bytes, and reports are retained through the
[external/project-local staging topology](artifact-schemas.md#retention-topology),
not by committing them onto the proposal or integration ref or by creating a
retention-only branch or tag. A later ref movement is observed as freshness
change; it is not hidden by restoring an older ref for assessment.

`candidate snapshot` resolves an explicit base ref and candidate ref once and
serializes the latter specification tree into a CandidateTreeManifest bound to
the former tree fingerprint. The retained bytes therefore survive later ref
movement without moving either ref backward; consumers still re-resolve their
declared current refs and apply normal freshness checks.

## Branch preparation

1. read `B` from `package.base.git_ref`, `P` from the explicitly supplied
   candidate, `H` from the explicit branch-head ref, and `M` from the explicit
   integration ref;
2. revalidate the exact `P` bytes against the package candidate-tree and
   object-delta fingerprints;
3. perform an internal three-way textual merge;
4. stop for textual conflicts;
5. parse and validate the merged candidate;
6. verify the package semantic and structural deltas remain identical;
7. emit a new exact SpecPatch whose before hashes match files in `M`.

The Branch Preparation Gate composes mechanical preparation with explicit
ApprovalEvidence. Approval binds the exact project, issuer provenance, mode,
base object ID, and canonical semantic and structural object-delta
fingerprints. Independent integration additions do not invalidate approval.

No working-tree write occurs before explicit apply.

### ConflictReport input fingerprints

Mechanical preparation fingerprints the selected project configuration and
the complete preparation input without depending on JSON input key order. The
version 1 canonical input function recursively sorts object keys by Unicode
code point, preserves array order, normalizes strings to NFC, emits compact
JSON as UTF-8 without a byte-order mark or trailing newline, and hashes those
exact bytes with SHA-256.

`config_fingerprint` applies that function directly to the parsed selected
project configuration. `input_fingerprint` applies it to this exact value:

```json
{
  "canonicalization_version": "1",
  "package": { "...": "the strict normalized ProposalPackage value" },
  "candidate_tree_fingerprint": "sha256:...",
  "branch_head": "resolved-H",
  "integration_ref": "resolved-M",
  "merge_base": "resolved-merge-base",
  "config_fingerprint": "sha256:..."
}
```

Because keys are recursively sorted before encoding, their presentation order
above is explanatory rather than byte-significant. Conflict entries are
deduplicated and sorted by `path`, `kind`, then optional `object_id`.
The ConflictReport emits deterministic semantic candidates for the proposal
and current integration changes. Its final input fingerprint also binds the
canonical ApprovalEvidence set. The public preparation command emits a
SpecPatch only when approval is current and preparation is conflict-free with
no changed affected object.

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
      "path": "spec/capabilities/example.md",
      "before_sha256": "sha256:...",
      "after_sha256": "sha256:...",
      "content_utf8": "..."
    }
  ]
}
```

The complete machine contract is defined in
[Workflow artifacts and schemas](artifact-schemas.md).

Generation compares the current integration specification tree with the clean
prepared tree over their complete path union. Paths are sorted by Unicode code
point. A path only in the prepared tree emits `create`; a changed path in both
trees emits `replace`; and a path only in integration emits `delete`.
Unchanged files emit no operation. Create and replace carry exact UTF-8 content
and its `after_sha256`; replace and delete carry the integration file's exact
`before_sha256`. The two whole-tree fingerprints are copied from the validated
integration and prepared trees.

Application is fail-closed:

- every path remains inside `spec.root`;
- path traversal, symlinks, binary content, and `.git` mutation are rejected;
- all before states and after hashes validate before mutation;
- the core constructs the complete validated result tree before invoking an
  injected writer transaction;
- the Node writer stages create/replace bytes in unique hidden sibling files,
  fsyncs them where the platform supports it, repeats containment, entry-type,
  absence, and exact before-hash preflight, then uses same-directory backup
  and rename operations;
- a failed replacement rolls applied targets back in reverse order and removes
  staged files and newly created empty directories;
- failure cannot leave a partially applied final set;
- unrelated working-tree changes are preserved.

The transaction receives only exact absolute targets already proven to be
inside the selected worktree's `spec.root`. Distinct paths that collide after
portable Unicode normalization and case folding are rejected before mutation.
It never invokes Git. Injected candidate drift, writer-preflight drift,
staging failure, multi-replacement interruption, and a transient rollback
filesystem failure prove that the original visible tree is restored without
stage or backup debris. The production writer is the default instance of the
same injected factory used by these tests.

## Historical ID reservation

The history tip is the object ID resolved from explicit `--history-ref`, or
from the selected project's configured `git.default_target_ref` when the option
is absent. `--ref` selects a validation snapshot only; it does not implicitly
replace the history tip. Failure to resolve an explicitly requested ref is a
technical failure.

An object ID is newly introduced when it is active in the validation snapshot
but absent from the active graph at the resolved history tip. Only newly
introduced IDs require a history query. The query searches every commit
reachable from the history tip for a typed canonical model definition belonging
to the same stable project ID. At each commit, canonical roots are obtained from
tracked `.sdd/config.yaml` files carrying that project ID, so moving a project
directory or configured specification root does not reset reservation. Arbitrary
prose, fixture, test, and noncanonical proposal occurrences do not count.
For an `SDD` candidate, a prior definition is a tracked `.sdd/config.yaml`
`project_id` declaration anywhere in the enclosing repository history rather
than a model-object definition.

Parallel-branch collisions are found because the configured integration history
tip is resolved at command start. Positive and negative results may be cached
only for that resolved object ID. Repository-wide project-ID uniqueness is a
bounded tree query over `.sdd/config.yaml` paths inside the enclosing repository;
it does not follow symlinks or read outside the repository.

The completed repository self-bootstrap used a temporary pre-canonical
reservation procedure preserved in the
[historical execution record](../../plans/completed/self-bootstrap-procedure.md).
That history explains already-canonical introductions but grants no active ID
reservation. New candidate objects use freshly generated IDs and become subject
to normal historical non-reuse after canonical introduction.

Git-backed command responses report one history status:

```text
complete | incomplete | unchecked
```

`unchecked` applies only when no project resolves. A shallow clone or another
provably incomplete reachable history may run ordinary validation with status
`incomplete` plus stable diagnostic `SDD_GIT_HISTORY_INCOMPLETE`. An unresolved
requested ref produces `SDD_GIT_REF_UNRESOLVED` and a technical failure. Ordinary
validation never turns history status into a merge-readiness conclusion. Strict
merge validation later blocks unless the required history status is `complete`.
