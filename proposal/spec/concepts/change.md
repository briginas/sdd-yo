---
sdd:
  type: concept
  id: CON-3E620A28
---

# Change

## Definition <!-- sdd:definition -->

A Change is a temporary workflow object that brings the product specification
and implementation into an approved synchronized state.

## Identity <!-- sdd:identity -->

A Change is identified by external workflow state and its project, mode, Git
references, and approved fingerprints. It is not a permanent canonical
specification object.

## States <!-- sdd:states -->

The supported modes are:

- `spec-code`: both product contract and observable implementation behavior
  change.
- `spec`: the contract changes to describe already existing, explicitly
  accepted behavior.
- `code`: implementation behavior changes to conform to an unchanged active
  contract.

Workflow progress is represented by proposal, preparation, verification, and
merge gates rather than by a hidden CLI state machine.

## Relations <!-- sdd:relations -->

- relates-to: [CON-EA57C937 — SDD Project](sdd-project.md)
- relates-to: [CON-FC16381E — Fingerprint](fingerprint.md)
- relates-to: [CON-4365C0F6 — Evidence](evidence.md)
- relates-to: [CON-E2F84A01 — Finding](finding.md)

## Rationale <!-- sdd:rationale -->

Changes are transient because Git preserves history while the integration
branch specification contains only current implemented behavior.

