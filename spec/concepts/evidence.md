---
sdd:
  type: concept
  id: CON-4365C0F6
---

# Evidence

## Definition <!-- sdd:definition -->

Evidence is a temporary, schema-validated assertion from an allowed external
issuer about approval, test execution, QA, finding resolution, or governance.

## Identity <!-- sdd:identity -->

Evidence identity is determined by its kind, SDD Project, subject
fingerprints, Git references, issuer, and external evidence reference.

## States <!-- sdd:states -->

- `current`
- `stale`
- `contradictory`
- `failed`

These states are derived by validation and are not stored in the canonical
product specification.

## Relations <!-- sdd:relations -->

- relates-to: [CON-EA57C937 — SDD Project](sdd-project.md)
- relates-to: [CON-3E620A28 — Change](change.md)
- relates-to: [CON-FC16381E — Fingerprint](fingerprint.md)
- relates-to: [CON-E2F84A01 — Finding](finding.md)

## Rationale <!-- sdd:rationale -->

External evidence keeps the deterministic core provider-neutral and prevents
approval and QA workflow history from polluting canonical product knowledge.
