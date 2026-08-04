# SDD Yo execution plans

This directory keeps execution history discoverable without loading completed
work into every planning or implementation task.

## Active plan

The current milestone, immediate leaf, deferred scope, and candidate backlog
remain in [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md).

## Completed plans

- [`completed/milestones-0-9.md`](completed/milestones-0-9.md) — preserved
  bootstrap-through-MVP execution record, including Requirement traceability,
  decisions, exclusions, evidence links, and completion notes.

Completed plans are historical records. Use the current canonical
[`../spec/README.md`](../spec/README.md), target
[`../proposal/spec/README.md`](../proposal/spec/README.md), architecture
[`../proposal/architecture/README.md`](../proposal/architecture/README.md), and
active plan for current behavior and next work. Load a completed plan only when
the task needs its historical rationale, exact milestone boundary, or evidence
pointer.

## Maintenance rules

- Move a milestone here only after every leaf and its milestone done condition
  are complete.
- Preserve exact Requirement IDs, decision records, exclusions, evidence paths,
  and retained run or commit identifiers.
- Keep deferred work and candidate follow-ups in the active plan until they are
  selected, rejected, or superseded.
- Never infer current product behavior from a completed plan when canonical
  specification or current implementation evidence is available.
