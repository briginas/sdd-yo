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
- [`completed/self-bootstrap-procedure.md`](completed/self-bootstrap-procedure.md)
  — historical target-package route, temporary ID-reservation rules, incremental
  promotion procedure, validation levels, and exit criteria retired by
  Milestone 10.
- [`completed/milestone-10-self-bootstrap-retirement.md`](completed/milestone-10-self-bootstrap-retirement.md)
  — completed retirement inventory, disposition tables, contract-oracle
  coverage handoff, execution evidence, exclusions, and closeout result.
- [`completed/milestone-11-private-installation-and-onboarding.md`](completed/milestone-11-private-installation-and-onboarding.md)
  — completed private tarball, compatibility identity, repository Skill
  lifecycle, npm and Yarn Plug'n'Play quickstart, validation evidence, and the
  explicit withdrawal record for the former cross-platform study leaf.
- [`completed/milestone-12-explicit-human-approval-evidence-recording.md`](completed/milestone-12-explicit-human-approval-evidence-recording.md)
  — completed explicit approval/rejection recording, approval-gated Skill
  orchestration, identified human Skill review, full validation, and closeout
  evidence.
- [`completed/milestone-13-pre-id-semantic-model-confirmation.md`](completed/milestone-13-pre-id-semantic-model-confirmation.md)
  — completed pre-ID semantic-model confirmation, exact specification patch,
  Skill orchestration/evals, identified verdict, replacement private package,
  validation evidence, and closeout.
- [`completed/milestone-14-remove-configured-evidence-issuer-allowlists.md`](completed/milestone-14-remove-configured-evidence-issuer-allowlists.md)
  — completed issuer-policy removal, exact approved specification patch,
  configuration break, private package version update, validation evidence,
  and closeout.
- [`completed/milestone-15-semantic-spec-patch-confirmation.md`](completed/milestone-15-semantic-spec-patch-confirmation.md)
  — completed semantic SpecPatch confirmation, human Skill review, validation,
  and closeout.
- [`completed/milestone-16-public-github-source-readiness.md`](completed/milestone-16-public-github-source-readiness.md)
  — completed public-source transition, private package-distribution boundary,
  public repository baseline, security-control decisions, and closeout.

Completed plans are historical records. Use the current canonical
[`../spec/README.md`](../spec/README.md), architecture
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

## Milestone closeout contract

Close one milestone before beginning the next:

1. Confirm every leaf and the milestone done condition are complete and bind
   each validation or human decision to its current subject. An unavailable,
   failed, incomplete, or stale check cannot support closeout.
2. Move the milestone's exact execution record out of
   `../IMPLEMENTATION_PLAN.md` into
   `completed/milestone-<number>-<short-slug>.md`. The existing combined
   `completed/milestones-0-9.md` remains a historical exception; new milestones
   use one file each.
3. Preserve the objective, leaves, done condition, Requirement IDs, decisions,
   exclusions, deferred or rejected items, evidence paths, validation results,
   and retained run or commit identifiers. Do not reconstruct missing evidence
   or measurements.
4. Add the completed file to this index, retain deferred scope and candidate
   follow-ups in the active plan, and compact `../IMPLEMENTATION_PLAN.md` so it
   contains the next current milestone and immediate leaf rather than a second
   editable copy of completed execution history.
5. Check local links, retained anchors and identifiers, Markdown formatting,
   trailing whitespace, unresolved TODO markers, and `git diff --check`; inspect
   the exact closeout diff before any separately authorized commit.

Perform the archive, index update, and active-plan compaction as one
repository-maintenance change. Closeout creates no product Requirement, runtime
behavior, approval, QA decision, or Git authority.
