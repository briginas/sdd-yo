---
sdd:
  type: concept
  id: CON-90AFB19E
---

# Test Adapter

## Definition <!-- sdd:definition -->

A Test Adapter converts a project-specific test framework, JUnit report, or
JSONL artifact into a language-independent index of suites, tests, hierarchy,
source locations, and execution results.

## Identity <!-- sdd:identity -->

An adapter is identified within one SDD Project by a configured adapter ID. Its
effective identity also includes type, normalized command or report
configuration, and protocol schema version.

## States <!-- sdd:states -->

- `available`
- `failed`
- `stale`

## Relations <!-- sdd:relations -->

- relates-to: [CON-EA57C937 — SDD Project](sdd-project.md)
- relates-to: [CON-9F69CC0E — Requirement](requirement.md)
- relates-to: [CON-4365C0F6 — Evidence](evidence.md)

## Rationale <!-- sdd:rationale -->

Adapters keep the SDD Yo core language- and framework-independent while
preventing comments or unrelated source strings from masquerading as named
test coverage.
