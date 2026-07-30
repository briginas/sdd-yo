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

## Fingerprint classes

Requirement semantic:

```text
object type and ID
statement AST
acceptance criteria AST
constraints AST
```

Requirement structural:

```text
object type and ID
kind
owner Capability ID
refers-to IDs
depends-on IDs
```

Requirement verification:

```text
object type and ID
verification mode
normalized discovered test references
```

Concept semantic:

```text
object type and ID
definition
identity
states
semantic relation content
```

Concept structural:

```text
object type and ID
relates-to IDs
```

Capability structural:

```text
object type and ID
owned Requirement IDs
reachable fragment set
```

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

Semantic, structural, and verification deltas are fingerprinted independently.
Approval binds semantic and structural deltas.

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
query searches reachable history for the full exact ID. Positive and negative
results may be cached.

A shallow clone may run non-strict validation with a warning but cannot produce
a strict merge `PASS`.
