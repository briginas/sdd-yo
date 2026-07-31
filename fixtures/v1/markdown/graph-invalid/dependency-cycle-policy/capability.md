---
sdd:
  type: capability
  id: CAP-D8000001
---

# Cyclic dependencies

## Purpose <!-- sdd:purpose -->

Demonstrate rejection of cyclic Requirement dependencies.

<a id="req-d8000001"></a>

## REQ-D8000001 — Depend on the second Requirement

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-D8000002 — Depend on the first Requirement](capability.md#req-d8000002)

### Statement <!-- sdd:statement -->

The first Requirement shall depend on the second Requirement.

### Acceptance criteria <!-- sdd:acceptance -->

- The dependency is active.

<a id="req-d8000002"></a>

## REQ-D8000002 — Depend on the first Requirement

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-D8000001 — Depend on the second Requirement](capability.md#req-d8000001)

### Statement <!-- sdd:statement -->

The second Requirement shall depend on the first Requirement.

### Acceptance criteria <!-- sdd:acceptance -->

- The dependency is active.
