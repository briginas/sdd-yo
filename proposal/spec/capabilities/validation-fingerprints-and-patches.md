---
sdd:
  type: capability
  id: CAP-E309CBCB
---

# Validation, fingerprints, and exact patches

## Purpose <!-- sdd:purpose -->

Provide deterministic structural validation, stable meaning-aware
fingerprints, safe exact patch preparation, and reproducible Git comparison.

<a id="req-afd65a03"></a>

## REQ-AFD65A03 — Fingerprint approved object deltas

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-FC16381E — Fingerprint](../../../spec/concepts/fingerprint.md)
- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-24A372E7 — Compute semantic and structural object deltas](../../../spec/capabilities/validation-fingerprints-and-patches.md#req-24a372e7)

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
- depends-on: [REQ-8DE9E078 — Generate a deterministic mechanical ProposalPackage](../../../spec/capabilities/proposal-modes-and-workflow-gates.md#req-8de9e078)

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

<a id="req-fdd51416"></a>

## REQ-FDD51416 — Require sufficient Git history for strict merge validation

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)
- depends-on: [REQ-8B656FC5 — Report canonical history completeness](../../../spec/capabilities/validation-fingerprints-and-patches.md#req-8b656fc5)

### Statement <!-- sdd:statement -->

Strict merge validation shall require sufficient reachable Git history to
verify identifier non-reuse and requested comparison refs.

### Acceptance criteria <!-- sdd:acceptance -->

- Strict merge validation requires complete identifier-reuse checks and every
  requested comparison ref.
- Merge readiness is blocked when historical validation is incomplete.
