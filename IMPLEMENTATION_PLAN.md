# SDD Yo implementation plan

## Status

- State: Milestones 0–14 complete; Milestone 15 active
- Current phase: Govern the bounded semantic-confirmation behavior change
- Current leaf: 15.2 — implement progressive disclosure
- Last updated: 2026-08-07

## Source-of-truth map

- Canonical product behavior: [`spec/README.md`](spec/README.md)
- Architecture: [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Plan index and completed history: [`plans/README.md`](plans/README.md)
- Completed execution records:
  [`plans/completed/milestones-0-9.md`](plans/completed/milestones-0-9.md),
  [`plans/completed/milestone-10-self-bootstrap-retirement.md`](plans/completed/milestone-10-self-bootstrap-retirement.md),
  [`plans/completed/milestone-11-private-installation-and-onboarding.md`](plans/completed/milestone-11-private-installation-and-onboarding.md),
  [`plans/completed/milestone-12-explicit-human-approval-evidence-recording.md`](plans/completed/milestone-12-explicit-human-approval-evidence-recording.md),
  [`plans/completed/milestone-13-pre-id-semantic-model-confirmation.md`](plans/completed/milestone-13-pre-id-semantic-model-confirmation.md),
  and [`plans/completed/milestone-14-remove-configured-evidence-issuer-allowlists.md`](plans/completed/milestone-14-remove-configured-evidence-issuer-allowlists.md)
- Historical bootstrap procedure:
  [`plans/completed/self-bootstrap-procedure.md`](plans/completed/self-bootstrap-procedure.md)

Read a completed plan only when a task needs historical rationale, exact
milestone boundaries, Requirement traceability, decisions, exclusions, or
retained evidence pointers. Current specification, architecture,
implementation, and evidence outrank historical plans.

## Objective

Deliver an offline-first, repository-native SDD governance system with a
deterministic TypeScript library, the `sdd` CLI and versioned JSON protocols,
language-independent test adapters, exact approval-bound workflow artifacts,
and the optional progressive-disclosure `sdd-yo` Agent Skill.

## Current state

- Milestones 0–14 and the incremental self-bootstrap MVP are complete. Their
  exact execution records are indexed under [`plans/completed/`](plans/README.md).
- Milestone 13 added the explicit ID-free semantic-model checkpoint before
  new specification identities for `spec` and `spec-code`, while preserving
  the `code` bypass and downstream authority boundaries.
- Milestone 14 removed configured evidence issuer membership policy, retained
  issuer text as untrusted provenance, and updated the private package identity
  to `0.2.0`. Its exact governed subject and validation evidence are archived.
- Milestone 15 is selected to replace technical SpecPatch confirmation output
  with a short semantic description of the behavior change and its consequence,
  while preserving the exact deterministic artifact and application boundary.
- The deterministic version 1 library, CLI, artifact schemas, proposal and exact
  patch workflow, evidence composition, findings validation, merge readiness,
  enforced governed-scope integration, and explicit approval-gated Skill route
  are implemented and verified.
- Milestone 12 retained the identified human approval-recording Skill verdict,
  full validation results, and closeout evidence under
  [`plans/completed/milestone-12-explicit-human-approval-evidence-recording.md`](plans/completed/milestone-12-explicit-human-approval-evidence-recording.md).
- Private `sdd-yo@0.2.0` local-tarball onboarding remains private and offline;
  no registry, marketplace, provenance, cross-platform onboarding-study, or
  whole-project completeness claim is implied.
- New product behavior uses a normal bounded `spec-code`, `spec`, or `code`
  Change. Completed bootstrap history grants no alternate specification-write
  or ID-reservation route.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Milestone 15 — Semantic SpecPatch confirmation

### Objective

Change the progressive-disclosure Skill so that, before exact SpecPatch
application, the user sees only a short semantic description of what behavior
will change and what that change will cause. Apply the same disclosure rule to
the success response after application.

The exact SpecPatch remains the deterministic object used for validation and
application. Its patch body, file paths, operations, diff, hashes,
fingerprints, conflicts, and unchanged scope are not displayed by default;
they are shown only when the user explicitly asks for technical details.

### Requirement traceability

- `REQ-26234DC8` — extend the progressive-disclosure Skill contract with the
  semantic SpecPatch confirmation and post-application presentation behavior.
- `CAP-404305F6` — retain the owning multi-project CLI and Skill integration
  boundary.

No new Requirement identity is expected unless candidate preparation shows
that modifying `REQ-26234DC8` would make its meaning ambiguous or overloaded.
Any such ambiguity stops 15.1 for explicit human resolution.

### Decision comments

- The default confirmation contains one to three short points: the behavior
  that changes, its user-visible or governance consequence, and a direct
  question asking whether to apply the prepared change.
- The summary is derived from the confirmed semantic model and the validated
  normative base-to-candidate delta. If those inputs do not support one clear
  summary, the Skill asks for clarification instead of inventing intent.
- Technical details remain available from the retained SpecPatch on explicit
  request. Viewing them does not itself authorize application; the user must
  still separately confirm application.
- The presentation change does not weaken preparation, revalidation, exact
  patch identity, base-tree matching, or atomic application. It changes only
  what the Skill shows by default.
- Preparation failures and non-`ok` statuses are described concisely in terms
  of the blocking outcome and required next decision. Raw diagnostics,
  conflicts, paths, hashes, and fingerprints remain opt-in details.
- The SpecPatch that introduces the canonical Milestone 15 requirement is
  governed under the pre-Milestone 15 presentation contract. The new
  presentation becomes authoritative only after that exact specification
  patch is applied and the Skill implementation is updated and verified.

### Execution leaves

#### 15.1 — Govern the presentation behavior

- Prepare one bounded normal `spec-code` candidate modifying
  `REQ-26234DC8`, after the required ID-free semantic-model confirmation.
- Validate the ProposalPackage, obtain explicit subject-bound human
  ApprovalEvidence, prepare the exact SpecPatch, and apply it only after a
  separate explicit selection.
- Do not treat proposal validation, semantic-model confirmation, approval
  recording, or preparation as patch-application authorization.

Completed 2026-08-07. The approved exact SpecPatch modified only
`REQ-26234DC8`; retained ProposalPackage, ApprovalEvidence, preparation result,
and patch artifacts are under ignored `.sdd/staging/milestone-15.1/`.

#### 15.2 — Implement progressive disclosure

- Update the main Skill workflow and its branch-preparation reference so the
  pre-application prompt and successful post-application response use the
  concise semantic presentation by default.
- Preserve exact compatible CLI JSON and SpecPatch artifacts internally; do
  not change CLI commands, versioned schemas, deterministic result objects, or
  public TypeScript interfaces.
- Add the explicit technical-details route without making it an application
  confirmation or allowing partial, edited, fuzzy, forced, or stale patches.
- Refresh the Skill payload manifest for every changed packaged Skill file.

#### 15.3 — Verify the user-facing boundary

- Add Requirement-named static checks that the default confirmation and
  success response do not expose patch content, paths, operations, diffs,
  hashes, fingerprints, conflicts, or unchanged-scope lists.
- Add a successful preparation eval proving that the user receives only the
  short behavior-and-consequence summary before the application question.
- Add an explicit-details eval proving that technical data is available only
  on request and that viewing it does not authorize application.
- Cover concise blocked and review-required presentation without weakening the
  deterministic stop conditions.
- Retain an identified human Skill-review verdict for the manual acceptance of
  `REQ-26234DC8`.

#### 15.4 — Validate and close out

- Run focused Skill and Skill-eval tests, then `npm test`,
  `npm run test:package`, `npm run check:schemas`, `npm run build`,
  `npm run typecheck`, `npm run format:check`,
  `npm run verify:contracts`, and `git diff --check`.
- After every gate and the identified human verdict pass, archive the exact
  Milestone 15 execution record, update `plans/README.md`, and compact this
  active plan.

### Exclusions

- No CLI, JSON schema, artifact-version, configuration, or package-version
  change.
- No automatic interpretation of arbitrary patch bytes as product intent.
- No weakening of exact-patch preparation or application safety.
- No implied branch, commit, merge, push, publication, installation, approval,
  QA, review, or finding-resolution authority.
- No Milestone 15 implementation work before the 15.1 normative Change is
  approved and applied.

## Candidate backlog

These remaining candidates are not implied work. Select one only after the
active plan is explicitly extended or superseded, then obtain any necessary
human authorization before implementation:

- baseline the already implemented adoption semantics recorded by completed
  Milestone 10 through one bounded normal `spec` Change with fresh IDs:
  incremental adoption, canonical governed scope, explicit governance
  transition, and accepted existing-behavior baseline;
- baseline the already implemented qualitative synchronization-mode and
  four-gate semantics recorded by completed Milestone 10 through one or more
  bounded normal `spec` Changes with fresh IDs;
- baseline the already implemented inactive-object, generic JSONL adapter,
  semantic-completeness, and per-project isolation semantics recorded by
  completed Milestone 10 through independently reviewable normal `spec`
  Changes with fresh IDs;
- consider repository-local normative authority and external-link quality
  findings as a new behavior candidate; completed Milestone 10 found no
  complete implementation evidence for that former proposal meaning;
- publish through a private organization registry if distribution needs
  outgrow local tarballs; this requires a scoped package and an explicit
  decision to replace `"private": true` with registry-constrained publication
  metadata;
- publish to the public npm registry only after an explicit source-visibility,
  package-access, release-security, and provenance decision;
- package and distribute `sdd-yo` as an installable Codex plugin through a
  local, team, or public marketplace, with its released CLI dependency and
  compatibility boundary explicit;
- add alternative distribution channels such as standalone signed
  executables, Homebrew, Scoop, or an organization-managed installer if the
  Node.js/npm prerequisite becomes a material adoption barrier;
- add organization-wide Skill deployment or administrative policy integration
  only through a separately bounded milestone.

## Deferred scope

- Post-MVP existing-monorepo onboarding and project/evidence-isolation rollout
  study; its isolation, cross-project, and broader monorepo guarantees must not
  be inferred from completed local onboarding work.
- Contract-fixture verifier execution on Linux and Windows CI.
- Hosted workflow service or durable workflow database.
- Automatic branch, commit, push, merge, approval decisions, or QA decisions.
- Cross-project graph relations.
- Implementation-file links in canonical Requirements.
- Detection of code behavior changes whose author did not update the spec.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.

## Immediate next leaf

Execute 15.2 only: update the packaged Skill's default pre-application and
successful post-application presentation to satisfy `REQ-26234DC8`. Preserve
the exact CLI artifacts and safety boundaries; do not begin eval or human-review
work before the implementation slice is complete.
