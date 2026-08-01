---
sdd:
  type: capability
  id: CAP-CB22A5A3
---

# Proposal modes and workflow gates

## Purpose <!-- sdd:purpose -->

Represent synchronization work between product contract and implementation
without storing workflow history in the canonical specification.

<a id="req-e26a859e"></a>

## REQ-E26A859E — Support exactly three synchronization modes

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

An SDD Change shall use exactly one mode: `spec-code`, `spec`, or `code`.

### Acceptance criteria <!-- sdd:acceptance -->

- No `feature`, `baseline`, `fix`, `maintenance`, or `none` value is part of
  the Change mode schema.
- Tests and QA accompany all modes but do not determine the mode.
- Ordinary maintenance outside contract synchronization creates no SDD Change.

<a id="req-8de9e078"></a>

## REQ-8DE9E078 — Generate a deterministic mechanical ProposalPackage

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](proposal-modes-and-workflow-gates.md#req-e26a859e)

### Statement <!-- sdd:statement -->

Proposal validation shall load a selected Git base and virtual candidate,
validate the candidate graph, compute semantic and structural deltas and
affected scope, enforce the mechanical mode rules, and emit a deterministic
ProposalPackage without modifying the working tree.

### Acceptance criteria <!-- sdd:acceptance -->

- Identical base, normalized candidate tree, candidate source kind, mode, and
  code targets produce an identical decision-bearing package value.
- `spec-code` and `spec` require a non-empty semantic delta; whether behavior
  is correspondingly implemented or already accepted is not mechanically
  claimed by this operation.
- `code` requires empty semantic and structural deltas and one or more active
  Requirement targets bound to their semantic and structural fingerprints.
- The package includes the selected mode, base and candidate tree
  fingerprints, object-delta fingerprints and object IDs, bound code targets,
  affected-scope fingerprint and IDs, and deterministic diagnostics.
- `semantic_candidates` contains deterministic review candidates derived from
  the base and candidate graphs; candidates do not block the package, declare
  a Finding, or grant human approval.

<a id="req-e80f09c6"></a>

## REQ-E80F09C6 — Validate proposals without changing the working tree

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)
- depends-on: [REQ-8DE9E078 — Generate a deterministic mechanical ProposalPackage](proposal-modes-and-workflow-gates.md#req-8de9e078)

### Statement <!-- sdd:statement -->

The Proposal Gate shall apply a proposed specification patch to a virtual base
state, validate the candidate graph, compute change fingerprints and affected
scope, and produce reviewable semantic candidates without modifying the
working tree.

### Acceptance criteria <!-- sdd:acceptance -->

- Proposal validation is deterministic for identical inputs.
- Mechanical violations block proposal package generation.
- Semantic concerns are emitted as deterministic review candidates without
  blocking an otherwise valid package.
- The proposal result is not itself a Finding or human approval.

<a id="req-7341dbb7"></a>

## REQ-7341DBB7 — Bind mode to approval

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

The approved Change mode shall be immutable for the lifetime of that approval.

### Acceptance criteria <!-- sdd:acceptance -->

- Evidence for a different mode is rejected.
- Changing mode requires a new approval.
- The CLI does not infer a replacement mode automatically.

<a id="req-a8739118"></a>

## REQ-A8739118 — Prepare approved proposals against current integration state

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- depends-on: [REQ-E80F09C6 — Validate proposals without changing the working tree](proposal-modes-and-workflow-gates.md#req-e80f09c6)

### Statement <!-- sdd:statement -->

The Branch Preparation Gate shall transfer an approved object delta from its
base commit to the current integration ref through three-way analysis and emit
a new exact patch without modifying the working tree.

### Acceptance criteria <!-- sdd:acceptance -->

- Independent integration-branch changes do not invalidate approval.
- A changed affected object returns `REVIEW_REQUIRED`.
- A newly occupied ID blocks preparation.
- The prepared semantic and structural deltas match the approved deltas.

<a id="req-a3c3b779"></a>

## REQ-A3C3B779 — Keep CLI workflow state external

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

The CLI shall remain reproducible from Git refs and explicit versioned
artifacts rather than requiring a hidden durable workflow database.

### Acceptance criteria <!-- sdd:acceptance -->

- Proposal, approval, test, QA, finding, and merge artifacts are explicit
  inputs and outputs.
- A removable cache may accelerate processing.
- Deleting cache does not lose source-of-truth or approval state.
