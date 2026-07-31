---
sdd:
  type: capability
  id: CAP-E309CBCB
---

# Validation, fingerprints, and exact patches

## Purpose <!-- sdd:purpose -->

Provide deterministic structural validation, stable meaning-aware
fingerprints, safe exact patch preparation, and reproducible Git comparison.

<a id="req-f3a241be"></a>

## REQ-F3A241BE — Parse the specification deterministically

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)
- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

Identical UTF-8 specification content and configuration shall produce the same
parsed object graph on every supported platform.

### Acceptance criteria <!-- sdd:acceptance -->

- Line endings and Unicode are normalized.
- Markdown is parsed to an AST rather than interpreted with regular
  expressions alone.
- Unknown or duplicate machine markers block validation.
- Object ordering is deterministic.
