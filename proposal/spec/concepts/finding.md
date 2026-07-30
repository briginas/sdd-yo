---
sdd:
  type: concept
  id: CON-E2F84A01
---

# Finding

## Definition <!-- sdd:definition -->

A Finding is a temporary, evidence-backed concern about specification quality,
semantic compatibility, structural integrity, security, or workflow
readiness.

## Identity <!-- sdd:identity -->

A model-assisted Finding has a deterministic ID derived from analyzer type and
version, affected object and section IDs, and input fingerprints. Mechanical
diagnostics use stable diagnostic codes.

## States <!-- sdd:states -->

- `open`
- `dismissed`
- `waived` for eligible quality findings only
- `confirmed`

A changed input invalidates the prior resolution rather than creating a
permanent resolved state.

## Relations <!-- sdd:relations -->

- relates-to: [CON-3E620A28 — Change](change.md)
- relates-to: [CON-4365C0F6 — Evidence](evidence.md)
- relates-to: [CON-FC16381E — Fingerprint](fingerprint.md)

## Rationale <!-- sdd:rationale -->

Findings surface judgment without delegating final semantic authority to a
model.

