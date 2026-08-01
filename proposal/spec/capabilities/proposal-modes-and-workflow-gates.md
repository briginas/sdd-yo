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

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)

### Statement <!-- sdd:statement -->

An SDD Change shall use exactly one mode: `spec-code`, `spec`, or `code`.

### Acceptance criteria <!-- sdd:acceptance -->

- No `feature`, `baseline`, `fix`, `maintenance`, or `none` value is part of
  the Change mode schema.
- Tests and QA accompany all modes but do not determine the mode.
- Ordinary maintenance outside contract synchronization creates no SDD Change.

<a id="req-983914f3"></a>

## REQ-983914F3 — Change contract and implementation in spec-code mode

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](#req-e26a859e)

### Statement <!-- sdd:statement -->

`spec-code` mode shall require a non-empty semantic specification delta and a
corresponding implementation behavior change.

### Acceptance criteria <!-- sdd:acceptance -->

- Added, changed, or deleted Requirements satisfy the semantic delta.
- A semantic Domain Concept change also satisfies the semantic delta.
- Presentation-only or structural-only changes do not qualify.
- Approval binds the semantic and structural change fingerprints.

<a id="req-fb76fc6f"></a>

## REQ-FB76FC6F — Align specification to accepted existing behavior in spec mode

```sdd
kind: invariant
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](#req-e26a859e)

### Statement <!-- sdd:statement -->

`spec` mode shall require a non-empty semantic specification delta that
describes already existing, explicitly accepted implementation behavior
without changing that observable behavior.

### Acceptance criteria <!-- sdd:acceptance -->

- The mode supports incremental baseline and correction of the contract to
  accepted existing behavior.
- Tests may be added or renamed to establish traceability.
- Product behavior changes are outside this mode.
- A Spec Approver confirms the existing behavior deserves canonical status.

<a id="req-13ce0529"></a>

## REQ-13CE0529 — Align implementation to active contract in code mode

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- refers-to: [CON-9F69CC0E — Requirement](../../../spec/concepts/requirement.md)
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](#req-e26a859e)

### Statement <!-- sdd:statement -->

`code` mode shall target one or more active Requirements while keeping
semantic and structural specification deltas empty.

### Acceptance criteria <!-- sdd:acceptance -->

- The target Requirement fingerprints are captured at approval.
- Presentation and verification metadata changes remain permitted.
- A changed or removed target Requirement returns `REVIEW_REQUIRED`.
- Discovering that the contract is wrong requires a new `spec-code` Change.

<a id="req-7341dbb7"></a>

## REQ-7341DBB7 — Bind mode to approval

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- refers-to: [CON-4365C0F6 — Evidence](../../../spec/concepts/evidence.md)

### Statement <!-- sdd:statement -->

The approved Change mode shall be immutable for the lifetime of that approval.

### Acceptance criteria <!-- sdd:acceptance -->

- Evidence for a different mode is rejected.
- Changing mode requires a new approval.
- The CLI does not infer a replacement mode automatically.

<a id="req-8de9e078"></a>

## REQ-8DE9E078 — Generate a deterministic mechanical ProposalPackage

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- refers-to: [CON-FC16381E — Fingerprint](../../../spec/concepts/fingerprint.md)
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](#req-e26a859e)

### Statement <!-- sdd:statement -->

Proposal validation shall load a selected Git base and virtual candidate,
validate the candidate graph, compute semantic and structural deltas and
affected scope, enforce the mechanical mode rules, and emit a deterministic
ProposalPackage without modifying the working tree.

### Acceptance criteria <!-- sdd:acceptance -->

- Identical base, candidate bytes, mode, and code targets produce an identical
  decision-bearing package value.
- `spec-code` and `spec` require a non-empty semantic delta; whether behavior
  is correspondingly implemented or already accepted is not mechanically
  claimed by this operation.
- `code` requires empty semantic and structural deltas and one or more active
  Requirement targets bound to their semantic and structural fingerprints.
- The package includes the selected mode, base and candidate tree
  fingerprints, object-delta fingerprints and object IDs, bound code targets,
  affected-scope fingerprint and IDs, and deterministic diagnostics.
- `semantic_candidates` is present and empty until semantic review is
  evaluated; the package is not human approval and makes no semantic-review
  claim.

<a id="req-e80f09c6"></a>

## REQ-E80F09C6 — Validate proposals without changing the working tree

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- refers-to: [CON-FC16381E — Fingerprint](../../../spec/concepts/fingerprint.md)
- depends-on: [REQ-8DE9E078 — Generate a deterministic mechanical ProposalPackage](#req-8de9e078)

### Statement <!-- sdd:statement -->

The Proposal Gate shall apply a proposed specification patch to a virtual base
state, validate the candidate graph, compute change fingerprints and affected
scope, and produce reviewable findings without modifying the working tree.

### Acceptance criteria <!-- sdd:acceptance -->

- Proposal validation is deterministic for identical inputs.
- Mechanical violations prevent proposal approval.
- Semantic and quality concerns are emitted as findings.
- The proposal result is not itself human approval.

<a id="req-a8739118"></a>

## REQ-A8739118 — Prepare approved proposals against current integration state

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-E80F09C6 — Validate proposals without changing the working tree](#req-e80f09c6)

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

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- refers-to: [CON-4365C0F6 — Evidence](../../../spec/concepts/evidence.md)

### Statement <!-- sdd:statement -->

The CLI shall remain reproducible from Git refs and explicit versioned
artifacts rather than requiring a hidden durable workflow database.

### Acceptance criteria <!-- sdd:acceptance -->

- Proposal, approval, test, QA, finding, and merge artifacts are explicit
  inputs and outputs.
- A removable cache may accelerate processing.
- Deleting cache does not lose source-of-truth or approval state.

<a id="req-9d265509"></a>

## REQ-9D265509 — Use four explicit workflow gates

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)

### Statement <!-- sdd:statement -->

SDD Change readiness shall be evaluated through Proposal, Branch Preparation,
Verification, and Merge gates.

### Acceptance criteria <!-- sdd:acceptance -->

- Every gate exposes versioned structured output.
- A later gate does not silently repair a failed earlier gate.
- Gate artifacts are independently freshness-checked.

<a id="req-8d1283e5"></a>

## REQ-8D1283E5 — Exclude ordinary maintenance from SDD modes

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)

### Statement <!-- sdd:statement -->

Changes that do not synchronize normative specification and observable
implementation behavior shall remain outside the three SDD Change modes.

### Acceptance criteria <!-- sdd:acceptance -->

- Presentation-only specification edits may run ordinary validation.
- Structural-only edits require structural review but no product approval.
- Refactoring and test-only maintenance create no ProposalPackage.

<a id="req-168cde5f"></a>

## REQ-168CDE5F — Remove completed Change state from canonical specification

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)

### Statement <!-- sdd:statement -->

After merge, canonical specification content shall retain only the resulting
active product model and shall not retain Change, approval, QA, or conflict
records.

### Acceptance criteria <!-- sdd:acceptance -->

- Git and external workflow systems preserve history.
- No canonical `status` field is added to active objects.
- Abandoned branches never become canonical product truth.
