---
sdd:
  type: capability
  id: CAP-A2000002
---

# Export

## Purpose <!-- sdd:purpose -->

Define export behavior.

<a id="req-a2000002"></a>

## REQ-A2000002 — Preserve export order

```sdd
kind: invariant
verification: automated
```

### Statement <!-- sdd:statement -->

The system shall preserve source order in an export.

### Acceptance criteria <!-- sdd:acceptance -->

- Exported records retain source order.

### Rationale <!-- sdd:rationale -->

Stable order makes exports easier to compare.
