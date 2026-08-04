---
sdd:
  type: capability
  id: CAP-404305F6
---

# Multi-project CLI and skill integration

## Purpose <!-- sdd:purpose -->

Expose one local, provider-neutral deterministic interface that works in
single projects and monorepos and can be orchestrated safely by an optional
agent skill.

<a id="req-fbb24d6c"></a>

## REQ-FBB24D6C — Isolate project graphs

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The first version shall treat every SDD Project graph, identifier namespace,
configuration, adapters, and merge result as independent.

### Acceptance criteria <!-- sdd:acceptance -->

- Cross-project `CAP`, `REQ`, and `CON` relations are rejected.
- A repository-wide external workflow runs the gate for each affected SDD
  Project.
- Cross-project orchestration is not hidden inside one project result.
