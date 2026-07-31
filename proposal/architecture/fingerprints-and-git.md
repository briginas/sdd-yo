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

Stage 0 object fixtures use a language-independent parsed-model projection as
their input boundary. That projection is a bootstrap oracle, not a public CLI
wire format. Later parser tests must demonstrate that Markdown produces the
same projection before the fingerprint implementation consumes it.

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
Stage 0 projection are normalized block-AST arrays. Version 1 fixtures cover
paragraph and text nodes; node keys are ordered `type`, then `children` or
`value`. Acceptance criteria, constraints, and states are arrays of block-AST
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

Approval binds the explicit Change `mode` together with the semantic and
structural delta fingerprints. Verification deltas remain independently
reportable but are not approval-bound. Reusing the same delta fingerprints
under another mode does not match the approval subject.

The Stage 0 byte and truth-table oracle is the
[`fingerprint-deltas` fixture manifest](../../fixtures/v1/fingerprints/deltas/cases.json).

## Git model

```text
B = proposal base commit
P = approved candidate specification
H = current branch head
M = current integration commit
```

Comparisons:

```text
B → P  approved target delta
P → H  post-approval drift
B → M  concurrent integration changes
B → H  branch delta
H ↔ M  final integration compatibility
```

The integration branch name is not identity. Resolved commit IDs and object
fingerprints are stored in artifacts.

## Branch preparation

1. read file and object states for `B`, `P`, and `M`;
2. perform an internal three-way textual merge;
3. stop for textual conflicts;
4. parse and validate the merged candidate;
5. verify the approved semantic and structural deltas remain identical;
6. recompute semantic candidates against `M`;
7. emit a new exact SpecPatch whose before hashes match files in `M`.

No working-tree write occurs before explicit apply.

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

Application is fail-closed:

- every path remains inside `spec.root`;
- path traversal, symlinks, binary content, and `.git` mutation are rejected;
- all before states and after hashes validate before mutation;
- writes use same-directory temporary files and atomic replacement where
  available;
- failure cannot leave a partially applied final set;
- unrelated working-tree changes are preserved.

## Historical ID reservation

Only IDs newly introduced relative to base require a Git-history query. The
query searches reachable canonical specification history for prior typed model
object definitions, not arbitrary prose or fixture occurrences of the same
text. Positive and negative results may be cached.

Before an SDD Project has canonical history, target-package IDs may be reserved
and promoted according to the
[self-bootstrap procedure](bootstrap.md). Their first appearance under the
project's canonical `spec.root` is canonical introduction, not reuse.

A shallow clone may run non-strict validation with a warning but cannot produce
a strict merge `PASS`.
