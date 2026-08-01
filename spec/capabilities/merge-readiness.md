---
sdd:
  type: capability
  id: CAP-205F5DBC
---

# Merge readiness

## Purpose <!-- sdd:purpose -->

Combine current specification, approval, test, QA, conflict, and Git evidence
into a deterministic readiness decision without performing the merge.

<a id="req-64db876b"></a>

## REQ-64DB876B — Accept explicit versioned merge inputs

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

Merge Gate shall derive its result from explicit project, mode, Git ref,
proposal, approval, test, QA, finding, and resolution artifacts.

### Acceptance criteria <!-- sdd:acceptance -->

- Every artifact declares `schema_version` and `project_id`.
- Artifact references may be provided by file or standard input.
- Hidden workflow state is not required.
- Missing required input is reported explicitly.

<a id="req-bcfa15d8"></a>

## REQ-BCFA15D8 — Return exactly three readiness statuses

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)

### Statement <!-- sdd:statement -->

Merge Gate shall return exactly one product status: `PASS`,
`REVIEW_REQUIRED`, or `BLOCKED`.

### Acceptance criteria <!-- sdd:acceptance -->

- `PASS` means every required current condition is satisfied.
- `REVIEW_REQUIRED` means no definite violation is established but a human
  decision remains necessary.
- `BLOCKED` means a definite invariant failure, negative decision, stale
  evidence, or failed required check exists.

<a id="req-e85a06c3"></a>

## REQ-E85A06C3 — Enforce strict evidence freshness

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

Every merge input shall be accepted only for the exact Git references,
configuration, indexes, and object fingerprints to which it is bound.

### Acceptance criteria <!-- sdd:acceptance -->

- Branch-head movement invalidates TestIndex, test execution, and QA evidence.
- Adapter configuration changes invalidate dependent test artifacts.
- Semantic or structural delta changes invalidate approval.
- Integration-ref movement invalidates conflict and merge reports.
- Stale evidence is never silently reused.

<a id="req-8e2d9a5f"></a>

## REQ-8E2D9A5F — Validate mode-specific merge conditions

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

Merge Gate shall enforce the approved mode's specification-delta,
verification, and human-decision conditions.

### Acceptance criteria <!-- sdd:acceptance -->

- `spec-code` requires an approved non-empty semantic delta.
- `spec` requires an approved non-empty semantic delta and baseline QA.
- `code` requires unchanged semantic and structural specification plus current
  target Requirement fingerprints.
- A mode mismatch blocks the gate.

<a id="req-3b9fc7ff"></a>

## REQ-3B9FC7FF — Recheck against current integration state

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)

### Statement <!-- sdd:statement -->

Merge Gate shall compare branch head with the current integration ref and
recompute mechanical conflicts, semantic candidates, affected scope, and
freshness before returning `PASS`.

### Acceptance criteria <!-- sdd:acceptance -->

- A prior clean Branch Preparation result is not assumed current.
- New integration changes invalidate the prior ConflictReport.
- A textual clean merge does not skip semantic analysis.

<a id="req-93a4c44b"></a>

## REQ-93A4C44B — Use commit refs instead of per-Change Git tags

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

SDD Change identity and evidence shall use commit refs and fingerprints without
requiring a Git tag for each Change.

### Acceptance criteria <!-- sdd:acceptance -->

- Branch names are convenient mutable references, not evidence identity.
- Release tags remain independent of SDD Change workflow.
- Git commit object IDs are treated as opaque strings.
