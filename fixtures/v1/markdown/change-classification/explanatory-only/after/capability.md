---
sdd:
  type: capability
  id: CAP-A3000003
---

# Archiving

## Purpose <!-- sdd:purpose -->

Define archive behavior.

<a id="req-a3000003"></a>

## REQ-A3000003 — Archive inactive projects

```sdd
kind: behavior
verification: automated
```

### Statement <!-- sdd:statement -->

The system shall archive an inactive project.

### Acceptance criteria <!-- sdd:acceptance -->

- The archived project leaves the active list.

### Rationale <!-- sdd:rationale -->

Archiving helps operators focus on current work.
