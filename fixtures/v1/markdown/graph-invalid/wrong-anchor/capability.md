---
sdd:
  type: capability
  id: CAP-D4000001
---

# Anchors

## Purpose <!-- sdd:purpose -->

Demonstrate exact Requirement anchor validation.

<a id="req-d4000001"></a>

## REQ-D4000001 — Use the dependent Requirement

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-D4000002 — Provide the dependency](capability.md#req-d40000ff)

### Statement <!-- sdd:statement -->

The dependent behavior shall use its declared dependency.

### Acceptance criteria <!-- sdd:acceptance -->

- The dependency is addressable.

<a id="req-d4000002"></a>

## REQ-D4000002 — Provide the dependency

```sdd
kind: invariant
verification: automated
```

### Statement <!-- sdd:statement -->

The dependency shall be available.

### Acceptance criteria <!-- sdd:acceptance -->

- The dependency has a stable anchor.
