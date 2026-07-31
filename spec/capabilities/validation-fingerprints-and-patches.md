---
sdd:
  type: capability
  id: CAP-E309CBCB
---

# Validation, fingerprints, and exact patches

## Purpose <!-- sdd:purpose -->

Provide deterministic structural validation, stable meaning-aware
fingerprints, safe exact patch preparation, and reproducible Git comparison.

<a id="req-7d93d64a"></a>

## REQ-7D93D64A — Enforce mechanical graph invariants

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)
- refers-to: [CON-77D857DB — Document](../concepts/document.md)

### Statement <!-- sdd:statement -->

Validation shall reject malformed schemas, duplicate IDs, broken typed links,
invalid ownership, unreachable objects, invalid anchors, and unsupported
document or Requirement metadata.

### Acceptance criteria <!-- sdd:acceptance -->

- Diagnostics include stable code, severity, path, line, object ID when
  available, message, and remediation.
- The directed Requirement `depends-on` graph is acyclic.
- Mechanical validation does not claim to prove semantic atomicity or
  completeness.
- A CLI crash never produces a passing result.

<a id="req-1095e571"></a>

## REQ-1095E571 — Canonicalize objects before hashing

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

The CLI shall compute SHA-256 fingerprints from schema-versioned canonical JSON
derived from parsed Markdown AST content.

### Acceptance criteria <!-- sdd:acceptance -->

- Formatting, line endings, title, rationale, examples, and file movement do
  not change semantic fingerprints.
- Statement, acceptance, constraints, and semantic Concept definition changes
  do change semantic fingerprints.
- Unordered relation sets are sorted; ordered normative lists preserve order.

<a id="req-13cf54d6"></a>

## REQ-13CF54D6 — Resolve graph targets by stable identity

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

Validation and canonicalization shall resolve specification links to stable
object IDs rather than treating paths or display titles as semantic identity.

### Acceptance criteria <!-- sdd:acceptance -->

- Moving a file without changing target ID preserves semantic identity.
- Unknown or ambiguous targets make relevant fingerprints uncomputable.
- Paths remain validated for human navigation.

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
