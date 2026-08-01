# `yo` dogfood study

## Status

- Study class: small single-language project with one test runner.
- Selected project: `/Users/dev.briginas/dev/yo`.
- SDD Project boundary: the `yo` repository as one independent project.
- Adoption mode: `incremental`.
- First Change mode: `spec`.
- First governed Capability: the completed approval-gated exact patch behavior.
- Onboarding status: not started.

The repository owner selected this study boundary on 2026-08-01. That planning
decision is not SDD ApprovalEvidence, QAEvidence, a gate result, or permission
to mutate `yo`. Each onboarding or product mutation remains a separately
approved bounded leaf.

## First-Change boundary

The first Change will describe explicitly accepted existing behavior without
changing observable `yo` behavior. It may add or rename only the tests needed
to establish traceability for the first Capability. It must not implement the
planned context-compaction or allowlisted-validation milestones in `yo`.

The study begins from the existing project structure. Production code and tests
must not be reorganized merely to accommodate SDD Yo. SDD Yo remains advisory:
its reports do not protect branches or authorize merges.

## Observation boundary

Record measured results and concrete examples here as the study progresses:

- elapsed time to initialize the SDD Project and define its first governed
  Capability;
- custom test-adapter work, including whether one is required;
- the count and percentage of existing tests whose normalized names need exact
  Requirement IDs;
- friction caused by Git history, repository layout, and project boundaries;
- useful, false-positive, and missed semantic review candidates;
- time and clarification needed for the author, developer, and QA roles to
  understand affected scope;
- diagnostics that do not give a clear recovery action;
- every output or explanation that could confuse governed scope with complete
  project coverage.

For each observation, record the command or workflow step, expected and actual
result, relevant stable diagnostic or artifact identity, measured effort, and
whether the issue appears project-specific or recurring. Do not store secrets,
OAuth material, unrestricted environment output, or fabricated human evidence.

## Success boundary

The `yo` study is complete only when one real Change is governed end to end
with understandable diagnostics and without adding TypeScript- or `node:test`-
specific behavior to the SDD Yo core. Completion requires an explicit review of
the recorded observations; a successful command demo alone is insufficient.
