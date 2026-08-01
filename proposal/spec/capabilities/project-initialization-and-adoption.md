---
sdd:
  type: capability
  id: CAP-0B417FC4
---

# Project initialization and adoption

## Purpose <!-- sdd:purpose -->

Initialize SDD Yo in new or existing Git repositories and establish an honest,
incremental path from no specification to a governed product contract.

<a id="req-784f200f"></a>

## REQ-784F200F — Support incremental adoption

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)
- refers-to: [CON-2C550D5B — Capability](../../../spec/concepts/capability.md)

### Statement <!-- sdd:statement -->

An existing project shall be able to adopt SDD Yo one approved Capability or
small related Capability set at a time.

### Acceptance criteria <!-- sdd:acceptance -->

- Incremental adoption does not require a complete repository-wide baseline.
- Each accepted Capability becomes governed when it appears in the integration
  branch specification.
- Reports clearly state when guarantees apply only to governed scope.

<a id="req-bfac609f"></a>

## REQ-BFAC609F — Derive governed scope from canonical presence

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)
- refers-to: [CON-2C550D5B — Capability](../../../spec/concepts/capability.md)

### Statement <!-- sdd:statement -->

In incremental adoption mode, a Capability shall be governed if and only if it
is present in the integration branch specification.

### Acceptance criteria <!-- sdd:acceptance -->

- Capability documents do not store a `governed` status.
- Capabilities absent from the specification remain outside current
  guarantees.
- The CLI does not claim to enumerate all unmodeled behavior.

<a id="req-d5a7a5df"></a>

## REQ-D5A7A5DF — Complete adoption by governance decision

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)
- depends-on: [REQ-784F200F — Support incremental adoption](#req-784f200f)

### Statement <!-- sdd:statement -->

The transition from `incremental` to `complete` adoption shall require an
explicit governance approval after structural validation, traceability, QA,
and finding resolution complete for the declared project scope.

### Acceptance criteria <!-- sdd:acceptance -->

- The transition is never inferred automatically.
- The decision is represented by external governance evidence.
- The reverse transition also requires explicit governance approval.
- Complete-mode reports no longer use the governed-scope-only qualifier.

<a id="req-b1bb25c9"></a>

## REQ-B1BB25C9 — Baseline existing behavior without changing it

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)
- depends-on: [REQ-784F200F — Support incremental adoption](#req-784f200f)

### Statement <!-- sdd:statement -->

A `spec`-mode baseline shall describe behavior that already exists and is
explicitly accepted without changing observable product behavior in the same
Change.

### Acceptance criteria <!-- sdd:acceptance -->

- The baseline may add or rename tests to establish Requirement traceability.
- A discovered implementation defect is not silently repaired in the baseline.
- Desired behavior that requires implementation changes is handled by a
  separate `spec-code` or `code` Change.

<a id="req-7fccf943"></a>

## REQ-7FCCF943 — Expose adoption state honestly

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

Every validation and merge-readiness report shall identify the SDD Project and
its configured adoption mode without presenting incremental scope as complete.

### Acceptance criteria <!-- sdd:acceptance -->

- Structured output includes `project_id` and adoption mode.
- Human output distinguishes `PASS (governed scope only)` from complete
  project `PASS`.
- Missing or invalid adoption configuration blocks strict processing.
