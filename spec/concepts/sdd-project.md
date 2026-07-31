---
sdd:
  type: concept
  id: CON-EA57C937
---

# SDD Project

## Definition <!-- sdd:definition -->

An SDD Project is one independently governed specification graph rooted at one
`.sdd/config.yaml`. It occupies a configured scope inside a Git repository and
owns its product specification, identifier namespace, test adapters, and
governance configuration.

## Identity <!-- sdd:identity -->

An SDD Project is identified by one stable `SDD-XXXXXXXX` value stored in its
configuration. Moving the project directory does not change this identity.

## States <!-- sdd:states -->

- `incremental`: only capabilities present in the integration branch
  specification are governed.
- `complete`: a human-approved governance decision asserts that the declared
  project scope is fully modeled.

## Relations <!-- sdd:relations -->

- relates-to: [CON-77D857DB — Document](document.md)
- relates-to: [CON-3E620A28 — Change](change.md)
- relates-to: [CON-90AFB19E — Test Adapter](test-adapter.md)

## Rationale <!-- sdd:rationale -->

Configuration-based identity lets a monorepo contain multiple independent SDD
Projects without coupling product identity to a mutable path.
