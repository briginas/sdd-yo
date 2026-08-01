---
sdd:
  type: capability
  id: CAP-E309CBCB
---

# Validation, fingerprints, and exact patches

## Purpose <!-- sdd:purpose -->

Provide deterministic structural validation, stable meaning-aware
fingerprints, safe exact patch preparation, and reproducible Git comparison.

<a id="req-fdd51416"></a>

## REQ-FDD51416 — Require sufficient Git history for strict merge validation

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)
- depends-on: [REQ-8B656FC5 — Report canonical history completeness](../../../spec/capabilities/validation-fingerprints-and-patches.md#req-8b656fc5)

### Statement <!-- sdd:statement -->

Strict merge validation shall require sufficient reachable Git history to
verify identifier non-reuse and requested comparison refs.

### Acceptance criteria <!-- sdd:acceptance -->

- Strict merge validation requires complete identifier-reuse checks and every
  requested comparison ref.
- Merge readiness is blocked when historical validation is incomplete.
