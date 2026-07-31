---
sdd:
  type: capability
  id: CAP-B2000001
---

# Project archiving

## Purpose <!-- sdd:purpose -->

Allow authorized operators to archive inactive projects without deleting
their records.

## Documents <!-- sdd:fragments -->

- [Authorization](authorization.md)

<a id="req-b2000001"></a>

## REQ-B2000001 — Archive an inactive project

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-B2000001 — Project](../concepts/project.md)
- depends-on: [REQ-B2000002 — Operator is authorized](authorization.md#req-b2000002)

### Statement <!-- sdd:statement -->

An authorized operator shall be able to archive an inactive project.

### Acceptance criteria <!-- sdd:acceptance -->

- The project leaves the active project list.
- The project record remains available for restoration.

### Constraints <!-- sdd:constraints -->

- An active project cannot be archived.

### Rationale <!-- sdd:rationale -->

Archiving keeps active views focused without destroying project history.

### Examples <!-- sdd:examples -->

An operator archives a completed internal project after delivery.
