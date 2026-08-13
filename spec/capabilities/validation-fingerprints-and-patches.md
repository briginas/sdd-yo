---
sdd:
  type: capability
  id: CAP-E309CBCB
---

# Validation, fingerprints, and exact patches

## Purpose <!-- sdd:purpose -->

Provide deterministic structural validation, stable meaning-aware
fingerprints, safe exact patch preparation, and reproducible Git comparison.

<a id="req-2c8e8085"></a>

## REQ-2C8E8085 — Generate random object IDs without history lookup

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-2C550D5B — Capability](../concepts/capability.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

The CLI shall generate cryptographically random uppercase eight-hex IDs
without resolving or enumerating canonical Git history, and validation shall
require object IDs to be unique within each selected active or candidate
specification graph.

### Acceptance criteria <!-- sdd:acceptance -->

- Supported prefixes are `CAP`, `REQ`, `CON`, and `SDD`.
- Project-aware generation reports `history.status` as `unchecked` and
  `resolved_ref` as `null`.
- ID generation does not resolve the configured integration ref, enumerate
  reachable commits, or parse historical specification trees.
- Manual IDs pass the same selected-graph uniqueness validation.
- Reuse is permitted after the original object leaves the active specification.
- Duplicate IDs within one selected active or candidate graph remain invalid.

<a id="req-b25091a0"></a>

## REQ-B25091A0 — Separate semantic, structural, and verification fingerprints

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

Every applicable object and Change shall expose separate semantic, structural,
and verification fingerprints.

### Acceptance criteria <!-- sdd:acceptance -->

- Semantic fingerprints cover normative Requirement meaning and semantic
  Concept definition.
- Structural fingerprints cover type, kind, ownership, and active relations.
- Verification fingerprints cover verification mode and computed test
  references.
- Approval binds semantic and structural deltas, not verification deltas.

<a id="req-24a372e7"></a>

## REQ-24A372E7 — Compute semantic and structural object deltas

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

The CLI shall compare two valid specification graphs and compute separate
canonical semantic and structural object deltas from their versioned object
fingerprints.

### Acceptance criteria <!-- sdd:acceptance -->

- An add contains the object's expected after fingerprint, a delete contains
  its expected before fingerprint, and a modify contains both.
- An object appears in a fingerprint-class delta only when that class is
  added, removed, or changed.
- Entries are sorted by the NFC-normalized tuple `type`, `id`, and `operation`;
  repeated computation over equivalent graphs is byte-identical.
- An unchanged class canonicalizes as the exact JSON array `[]`, and an
  explanatory-only change produces empty semantic and structural deltas.
- Computation emits no approval, gate, or merge-readiness conclusion and does
  not claim a verification delta.

<a id="req-afd65a03"></a>

## REQ-AFD65A03 — Fingerprint approved object deltas

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- depends-on: [REQ-24A372E7 — Compute semantic and structural object deltas](validation-fingerprints-and-patches.md#req-24a372e7)

### Statement <!-- sdd:statement -->

Approval shall bind a canonical sorted object delta of add, modify, and delete
operations rather than the fingerprint of the entire specification tree.

### Acceptance criteria <!-- sdd:acceptance -->

- Independent integration-branch additions do not invalidate approval.
- Modify and delete operations include expected before fingerprints.
- Add operations include expected after fingerprints.

<a id="req-7d93d64a"></a>

## REQ-7D93D64A — Enforce mechanical graph invariants

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)
- refers-to: [CON-77D857DB — Document](../concepts/document.md)

### Statement <!-- sdd:statement -->

Validation shall reject malformed schemas, duplicate IDs, broken typed links,
invalid ownership, unreachable objects, invalid anchors, and unsupported
document or Requirement metadata.

### Acceptance criteria <!-- sdd:acceptance -->

- Diagnostics include stable code, severity, path, line, object ID when
  available, message, and remediation.
- The directed Requirement `depends-on` graph is acyclic.
- Mechanical validation does not claim to prove semantic atomicity or
  completeness.
- A CLI crash never produces a passing result.

<a id="req-1095e571"></a>

## REQ-1095E571 — Canonicalize objects before hashing

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

The CLI shall compute SHA-256 fingerprints from schema-versioned canonical JSON
derived from parsed Markdown AST content.

### Acceptance criteria <!-- sdd:acceptance -->

- Formatting, line endings, title, rationale, examples, and file movement do
  not change semantic fingerprints.
- Statement, acceptance, constraints, and semantic Concept definition changes
  do change semantic fingerprints.
- Unordered relation sets are sorted; ordered normative lists preserve order.

<a id="req-13cf54d6"></a>

## REQ-13CF54D6 — Resolve graph targets by stable identity

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

Validation and canonicalization shall resolve specification links to stable
object IDs rather than treating paths or display titles as semantic identity.

### Acceptance criteria <!-- sdd:acceptance -->

- Moving a file without changing target ID preserves semantic identity.
- Unknown or ambiguous targets make relevant fingerprints uncomputable.
- Paths remain validated for human navigation.

<a id="req-f3a241be"></a>

## REQ-F3A241BE — Parse the specification deterministically

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)
- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

Identical UTF-8 specification content and configuration shall produce the same
parsed object graph on every supported platform.

### Acceptance criteria <!-- sdd:acceptance -->

- Line endings and Unicode are normalized.
- Markdown is parsed to an AST rather than interpreted with regular
  expressions alone.
- Unknown or duplicate machine markers block validation.
- Object ordering is deterministic.

<a id="req-8b656fc5"></a>

## REQ-8B656FC5 — Report history-free identifier checks honestly

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

Project-aware ID generation and ordinary validation shall not claim that
canonical-history identifier non-reuse was checked when the product performs
no such historical scan.

### Acceptance criteria <!-- sdd:acceptance -->

- Project-aware ID generation reports a machine-readable `unchecked` history
  status with no resolved history ref.
- Ordinary validation does not resolve or enumerate reachable Git history
  solely to detect reuse of an ID belonging to a removed object.
- Ref-backed validation may still resolve the exact snapshot and comparison
  refs required by the requested operation.
- An explicitly requested comparison ref that cannot be resolved is a
  technical failure.
- Git object IDs are opaque non-empty strings; no hash algorithm or fixed
  length is inferred.
- Ordinary validation emits no merge-readiness conclusion.

<a id="req-fdd51416"></a>

## REQ-FDD51416 — Preserve strict Git comparison requirements

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)
- depends-on: [REQ-8B656FC5 — Report history-free identifier checks honestly](validation-fingerprints-and-patches.md#req-8b656fc5)

### Statement <!-- sdd:statement -->

Strict merge validation shall require every Git ref and comparison input needed
for current three-way analysis, but shall neither require canonical-history
identifier-reuse scanning nor block solely because that scan was not performed.

### Acceptance criteria <!-- sdd:acceptance -->

- Every explicitly selected base, branch-head, and integration ref required by
  the merge operation resolves to its exact current Git object.
- Active and candidate specification graphs remain subject to duplicate-ID
  validation.
- Reuse of an ID belonging only to a removed historical object does not block
  merge readiness.
- Merge bases, current integration state, three-way conflicts, exact
  fingerprints, approval freshness, tests, QA, findings, and all other
  applicable readiness evidence remain authoritative.

<a id="req-3bf12aad"></a>

## REQ-3BF12AAD — Represent executable specification changes as exact file operations

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

An executable SpecPatch shall contain path-sorted exact `create`, `replace`,
and `delete` operations guarded by before and after SHA-256 file hashes as
applicable.

### Acceptance criteria <!-- sdd:acceptance -->

- Unified diff is a review representation, not the executable format.
- Fuzzy application is prohibited.
- Only UTF-8 text inside the configured specification root is permitted.
- Local overlapping changes block application.

<a id="req-7afe9904"></a>

## REQ-7AFE9904 — Apply specification patches atomically and safely

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-3BF12AAD — Represent executable specification changes as exact file operations](validation-fingerprints-and-patches.md#req-3bf12aad)

### Statement <!-- sdd:statement -->

`proposal apply` shall validate every operation before mutation and shall not
leave a partially applied specification after failure.

### Acceptance criteria <!-- sdd:acceptance -->

- Path traversal, symlink targets, binary content, and `.git` mutation are
  rejected.
- Before and after content hashes are revalidated.
- Unrelated working-tree changes are preserved.
- Failure injection demonstrates no partial final state.

<a id="req-964b9f80"></a>

## REQ-964B9F80 — Prepare proposals through three-way Git analysis

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- depends-on: [REQ-8DE9E078 — Generate a deterministic mechanical ProposalPackage](proposal-modes-and-workflow-gates.md#req-8de9e078)

### Statement <!-- sdd:statement -->

Proposal preparation shall compare the package base, package-bound candidate,
branch head, and current integration states and produce a new exact patch only
when the revalidated candidate object deltas remain identical to the package.

### Acceptance criteria <!-- sdd:acceptance -->

- Text conflicts return `REVIEW_REQUIRED`.
- The exact candidate bytes are revalidated against the package candidate tree
  fingerprint and object-delta fingerprints before preparation.
- Semantic conflict candidates are analyzed separately after a clean textual
  merge and are not claimed by mechanical preparation.
- The working tree remains unchanged until explicit apply.
