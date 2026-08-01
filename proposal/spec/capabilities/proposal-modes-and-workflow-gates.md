---
sdd:
  type: capability
  id: CAP-CB22A5A3
---

# Proposal modes and workflow gates

## Purpose <!-- sdd:purpose -->

Represent synchronization work between product contract and implementation
without storing workflow history in the canonical specification.

<a id="req-983914f3"></a>

## REQ-983914F3 — Change contract and implementation in spec-code mode

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](../../../spec/capabilities/proposal-modes-and-workflow-gates.md#req-e26a859e)

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
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](../../../spec/capabilities/proposal-modes-and-workflow-gates.md#req-e26a859e)

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
- depends-on: [REQ-E26A859E — Support exactly three synchronization modes](../../../spec/capabilities/proposal-modes-and-workflow-gates.md#req-e26a859e)

### Statement <!-- sdd:statement -->

`code` mode shall target one or more active Requirements while keeping
semantic and structural specification deltas empty.

### Acceptance criteria <!-- sdd:acceptance -->

- The target Requirement fingerprints are captured at approval.
- Presentation and verification metadata changes remain permitted.
- A changed or removed target Requirement returns `REVIEW_REQUIRED`.
- Discovering that the contract is wrong requires a new `spec-code` Change.

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
