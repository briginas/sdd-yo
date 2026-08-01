---
sdd:
  type: capability
  id: CAP-F31EF876
---

# Semantic review and conflict analysis

## Purpose <!-- sdd:purpose -->

Surface likely quality and semantic compatibility problems while reserving
final judgment for authorized humans.

<a id="req-bdafd401"></a>

## REQ-BDAFD401 — Avoid completeness claims for semantic analysis

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../../../spec/concepts/finding.md)

### Statement <!-- sdd:statement -->

SDD Yo shall not claim that an empty semantic Finding set proves the absence
of all semantic conflicts.

### Acceptance criteria <!-- sdd:acceptance -->

- Reports distinguish performed analysis from proof.
- Human merge authority remains responsible for final judgment.
