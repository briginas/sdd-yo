---
sdd:
  type: concept
  id: CON-FC16381E
---

# Fingerprint

## Definition <!-- sdd:definition -->

A Fingerprint is a SHA-256 digest of a versioned canonical JSON representation
of a specification object, change delta, configuration, test index, or
evidence input.

## Identity <!-- sdd:identity -->

Fingerprint identity includes its algorithm, canonicalization schema version,
and digest value.

## Relations <!-- sdd:relations -->

- relates-to: [CON-9F69CC0E — Requirement](requirement.md)
- relates-to: [CON-88F1C731 — Domain Concept](domain-concept.md)
- relates-to: [CON-3E620A28 — Change](change.md)
- relates-to: [CON-4365C0F6 — Evidence](evidence.md)

## Rationale <!-- sdd:rationale -->

Canonical fingerprints bind approvals and evidence to meaning while avoiding
invalidations caused only by formatting or file movement.
