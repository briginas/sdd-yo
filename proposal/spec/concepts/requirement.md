---
sdd:
  type: concept
  id: CON-9F69CC0E
---

# Requirement

## Definition <!-- sdd:definition -->

A Requirement is one atomic normative obligation of the product. It has a
stable identity, an explicit kind, a verification mode, a statement,
acceptance criteria, optional constraints, and active graph relations.

## Identity <!-- sdd:identity -->

A Requirement has one stable random `REQ-XXXXXXXX` identifier that is never
reused, including after the Requirement is removed from the active
specification.

## States <!-- sdd:states -->

Requirements do not store lifecycle status in canonical content. Presence in
the integration branch specification means active and implemented; additions,
changes, and removals in a feature branch are candidate changes.

## Relations <!-- sdd:relations -->

- relates-to: [CON-2C550D5B — Capability](capability.md)
- relates-to: [CON-88F1C731 — Domain Concept](domain-concept.md)
- relates-to: [CON-FC16381E — Fingerprint](fingerprint.md)
- relates-to: [CON-90AFB19E — Test Adapter](test-adapter.md)

## Rationale <!-- sdd:rationale -->

Atomic requirements make specification deltas, approvals, test traceability,
and semantic conflict reports addressable and reviewable.

