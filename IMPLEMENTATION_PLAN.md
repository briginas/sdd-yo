# SDD Yo implementation plan

## Status

- Active: Milestone 19.1 — Outcome selection and semantic boundary
- Complete: Milestones 0–18 and public `sdd-yo@0.4.1`
- Last updated: 2026-08-11

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
CLI are implemented and verified. Exact `sdd-yo@0.4.1` is public on npm with a
retained offline route. New behavior must use a bounded normal `spec-code`,
`spec`, or `code` Change; no alternate specification-write or ID-reservation
route exists.

## Milestone 19 — Next bounded product outcome

### 19.1 — Outcome selection and semantic boundary

- Inspect the live canonical graph, implementation, evidence, and retained
  backlog.
- Present exactly one bounded product outcome with affected Requirements,
  explicit exclusions, and proportionate validation.
- Stop for human selection before creating IDs, drafting a candidate, changing
  specification or code, mutating Git, or beginning release work.

Done when one outcome is explicitly selected and can be planned as a normal
Change without implying implementation authority.

## Candidate backlog

Not implied work; select only by explicitly extending or superseding this plan:

- Baseline already implemented adoption semantics through one normal `spec`
  Change: incremental adoption, governed scope, explicit governance transition,
  and accepted existing-behavior baseline.
- Baseline implemented qualitative synchronization-mode and four-gate semantics
  through one or more normal `spec` Changes.
- Baseline implemented inactive-object, generic JSONL adapter,
  semantic-completeness, and per-project isolation semantics through separate
  reviewable normal `spec` Changes.
- Reconsider repository-local normative authority and external-link quality as
  new behavior; Milestone 10 found no complete implementation evidence for the
  former proposal meaning.
- Add a private organization registry only if the public route proves
  insufficient for separately controlled releases.
- Add standalone signed executables, Homebrew, Scoop, or an
  organization-managed installer only if Node.js/npm becomes a material
  adoption barrier.
- Add organization-wide Skill deployment or administrative policy integration
  only through a separate milestone.

## Deferred scope

- Existing-monorepo onboarding and isolation rollout study; do not infer
  cross-project or broader monorepo guarantees from local onboarding evidence.
- Linux and Windows CI execution of the contract-fixture verifier.
- Hosted workflow service or durable workflow database.
- Automatic branch, commit, push, merge, approval, QA, or finding decisions.
- Cross-project graph relations or implementation-file links in Requirements.
- Detection of behavior changes without spec updates.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.
