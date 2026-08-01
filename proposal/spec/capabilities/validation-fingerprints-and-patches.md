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

## REQ-2C8E8085 — Generate and reserve random object IDs

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-2C550D5B — Capability](../../../spec/concepts/capability.md)
- refers-to: [CON-9F69CC0E — Requirement](../../../spec/concepts/requirement.md)
- refers-to: [CON-88F1C731 — Domain Concept](../../../spec/concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

The CLI shall generate cryptographically random uppercase eight-hex IDs and
shall permanently reject reuse of an object ID previously defined in the
reachable canonical specification history of the same SDD Project.

### Acceptance criteria <!-- sdd:acceptance -->

- Supported prefixes are `CAP`, `REQ`, `CON`, and `SDD`.
- Manual IDs pass the same validation.
- Only newly introduced IDs require historical lookup.
- Arbitrary prose, test fixture, or noncanonical proposal mentions do not count
  as prior model object definitions.
- Parallel-branch collisions are detected against the current integration ref.

<a id="req-b25091a0"></a>

## REQ-B25091A0 — Separate semantic, structural, and verification fingerprints

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-FC16381E — Fingerprint](../../../spec/concepts/fingerprint.md)

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

- refers-to: [CON-FC16381E — Fingerprint](../../../spec/concepts/fingerprint.md)
- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)

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

- refers-to: [CON-FC16381E — Fingerprint](../../../spec/concepts/fingerprint.md)
- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-24A372E7 — Compute semantic and structural object deltas](#req-24a372e7)

### Statement <!-- sdd:statement -->

Approval shall bind a canonical sorted object delta of add, modify, and delete
operations rather than the fingerprint of the entire specification tree.

### Acceptance criteria <!-- sdd:acceptance -->

- Independent integration-branch additions do not invalidate approval.
- Modify and delete operations include expected before fingerprints.
- Add operations include expected after fingerprints.

<a id="req-3bf12aad"></a>

## REQ-3BF12AAD — Represent executable specification changes as exact file operations

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)

### Statement <!-- sdd:statement -->

An executable SpecPatch shall contain sorted create, update, and delete
operations guarded by exact before and after SHA-256 file hashes.

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

- depends-on: [REQ-3BF12AAD — Represent executable specification changes as exact file operations](#req-3bf12aad)

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

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-A8739118 — Prepare approved proposals against current integration state](proposal-modes-and-workflow-gates.md#req-a8739118)

### Statement <!-- sdd:statement -->

Proposal preparation shall compare base, approved candidate, and current
integration states and produce a new exact patch only when approved object
deltas remain intact.

### Acceptance criteria <!-- sdd:acceptance -->

- Text conflicts return `REVIEW_REQUIRED`.
- Semantic conflicts are analyzed after a clean textual merge.
- The working tree remains unchanged until explicit apply.

<a id="req-8b656fc5"></a>

## REQ-8B656FC5 — Report canonical history completeness

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

Ordinary validation shall report whether reachable canonical Git history was
sufficient for the requested identifier-reuse and comparison checks and shall
not present an incomplete historical check as complete.

### Acceptance criteria <!-- sdd:acceptance -->

- Complete reachable history reports historical validation as complete.
- Shallow or otherwise incomplete history may produce an otherwise valid
  ordinary-validation result only with a stable warning and machine-readable
  incomplete status.
- An explicitly requested comparison ref that cannot be resolved is a
  technical failure, not a successful incomplete comparison.
- Git object IDs are opaque non-empty strings; no hash algorithm or fixed
  length is inferred.
- Rewritten or unreachable history is outside the guarantee, and ordinary
  validation emits no merge-readiness conclusion.

<a id="req-fdd51416"></a>

## REQ-FDD51416 — Require sufficient Git history for strict merge validation

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)
- depends-on: [REQ-8B656FC5 — Report canonical history completeness](#req-8b656fc5)

### Statement <!-- sdd:statement -->

Strict merge validation shall require sufficient reachable Git history to
verify identifier non-reuse and requested comparison refs.

### Acceptance criteria <!-- sdd:acceptance -->

- Strict merge validation requires complete identifier-reuse checks and every
  requested comparison ref.
- Merge readiness is blocked when historical validation is incomplete.
