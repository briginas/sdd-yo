---
sdd:
  type: concept
  id: CON-B2000001
---

# Project

## Definition <!-- sdd:definition -->

A project is a governed collection of work and retained records.

## Identity <!-- sdd:identity -->

A project keeps the same identity while its lifecycle state changes.

## States <!-- sdd:states -->

- active
- inactive
- archived

## Relations <!-- sdd:relations -->

- relates-to: [CON-B2000002 — Operator](operator.md)

## Rationale <!-- sdd:rationale -->

One shared term avoids redefining project lifecycle semantics per Requirement.

## Examples <!-- sdd:examples -->

An internal migration project may move from active to archived.
