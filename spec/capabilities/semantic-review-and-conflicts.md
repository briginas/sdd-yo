---
sdd:
  type: capability
  id: CAP-F31EF876
---

# Semantic review and conflict analysis

## Purpose <!-- sdd:purpose -->

Surface likely quality and semantic compatibility problems while reserving
final judgment for authorized humans.

<a id="req-dff6bfa6"></a>

## REQ-DFF6BFA6 — Generate deterministic conflict candidates

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

The core shall generate semantic review candidates from overlapping object
changes, shared Concepts, Requirement dependencies, deletion conflicts, and
incompatible graph operations.

### Acceptance criteria <!-- sdd:acceptance -->

- Candidate generation is deterministic.
- Textually separate changes may still become candidates.
- Candidate generation does not declare semantic conflict by itself.

<a id="req-04f23007"></a>

## REQ-04F23007 — Limit semantic analysis context

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

Semantic analysis shall receive only changed objects, candidate related
objects, relevant Concept definitions, dependencies, and normative sections.

### Acceptance criteria <!-- sdd:acceptance -->

- Whole-repository context is not attached by default.
- Input object and section IDs are recorded.
- Input content is bound by a fingerprint.

<a id="req-b5815bb5"></a>

## REQ-B5815BB5 — Expand impact from changed Concepts

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)

### Statement <!-- sdd:statement -->

A semantic Domain Concept change shall add every directly referring
Requirement and its transitive dependents to semantic review and verification
scope.

### Acceptance criteria <!-- sdd:acceptance -->

- Concept definition, identity, state vocabulary, and semantic relations
  participate in impact analysis.
- Rationale, examples, and formatting do not expand impact.
