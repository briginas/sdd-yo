# SDD Yo implementation plan

## Status

- State: active
- Current phase: Milestone 11 / Private installation and first-run onboarding
- Current leaf: 11.2 / Installable private npm tarball and version binding
- Last updated: 2026-08-05

## Source-of-truth map

- Canonical product behavior: [`spec/README.md`](spec/README.md)
- Architecture: [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Plan index and completed history: [`plans/README.md`](plans/README.md)
- Historical bootstrap procedure:
  [`plans/completed/self-bootstrap-procedure.md`](plans/completed/self-bootstrap-procedure.md)
- Completed Milestones 0–10:
  [`plans/completed/milestones-0-9.md`](plans/completed/milestones-0-9.md) and
  [`plans/completed/milestone-10-self-bootstrap-retirement.md`](plans/completed/milestone-10-self-bootstrap-retirement.md)

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
- Milestones 0–10 and the MVP checklist are complete; their detailed records are
  in the completed-plan archive.
- Version `0.1.0` is a private package. The source repository and npm package
  remain private during Milestone 11, and no registry or marketplace publication
  is implied.
- Milestone 11.1 is implemented and verified on feature commit
  `cfa7d106b88abf078a3773b8354bd105643f5b59`: stable top-level and
  command-specific help, exact package/CLI version reporting, and deterministic
  machine-readable compatibility identity pass Requirement-named CLI and
  packaged-executable tests. Its approved SpecPatch applies cleanly to the exact
  base and produces the approved candidate-tree fingerprint.
- Former proposal-only meanings have the dispositions recorded by completed
  Milestone 10:
  later baseline candidates remain nonnormative plan backlog, one unimplemented
  meaning remains a future candidate, and two redundant meanings are retired.
  New behavior uses the normal `spec-code`, `spec`, or `code` workflow from a
  bounded candidate tree rather than a long-lived bootstrap target package.
- Milestone 10 replaced the Stage 0 verifier with the ordinary
  `verify:contracts` contract oracle, removed proposal-only Requirement mappings
  from active inventory and fixture authority, and preserved every contract ID,
  fixture-family ID, required-case mapping, byte-sensitive historical payload,
  and retained diagnostic family. It archived the completed bootstrap procedure,
  removed the target package and active promotion route, and preserved the
  recorded future candidates as nonnormative active-plan backlog.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Milestone 11 — Private installation and first-run onboarding

Goal: let a developer in a clean external Git repository install exact,
compatible CLI and Agent Skill bytes from a private local package artifact,
initialize or select one explicit SDD Project, and complete the first validation
without cloning the `sdd-yo` source, creating manual symlinks, or depending on
an accidental global executable.

Milestone 11 produces locally and cross-platform verified private package
artifacts and an independently reproducible onboarding path. It preserves
`"private": true` and does not publish to an npm registry or Codex plugin
marketplace.

Each Milestone 11 behavior leaf generates and checks its own exact IDs
immediately before use, drafts the smallest complete candidate tree from the
canonical specification, validates the applicable normal proposal, obtains the
required human decision, prepares and applies only the exact SpecPatch, and
implements the Requirement with Requirement-named tests in the same leaf.
Milestone 11 does not use a permanent target package to stage new behavior and
does not introduce a batch of unimplemented Requirements ahead of their
implementation.

- [x] **11.1 — CLI discoverability and compatibility identity.** Use one bounded
      `spec-code` Change to introduce only the canonical Capability and
      Requirement set needed for stable top-level and command-specific help, CLI
      version reporting, and machine-readable package, CLI, JSON-schema, and
      Skill compatibility identity. Generate fresh IDs immediately before
      authoring the candidate, preserve the existing version 1 command response
      contracts, keep help and identity behavior free of project mutation, and
      add exact Requirement-named CLI and packaged-executable tests. This leaf
      does not change package contents, install the Skill, add the root
      quickstart, or claim external-project onboarding readiness.
- [ ] **11.2 — Installable private npm tarball and version binding.** Use one
      bounded `spec-code` Change for the exact package-content and compatibility
      Requirements implemented by this leaf. Preserve
      `"private": true`, make the package metadata and local tarball
      installation-ready, include the built CLI, package library/schema files,
      and matching `sdd-yo` Skill payload, and verify exact packed contents from
      a clean install. Do not publish to any registry. Preserve the Node.js
      runtime baseline, prohibit install lifecycle mutation, bind every packaged
      surface to the compatible identity from 11.1, and extend package smoke
      tests with the exact Requirement IDs introduced by this leaf.
- [ ] **11.3 — Explicit repository-scoped Skill installation and first use.**
      Use one bounded `spec-code` Change for explicit installation and
      compatibility checking under `.agents/skills/sdd-yo`. Bind installed Skill
      bytes to the selected private package artifact, make the wrapper resolve
      the matching packaged or explicitly selected CLI rather than an accidental
      global executable, and prove the clean external-project path through
      explicit project selection or `init` and the first `validate`. Refuse
      traversal, symlink escape, an incompatible version, an existing
      unapproved destination, mutation outside the selected repository, and any
      implicit global Skill installation or unrelated package-manager change.
- [ ] **11.4 — Explicit Skill update, removal, and lifecycle safety.** Use one
      bounded `spec-code` Change for compatibility-aware update and removal of
      the selected repository-scoped installation. Require explicit commands,
      refuse silent overwrite and adjacent-project mutation, remove only bytes
      owned by the selected compatible installation, and keep ordinary product
      commands offline. Add Requirement-named interruption, stale-installation,
      traversal, symlink, overwrite, and scope tests.
- [ ] **11.5 — User-facing quickstart and recovery documentation.** Add the root
      README only after the documented commands exist. Cover prerequisites,
      exact local tarball installation, Skill installation and explicit
      invocation, `init` plus first `validate`, common diagnostics,
      update/removal, automation JSON usage, and the boundary between
      deterministic CLI results and human approval/QA. Verify every command
      against the packed consumer layout.
- [ ] **11.6 — Clean external-project onboarding evidence.** Exercise the exact
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

## Post-Milestone 11 candidate backlog

These candidates remain available for selection after Milestone 11. They are
not implied work and require a new bounded milestone plus any necessary human
authorization:

- baseline the already implemented adoption semantics recorded by completed
  Milestone 10 through
  one bounded normal `spec` Change with fresh IDs: incremental adoption,
  canonical governed scope, explicit governance transition, and accepted
  existing-behavior baseline;
- baseline the already implemented qualitative synchronization-mode and
  four-gate semantics recorded by completed Milestone 10 through one or more bounded normal
  `spec` Changes with fresh IDs;
- baseline the already implemented inactive-object, generic JSONL adapter,
  semantic-completeness, and per-project isolation semantics recorded by completed Milestone 10
  through independently reviewable normal `spec` Changes with fresh IDs;
- consider repository-local normative authority and external-link quality
  findings as a new behavior candidate; the completed Milestone 10 inventory found no complete
  implementation evidence for that former proposal meaning;
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
- Contract-fixture verifier execution on Linux and Windows CI.
- Hosted workflow service or durable workflow database.
- Automatic branch, commit, push, merge, approval, or QA actions.
- Cross-project graph relations.
- Implementation-file links in canonical Requirements.
- Detection of code behavior changes whose author did not update the spec.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.

## Immediate next leaf

Implement only 11.2, installable private npm tarball and version binding. Use
one bounded normal `spec-code` Change for the exact package-content and
compatibility Requirements implemented by this leaf. Preserve `"private": true`,
make the package metadata and local tarball installation-ready, include the
built CLI, package library/schema files, and matching `sdd-yo` Skill payload,
and verify exact packed contents from a clean install. Do not publish to any
registry. Preserve the Node.js runtime baseline, prohibit install lifecycle
mutation, bind every packaged surface to the compatible identity from 11.1,
and add exact Requirement-named package smoke tests.
