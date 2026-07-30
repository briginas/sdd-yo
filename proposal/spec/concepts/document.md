---
sdd:
  type: concept
  id: CON-77D857DB
---

# Document

## Definition <!-- sdd:definition -->

A Document is a UTF-8 Markdown resource used to organize specification reading
for humans. A Document presents stable model objects but is not itself a stable
product object.

## Identity <!-- sdd:identity -->

A Document is addressed by its current repository-relative path. It has no
`CAP`, `REQ`, or `CON` identifier and may be moved, split, or combined without
changing product semantics.

## States <!-- sdd:states -->

- `index`
- `capability`
- `capability-fragment`
- `concept`

## Relations <!-- sdd:relations -->

- relates-to: [CON-2C550D5B — Capability](capability.md)
- relates-to: [CON-9F69CC0E — Requirement](requirement.md)
- relates-to: [CON-88F1C731 — Domain Concept](domain-concept.md)

## Rationale <!-- sdd:rationale -->

Separating human reading structure from semantic identity allows the
specification to evolve without ID churn.

