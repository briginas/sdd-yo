# SDD Yo implementation plan

## Status

- State: Milestones 0–15 complete; Milestone 16 active
- Current phase: Public repository documentation and contribution baseline
- Current leaf: 16.2 — awaiting license and retained-evidence decisions
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
  [`plans/completed/milestone-14-remove-configured-evidence-issuer-allowlists.md`](plans/completed/milestone-14-remove-configured-evidence-issuer-allowlists.md),
  and [`plans/completed/milestone-15-semantic-spec-patch-confirmation.md`](plans/completed/milestone-15-semantic-spec-patch-confirmation.md)
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

- Milestones 0–15 and the incremental self-bootstrap MVP are complete. Their
  exact execution records are indexed under [`plans/completed/`](plans/README.md).
- Milestone 13 added the explicit ID-free semantic-model checkpoint before
  new specification identities for `spec` and `spec-code`, while preserving
  the `code` bypass and downstream authority boundaries.
- Milestone 14 removed configured evidence issuer membership policy, retained
  issuer text as untrusted provenance, and updated the private package identity
  to `0.2.0`. Its exact governed subject and validation evidence are archived.
- Milestone 15 is complete; its execution record is archived at
  [`plans/completed/milestone-15-semantic-spec-patch-confirmation.md`](plans/completed/milestone-15-semantic-spec-patch-confirmation.md).
- Milestone 16 is selected to prepare the existing GitHub repository for public
  source visibility while preserving private npm-package distribution and the
  existing product behavior.
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

## Active milestone

### Milestone 16 — Public GitHub source readiness

Prepare the existing GitHub repository for a deliberate private-to-public
visibility change without publishing the npm package or changing implemented
product behavior.

- [x] **16.1 — Exposure audit and immediate safety remediation.** Inspect the
      tracked tree, reachable Git history, GitHub Actions logs, repository settings,
      and current dependency advisories. Prevent accidental package-tarball commits
      and apply only compatible lockfile remediation for confirmed advisories.
      Retain exact commands and findings in the handoff. Exclude licensing,
      contributor/community policy, personal-evidence redaction, history rewriting,
      routine CI expansion, repository visibility/settings changes, commit, push,
      public npm publication, and marketplace publication.
- [ ] **16.2 — Public repository documentation and contribution baseline.** Make
      the source/package visibility distinction explicit, add repository metadata,
      contributor and security guidance, a human-selected license and conduct
      policy, and routine pull-request validation. Resolve the intended treatment
      of identified human evidence and local absolute paths before changing those
      retained artifacts.
- [ ] **16.3 — Public transition handoff.** Run the repository validation suite,
      inspect the final public surface, record the exact visibility consequences and
      post-transition security/ruleset checklist, and obtain separate authorization
      for any commit, push, history rewrite, GitHub metadata mutation, or visibility
      change. Do not publish the npm package or Codex plugin.

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

Begin 16.2 only after the human selects a source license and decides whether
identified human-review evidence and local absolute paths remain intentionally
public. Keep any history rewrite and remote GitHub mutation separately
authorized.
