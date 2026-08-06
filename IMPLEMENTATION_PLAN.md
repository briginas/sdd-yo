# SDD Yo implementation plan

## Status

- State: awaiting next milestone selection
- Current phase: post-Milestone 11 candidate selection
- Current leaf: none selected
- Last updated: 2026-08-06

## Source-of-truth map

- Canonical product behavior: [`spec/README.md`](spec/README.md)
- Architecture: [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Plan index and completed history: [`plans/README.md`](plans/README.md)
- Completed Milestones 0–11:
  [`plans/completed/milestones-0-9.md`](plans/completed/milestones-0-9.md),
  [`plans/completed/milestone-10-self-bootstrap-retirement.md`](plans/completed/milestone-10-self-bootstrap-retirement.md),
  and
  [`plans/completed/milestone-11-private-installation-and-onboarding.md`](plans/completed/milestone-11-private-installation-and-onboarding.md)
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

- Milestones 0–11 and the incremental self-bootstrap MVP are complete. Their
  exact execution records are indexed under [`plans/completed/`](plans/README.md).
- The deterministic version 1 library, CLI, artifact schemas, proposal and exact
  patch workflow, evidence composition, findings validation, merge readiness,
  and enforced governed-scope integration are implemented and verified.
- The optional repository-scoped `sdd-yo` Skill routes the implemented workflow
  through compatible CLI JSON and preserves human evidence, permission, and
  Git side-effect boundaries.
- Private `sdd-yo@0.1.0` local-tarball onboarding now includes stable help and
  compatibility identity, exact offline package contents, explicit repository
  Skill installation/update/removal, the root quickstart, diagnostic recovery,
  and an isolated npm consumer for Yarn Plug'n'Play repositories.
- The source repository and npm package remain private. No registry,
  marketplace, provenance, cross-platform onboarding-study, human QA, or
  whole-project completeness claim is implied by Milestone 11 completion.
- New product behavior uses a normal bounded `spec-code`, `spec`, or `code`
  Change. Completed bootstrap history grants no alternate specification-write
  or ID-reservation route.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Candidate backlog

These candidates are not implied work. Select exactly one bounded milestone and
obtain any necessary human authorization before implementation:

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
- Automatic branch, commit, push, merge, approval, or QA actions.
- Cross-project graph relations.
- Implementation-file links in canonical Requirements.
- Detection of code behavior changes whose author did not update the spec.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.

## Immediate next leaf

No Milestone 12 or implementation leaf is selected. The next planning action is
to choose exactly one candidate above, define its bounded objective,
Requirements, exclusions, and validation, and wait for explicit approval before
editing product behavior.
