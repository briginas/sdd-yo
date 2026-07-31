---
sdd:
  type: capability-fragment
  capability: CAP-B2000001
---

# Authorization

This fragment contains the authorization rule for project archiving.

<a id="req-b2000002"></a>

## REQ-B2000002 — Operator is authorized

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-B2000002 — Operator](../concepts/operator.md)

### Statement <!-- sdd:statement -->

Only an operator with archive permission shall archive a project.

### Acceptance criteria <!-- sdd:acceptance -->

- Product review confirms the operator role includes archive permission.
