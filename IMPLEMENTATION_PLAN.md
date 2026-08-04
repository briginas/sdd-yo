# SDD Yo implementation plan

## Status

- State: active
- Current phase: Milestone 10 / Private installation and first-run onboarding
- Current leaf: 10.1 / Distribution and onboarding contract
- Last updated: 2026-08-04

## Source-of-truth map

- Target product behavior: [`proposal/spec/README.md`](proposal/spec/README.md)
- Architecture: [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Bootstrap and promotion:
  [`proposal/architecture/bootstrap.md`](proposal/architecture/bootstrap.md)
- Plan index and completed history: [`plans/README.md`](plans/README.md)
- Completed Milestones 0–9:
  [`plans/completed/milestones-0-9.md`](plans/completed/milestones-0-9.md)

Read the completed plan only when a task needs historical rationale, exact
milestone boundaries, Requirement traceability, or retained evidence pointers.
Current specification, architecture, implementation, and evidence outrank the
historical plan.

## Objective

Deliver an offline-first, repository-native SDD governance system with a
deterministic TypeScript library, the `sdd` CLI and versioned JSON protocols,
language-independent test adapters, exact approval-bound workflow artifacts,
and the optional progressive-disclosure `sdd-yo` Agent Skill.

## Current state

- The deterministic version 1 library, CLI, artifact schemas, proposal and exact
  patch workflow, evidence composition, findings validation, merge readiness,
  and enforced governed-scope integration are implemented and verified.
- The optional `sdd-yo` Skill routes the implemented workflow through compatible
  CLI JSON and preserves human evidence, permission, and Git side-effect
  boundaries.
- Milestones 0–9 and the MVP checklist are complete; their detailed record is in
  the completed-plan archive.
- Version `0.1.0` is a private package. The source repository and npm package
  remain private during Milestone 10, and no registry or marketplace publication
  is implied.
- Unimplemented target behavior remains under `proposal/spec/` and is promoted
  only with its implementation and Requirement-named verification.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Milestone 10 — Private installation and first-run onboarding

Goal: let a developer in a clean external Git repository install exact,
compatible CLI and Agent Skill bytes from a private local package artifact,
initialize or select one explicit SDD Project, and complete the first validation
without cloning the `sdd-yo` source, creating manual symlinks, or depending on
an accidental global executable.

Milestone 10 produces locally and cross-platform verified private package
artifacts and an independently reproducible onboarding path. It preserves
`"private": true` and does not publish to an npm registry or Codex plugin
marketplace.

- [x] **10.0 — Active-plan compaction and private-distribution alignment.** Move
      the exact completed Milestones 0–9 execution record into the indexed
      completed-plan archive; keep only current state, active work, deferred
      scope, and candidate follow-ups in this file; refresh stale repository
      instructions; preserve the private source and package boundary; and make
      local tarball installation, rather than publication, the Milestone 10
      distribution target. This repository-maintenance leaf changes no product
      Requirement, runtime behavior, package contents, installed Skill state, or
      Git history.
- [ ] **10.1 — Distribution and onboarding contract.** Define the missing
      proposed product Requirements and architecture for exact project-local
      installation from a private npm tarball, package ownership and version
      binding of the `sdd` CLI and `sdd-yo` Skill bytes, explicit
      repository-scoped Skill installation under `.agents/skills/sdd-yo`,
      CLI/JSON-schema/Skill compatibility, update and removal behavior, and the
      clean external-project success path. Preserve `sdd` as the executable and
      `sdd-yo` as the Skill. Require explicit installation commands; prohibit
      `postinstall`, silent overwrite, implicit global installation,
      adjacent-project mutation, and network access by ordinary product
      commands. Generate and record exact Requirement IDs before any
      implementation leaf begins. This leaf changes only the active plan,
      proposed specification, architecture, and rollout/evaluation
      documentation; it does not change canonical Requirements, runtime code,
      package privacy, or installed Skill state.
- [ ] **10.2 — CLI discoverability and compatibility identity.** Promote and
      implement only the 10.1 Requirements for stable top-level and
      command-specific help, CLI version reporting, and machine-readable
      compatibility identity. Keep help/version behavior free of project
      mutation and preserve the existing version 1 command response contracts.
      Add exact Requirement-named CLI and packaged-executable tests.
- [ ] **10.3 — Installable private npm tarball boundary.** Preserve
      `"private": true`, make the package metadata and local tarball
      installation-ready, include the built CLI, package library/schema files,
      and matching `sdd-yo` Skill payload, and verify exact packed contents from
      a clean install. Do not publish to any registry. Preserve the Node.js
      runtime baseline, avoid install lifecycle side effects, and extend package
      smoke tests with the exact Requirement IDs promoted for this leaf.
- [ ] **10.4 — Explicit repository-scoped Skill installation.** Implement the
      10.1-selected explicit install, compatibility-check, update, and removal
      operations for `.agents/skills/sdd-yo`. Bind installed Skill bytes to the
      private package artifact and make the wrapper resolve the matching packaged
      or explicitly selected CLI rather than an accidental global executable.
      Refuse traversal, symlink escape, incompatible versions, unrequested
      overwrite, and mutation outside the selected repository. Do not install a
      global Skill or modify unrelated package-manager files.
- [ ] **10.5 — User-facing quickstart and recovery documentation.** Add the root
      README only after the documented commands exist. Cover prerequisites,
      exact local tarball installation, Skill installation and explicit
      invocation, `init` plus first `validate`, common diagnostics,
      update/removal, automation JSON usage, and the boundary between
      deterministic CLI results and human approval/QA. Verify every command
      against the packed consumer layout.
- [ ] **10.6 — Clean external-project onboarding evidence.** Exercise the exact
      private packed artifact and documentation in fresh external incremental
      and complete-adoption fixtures on every supported platform. Require
      successful CLI and Skill compatibility checks, deterministic
      initialization and validation, no source checkout or global executable
      dependency, no unreported writes, and retained evidence tied to source,
      package, Skill, platform, and command versions. A local tarball proves
      private installation readiness; it does not claim registry or marketplace
      availability.

Done when the clean external-project study can follow the root quickstart using
only the exact private packed artifact, the installed repository-scoped Skill is
bound to its compatible CLI, all focused and full repository validation passes,
and no public release, registry publication, provenance, or marketplace
availability is claimed.

## Post-Milestone 10 candidate backlog

These candidates remain available for selection after Milestone 10. They are
not implied work and require a new bounded milestone plus any necessary human
authorization:

- publish through a private organization registry if distribution needs outgrow
  local tarballs; this would require a scoped package and an explicit decision to
  replace `"private": true` with registry-constrained publication metadata;
- publish the verified package to the public npm registry only after an explicit
  source-visibility, package-access, release-security, and provenance decision;
- package and distribute `sdd-yo` as an installable Codex plugin through a local,
  team, or public marketplace, with its released CLI dependency and compatibility
  boundary explicit;
- add alternative distribution channels such as standalone signed executables,
  Homebrew, Scoop, or an organization-managed installer if onboarding evidence
  shows that the Node.js/npm prerequisite is a material adoption barrier;
- add organization-wide Skill deployment or administrative policy integration
  after repository-scoped installation has been validated in real teams.

## Deferred scope

- Post-MVP existing-monorepo onboarding and project/evidence-isolation rollout
  study; its isolation, cross-project, and broader monorepo guarantees must not
  be inferred from the two completed MVP studies.
- Stage 0 verifier execution on Linux and Windows CI.
- Hosted workflow service or durable workflow database.
- Automatic branch, commit, push, merge, approval, or QA actions.
- Cross-project graph relations.
- Implementation-file links in canonical Requirements.
- Detection of code behavior changes whose author did not update the spec.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.

## Immediate next leaf

Implement only 10.1, the distribution and onboarding contract. Resolve and
record the normative private-tarball installation, version binding,
update/removal, and clean-project success behavior before changing CLI code,
package contents, root README, installed Skill state, or canonical Requirements.
Registry publication, Codex plugin distribution, alternative installers, and
organization-wide deployment remain preserved in the post-Milestone 10
candidate backlog.
