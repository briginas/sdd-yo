# `pi` dogfood study

## Status

- Study class: existing multi-framework project.
- Selected project: `/Users/dev.briginas/dev/pi`.
- Selection baseline: clean `main` worktree at
  `85f89db9bcf4104b1e207ddb6f787bc5a4b631ce`.
- SDD Project boundary: the complete `pi` repository as one independent
  project.
- Adoption mode: `incremental`.
- First Change mode: `spec`.
- First governed Capability: existing user-prompt acquisition across the
  coding-agent CLI and terminal input components.
- Onboarding status: selected and bounded; not initialized.

The repository is an npm workspace containing several packages, but this study
treats the complete repository as one SDD Project because its packages share
one Git history, root configuration, dependency lock, and root test workflow.
That choice does not satisfy Milestone 7.3: the later monorepo study still
requires two independently configured SDD Projects and explicit project and
evidence isolation.

The user selected this study boundary on 2026-08-02. This planning decision is
not permission to mutate `pi`, ApprovalEvidence, QAEvidence, a gate result, or
acceptance of the proposed baseline specification. Initialization and every
later mutation remain separately approved bounded leaves.

## Selection evidence

The existing package scripts establish the multi-framework boundary without a
custom SDD adapter or a language-specific core change:

- `packages/agent`, `packages/ai`, and `packages/coding-agent` use Vitest;
- `packages/tui` uses the Node.js test runner;
- the root `test` script delegates to package test scripts, while the repository
  instructions require `./test.sh` for the safe non-e2e project test workflow.

The repository is TypeScript rather than polyglot. Milestone 7.2 accepts either
a polyglot or a multi-framework project, so the independent Vitest and
`node:test` producers are the characteristic under study.

## First-Change boundary

The first `spec` Change will baseline accepted existing behavior for acquiring
one user prompt without changing observable runtime behavior. Its bounded
subject is the path from terminal or CLI input to the exact prompt value made
available to the coding-agent session:

- terminal input submits the edited value through the configured submit action
  without silently dropping ordinary input characters;
- piped standard input, file text, and the first CLI message are combined in
  their defined order to form the initial prompt;
- remaining CLI messages stay available as later prompts rather than being
  absorbed into the initial prompt.

The clarification leaf must turn this boundary into the smallest accepted
Requirement set before any SDD object or stable ID is created. It must confirm
that these behaviors are product commitments rather than merely current
implementation details.

The initial test anchors are:

- Vitest: `packages/coding-agent/test/initial-message.test.ts`;
- `node:test`: `packages/tui/test/input.test.ts` and only the directly relevant
  submission cases in `packages/tui/test/editor.test.ts` if clarification shows
  they verify the accepted boundary.

These paths are candidates, not a traceability claim. The clarification leaf
must inspect normalized report names and select exact tests or ancestor suites
before names receive Requirement IDs. It must not broaden the Capability to
general editor behavior, rendering, model execution, tool execution, session
persistence, or provider transport.

## Adapter and evidence boundary

The first Change is expected to configure two required JUnit adapters with
distinct report paths and names: one report produced by Vitest for the affected
coding-agent surface and one produced by `node:test` for the TUI surface. The
clarification leaf must first prove that both current producers yield stable,
importable normalized names. If either producer cannot supply adequate JUnit,
the result is an explicit adapter decision; it does not authorize framework
logic in SDD Yo or guessed traceability.

The future project configuration may allow these local issuer names:

- `local-product-review` for an actual Spec Approver decision;
- `local-test-run` for current full-suite TestExecutionEvidence;
- `local-qa` for an actual QA decision over the governed Capability.

The allowlist will not authenticate an actor or create evidence. Approval, test
execution evidence, QA evidence, and later gate inputs must bind the exact `pi`
project, commits, configuration, TestIndex, and proposal subjects. No live model
provider, credential, network request, paid request, release action, or e2e test
requiring external services belongs to this baseline.

## Observation boundary

Record the same measurements as the `yo` study, separated by test framework
where that distinction matters:

- elapsed time to initialize the SDD Project and define its first governed
  Capability;
- adapter effort and import diagnostics for Vitest and `node:test`;
- the count and percentage of existing executable tests whose normalized names
  need exact Requirement IDs;
- friction caused by Git history, the workspace layout, and the single-project
  boundary;
- useful, false-positive, and missed semantic review candidates;
- time and clarification needed for author, developer, and QA understanding of
  affected scope;
- diagnostics without a clear recovery action;
- output that could confuse the first governed Capability with whole-repository
  completeness.

Explicitly compare whether `OBS-YO-001`, `OBS-YO-004`, `OBS-YO-005`, and
`OBS-YO-006` recur. Do not fix a repeated issue during this study; Milestones
7.4 and 7.5 own cross-study synthesis and separately bounded fixes.

For each observation, retain the command or workflow step, expected and actual
result, stable diagnostic or artifact identity, measured effort, framework if
applicable, and provisional project-specific or recurring classification. Do
not store secrets, provider credentials, unrestricted environment output, or
fabricated human evidence.

## Next bounded leaf

Milestone 7.2b may initialize the repository as the selected empty incremental
SDD Project, then measure host formatting and empty-graph validation. It must
not define the first Capability, rename tests, run provider-dependent or e2e
tests, create evidence, or execute Proposal, Verification, or Merge gates.
