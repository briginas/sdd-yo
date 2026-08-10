# SDD Yo execution planning

The current milestone, immediate leaf, deferred scope, and candidate backlog
remain in [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md). Implemented
product behavior belongs in [`../spec/README.md`](../spec/README.md), and current
implementation boundaries belong in
[`../proposal/architecture/README.md`](../proposal/architecture/README.md).

Completed execution plans are not retained as a second documentation archive.
Git history provides historical milestone detail. Current behavior, decisions,
limitations, and deferred work must remain discoverable from the canonical
documents and active plan without consulting that history.

## Milestone closeout contract

Close one milestone before beginning the next:

1. Confirm every leaf and the milestone done condition are complete and bind
   each validation or human decision to its current subject. An unavailable,
   failed, incomplete, or stale check cannot support closeout.
2. Update canonical specification, architecture, user documentation, and tests
   with every still-current behavior, boundary, supported environment, and
   limitation established by the milestone.
3. Retain deferred work and candidate follow-ups in the active plan until they
   are selected, rejected, or superseded. Do not retain obsolete execution
   steps, local artifact paths, run identifiers, or validation transcripts in a
   separate completed-plan archive; Git history is the historical record.
4. Compact `../IMPLEMENTATION_PLAN.md` so it contains the next current milestone
   and immediate leaf rather than completed execution detail.
5. Check local links, retained anchors and identifiers, Markdown formatting,
   trailing whitespace, unresolved TODO markers, and `git diff --check`; inspect
   the exact closeout diff before any separately authorized commit.

Perform the canonical-document updates and active-plan compaction as one
repository-maintenance change. Closeout creates no product Requirement, runtime
behavior, approval, QA decision, or Git authority.
