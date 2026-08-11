# SDD Yo implementation plan

## Status

- Active: Milestone 20.1 — make the repository workflow Skill-first without
  duplicating the Skill's operating sequence
- Complete: Milestones 0–19 and public `sdd-yo@0.5.0`
- Last updated: 2026-08-11

## Milestone 20 — Skill-first workflow ownership

Goal: make the packaged `sdd-yo` Skill the single agent-facing workflow while
retaining canonical product authority in `spec/`, deterministic authority in
the CLI, and repository-specific development discipline in `AGENTS.md`.

### 20.1 — Remove duplicated repository workflow

- In `AGENTS.md`, require requests covered by `sdd-yo` to load the available
  compatible Skill first, let it select the route and progressive references,
  and then read only the relevant repository source-of-truth slice.
- In `proposal/architecture/skill.md`, replace the duplicated Skill package
  inventory, intent table, and operating sequence with checked links and a
  concise ownership boundary.
- Preserve the separation between authoring, Proposal Gate, approval,
  preparation or application, and verification routes.
- Treat this as repository maintenance outside `spec-code`, `spec`, and `code`:
  no Requirement IDs or canonical specification candidate are required because
  normative and observable product behavior remain unchanged.

Excludes changes to canonical `spec/`, the `skills/sdd-yo` payload, CLI,
schemas, runtime, tests, package identity, installed Skills, publication, and
Git history or remote state.

Done when the remaining duplicated workflow is absent, retained architecture
and authority boundaries are still explicit, local Skill links resolve,
`npm run format:check`, `npm run verify:contracts`, and `git diff --check` pass,
and the exact final diff is reviewed. Closeout compacts this plan to the next
active state and does not authorize a commit or push.

## Authority and navigation

- Implemented product behavior: [`spec/README.md`](spec/README.md)
- Architecture and implementation boundaries:
  [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Execution-planning and closeout procedure:
  [`plans/README.md`](plans/README.md)
- Repository work discipline and validation: [`AGENTS.md`](AGENTS.md)

## Product baseline

SDD Yo is an offline-first, repository-native specification-governance system:
a deterministic TypeScript library, the `sdd` CLI and versioned JSON protocols,
language-independent test adapters, exact approval-bound workflow artifacts,
and an optional progressive-disclosure `sdd-yo` Agent Skill.

The version 1 library, CLI, schemas, proposal and exact-patch workflow, evidence
composition, findings validation, merge readiness, governed-scope integration,
repository-scoped Skill route, and macOS user-scoped Skill with a bound private
CLI are implemented and verified. Normal `spec-code` and `spec` Changes retain
one candidate-and-package bundle, while `code` retains one package-only bundle
and performs no specification-patch ceremony. Proposal validation, approval
recording, preparation, and merge checks consume the exact retained bundle;
superseded `0.4.x` handoff routes are absent.

Exact `sdd-yo@0.5.0` is public on npm from annotated tag `v0.5.0`. Its registry
tarball matches the retained reviewed artifact with SHA-256
`9999ad5cfaf4e5c594222213854ddddf1e4620a6cf9d2f8972927426c68110e9`,
inventory SHA-256
`db26f2f8520dee2e2717039e771ddd666b11edeaf9814fd77676b4b09c1f646d`,
and 2,138 entries. The public package, CLI identity, library, schemas,
repository Skill, and macOS user-scoped private CLI and wrapper are verified.

## Candidate backlog

No candidate is selected. Possible future milestones remain deliberately
uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
