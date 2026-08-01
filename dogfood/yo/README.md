# `yo` dogfood study

## Status

- Study class: small single-language project with one test runner.
- Selected project: `/Users/dev.briginas/dev/yo`.
- SDD Project boundary: the `yo` repository as one independent project.
- Adoption mode: `incremental`.
- First Change mode: `spec`.
- First governed Capability: the completed approval-gated exact patch behavior.
- Onboarding status: incremental SDD Project initialized; first governed
  Capability not started.

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

## Initialization result

Milestone 7.1a used the locally built SDD Yo CLI on 2026-08-01:

```text
node dist/bin/sdd.js init \
  --root /Users/dev.briginas/dev/yo \
  --adoption incremental \
  --format json
```

- Result: `ok` with no diagnostics.
- Assigned project identity: `SDD-4A2395B6`.
- Created paths: `.sdd/config.yaml`, `spec/README.md`, `spec/capabilities`, and
  `spec/concepts`.
- Measured command time: 0.10 seconds real, 0.10 seconds user, and 0.01 seconds
  system on the local macOS host. This excludes the preceding local CLI build
  and is not yet the full setup-time metric.
- Existing tracked `yo` files were not modified, and the CLI created no branch
  or commit.
- `sdd validate --cwd /Users/dev.briginas/dev/yo --format json` returned `ok`,
  an empty valid graph, and complete history resolved at
  `d2dd21193155b236eeb6b0542b7c1b8e14dac439`.
- The unchanged `yo` runtime suite passed all 286 tests after initialization.
- `npm run format:check` did not pass: the project Prettier configuration
  rejected both generated files. This failure is recorded below and must not be
  reported as a passing project check.
- The generated configuration has no test adapters or allowed evidence issuers;
  those remain later explicit decisions.

### OBS-YO-001 — Project selector recovery is underspecified

During setup, an operator first attempted `sdd validate --project <path>`.
The CLI rejected the unsupported option with
`SDD_CONFIG_CLI_ARGUMENT_INVALID`, but its remediation only said to correct the
arguments. The documented selector is `--cwd`; the diagnostic did not name the
unknown option or the supported project selectors. Classify this as a
provisional recurring usability observation pending the other dogfood studies.

### OBS-YO-002 — Initialization output requires host formatting

After successful initialization and graph validation, the existing
`npm run format:check` command rejected `.sdd/config.yaml` and
`spec/README.md`. The generated YAML and frontmatter use SDD Yo's deterministic
two-space, double-quoted style, while the project's Prettier configuration
expects four-space indentation and single quotes. No existing tracked file was
affected, and all runtime tests passed, but the repository-wide formatting gate
is not green immediately after onboarding.

Milestone 7.1b resolved the project-local failure by formatting only the two
initialized files with the existing `yo` Prettier configuration. It changed no
formatter setting and excluded no SDD path. After formatting:

- `npm run format:check` passed;
- `sdd validate` returned the same `SDD-4A2395B6` identity, an empty valid
  graph, complete history, and no diagnostics;
- all 286 existing `yo` tests passed.

For `yo`, classify formatting as an expected post-init host-integration step,
not a reason to change the project's formatter or ignore SDD files. Formatting
must happen before decision-bearing proposal, approval, or exact-patch
artifacts are created because their tree or file hashes would otherwise become
stale. Keep the missing onboarding guidance as a provisional documentation
observation for comparison with later dogfood projects.

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
