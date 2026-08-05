# SDD Yo implementation plan

## Status

- State: active
- Current phase: Milestone 10 / Self-bootstrap retirement and normal-workflow transition
- Current leaf: 10.2 / Contract-oracle decoupling
- Last updated: 2026-08-05

## Source-of-truth map

- Canonical product behavior: [`spec/README.md`](spec/README.md)
- Remaining bootstrap target package, transition-only:
  [`proposal/spec/README.md`](proposal/spec/README.md)
- Architecture: [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Historical bootstrap and promotion procedure, transition-only:
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
  remain private during Milestone 11, and no registry or marketplace publication
  is implied.
- Pre-existing unimplemented target behavior remains under `proposal/spec/`
  until its Milestone 10 disposition is executed. New behavior after retirement
  uses the normal `spec-code`, `spec`, or `code` workflow from a bounded candidate
  tree rather than adding a new long-lived bootstrap proposal.
- The 10.1 retirement record accounts for all fifteen proposal-only Requirement
  definitions, all maintained bootstrap-bound surfaces, and every retained Stage
  0 check. It assigns twelve meanings to later normal baseline Changes, preserves
  one unimplemented meaning as nonnormative backlog, retires two redundant
  meanings with rationale, and gives 10.2 and 10.3 non-overlapping execution
  boundaries. The old surfaces remain active until those leaves execute their
  recorded dispositions.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Milestone 10 — Self-bootstrap retirement and normal-workflow transition

Goal: retire the completed temporary self-bootstrap procedure as active
repository authority, preserve useful contract-oracle coverage and historical
rationale, and make the normal `spec-code`, `spec`, and `code` workflows the only
active paths for changing product behavior before private distribution work
begins.

Milestones 0–9 implemented and verified the mechanisms required for ordinary
incremental Changes. Milestone 10 preserves `src/proposal/`, the ProposalPackage,
exact SpecPatch workflow, schemas, contract fixtures, and truth tables as product
or regression surfaces. It removes only temporary promotion authority, resolves
the remaining target-package backlog explicitly, and migrates still-useful
fixture checks to an ordinary contract oracle.

### Milestone 10 handoff contract

Leaf 10.1 created
`plans/active/milestone-10-self-bootstrap-retirement.md` and links it from
`plans/README.md`. That document is the reviewable disposition and dependency
record consumed by 10.2 and 10.3; it is not a second active implementation plan.

The 10.1 inventory starts from this checked baseline:

- `proposal/spec/` contains exactly fifteen Requirement definitions absent from
  canonical `spec/`;
- every Capability ID defined under `proposal/spec/` is already present in
  canonical `spec/`, so there are zero proposal-only Capabilities;
- completed plans, Git history, and archived evidence are historical inputs, not
  active authority to remove;
- exact fixture payload bytes are retained when their malformed form,
  canonical bytes, or fingerprint is an oracle; terminology alone does not
  authorize rewriting them.

The inventory contains two exhaustive tables. Each proposal-only Requirement
row records its source ID and title, proposal path and anchor, canonical
presence, implementation and test evidence, inbound inventory or fixture
dependencies, one allowed disposition, rationale, retained provenance, and the
future leaf or backlog destination. Each active-surface row records its path,
current bootstrap role, maintained consumers, coverage or authority supplied,
one of `retain-and-decouple`, `archive`, `rename`, or `remove`, the replacement
or archive destination, and the leaf that executes the decision. A coverage map
binds every retained Stage 0 verifier check to its intended contract-oracle
replacement before 10.2 begins.

Pre-canonical proposal IDs remain source provenance in the retirement record but
lose active reservation when their proposal definitions are removed. A future
normal Change generates and checks a fresh ID through `sdd id`; neither backlog
prose nor a historical fixture occurrence reserves an object ID. The retirement
record must not represent preserved backlog material as active Requirement
blocks.

For inventory scope, maintained active authority includes current repository
instructions and plans, proposal and architecture maps, package commands,
verifier and generator scripts, versioned inventory authority fields, maintained
tests, fixture manifests, and documentation used by the required validation
suite. Completed plans and immutable historical evidence are recorded only when
needed to explain provenance or a disposition; they are not rewritten merely to
remove bootstrap terminology.

Leaf 10.1 is complete only when the Requirement table is set-equal to the fifteen
proposal-only definitions, the zero proposal-only Capability baseline is
reproduced, every maintained bootstrap-dependent path has one disposition,
every retained check has a named coverage successor, local links resolve,
Markdown formatting and `git diff --check` pass, and the diff changes only the
retirement record, its plan index, this active plan, and transitional repository
instructions. A missing, ambiguous, or multiply assigned item keeps 10.1
incomplete.

- [x] **10.0 — Active-plan compaction and private-distribution alignment.** Move
      the exact completed Milestones 0–9 execution record into the indexed
      completed-plan archive; keep only current state, active work, deferred
      scope, and candidate follow-ups in this file; refresh stale repository
      instructions; preserve the private source and package boundary; and make
      local tarball installation, rather than publication, the Milestone 11
      distribution target. This repository-maintenance leaf changes no product
      Requirement, runtime behavior, package contents, installed Skill state, or
      Git history.
- [x] **10.1 — Self-bootstrap retirement inventory and disposition.** Create
      one exact, reviewable inventory of every proposal-only Requirement and
      every maintained reference that treats `proposal/spec/`, Stage 0, or the
      bootstrap procedure as active authority. Assign each proposal-only
      Requirement exactly one disposition: select later through a normal
      Change, preserve as nonnormative backlog material, baseline already
      implemented behavior through an applicable normal Change, or retire with
      rationale. Classify each verifier, inventory, fixture, test, script, and
      documentation surface as retain-and-decouple, archive, rename, or remove.
      Record coverage and dependency evidence for every decision. This leaf is
      documentation and inventory only: it does not move or delete proposal
      content, rename commands, change fixture bytes, alter product behavior, or
      create canonical Requirements. Completed on 2026-08-05 in
      [`plans/active/milestone-10-self-bootstrap-retirement.md`](plans/active/milestone-10-self-bootstrap-retirement.md):
      the live 15-Requirement and zero-Capability baselines were reproduced,
      every maintained surface received one disposition, and every retained
      verifier check received a named 10.2 successor.
- [ ] **10.2 — Contract-oracle decoupling.** Replace the active Stage 0
      repository-maintenance verifier boundary with an ordinary contract-fixture
      oracle that no longer requires proposal Requirement definitions or
      bootstrap-only authority links. Preserve useful JSON, JSONL, schema,
      fingerprint, truth-table, path, link, ID-format, coverage, and malformed
      fixture checks; map implemented contract authority to canonical
      Requirements or explicit versioned contract sources; and rename maintained
      scripts, package commands, diagnostics, tests, and documentation where the
      old Stage 0 name incorrectly implies an active phase. Preserve historical
      fixture bytes when their exact content is itself an oracle. Demonstrate
      equal or stronger retained coverage before removing `verify:stage-0` from
      the required validation suite. This leaf changes no product behavior or
      canonical Requirement meaning.
- [ ] **10.3 — Bootstrap authority and target-package retirement.** Execute the
      approved 10.1 dispositions after 10.2 has removed verifier dependencies:
      preserve selected future behavior as clearly nonnormative backlog material,
      schedule any already-implemented behavior for an applicable normal Change,
      archive the completed bootstrap procedure and evidence pointers, remove
      active promotion instructions and stale bootstrap terminology from source
      maps and rollout documentation, and remove `proposal/spec/` only when no
      maintained authority or link depends on it. Keep normal proposal runtime,
      schemas, fixtures, and exact-patch behavior intact. Run the focused
      retirement checks and the complete repository validation suite before
      making 11.1 current.

Done when `proposal/spec/` and the bootstrap procedure are no longer active
authority, every former proposal-only Requirement has an explicit executed or
scheduled disposition, the required contract verifier retains equal or stronger
coverage without proposal dependencies, active repository instructions name
only normal product workflows, all focused and full validation passes, and
normal ProposalPackage and exact-patch behavior remains intact.

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

- [ ] **11.1 — CLI discoverability and compatibility identity.** Use one bounded
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

- baseline the already implemented adoption semantics recorded by 10.1 through
  one bounded normal `spec` Change with fresh IDs: incremental adoption,
  canonical governed scope, explicit governance transition, and accepted
  existing-behavior baseline;
- baseline the already implemented qualitative synchronization-mode and
  four-gate semantics recorded by 10.1 through one or more bounded normal
  `spec` Changes with fresh IDs;
- baseline the already implemented inactive-object, generic JSONL adapter,
  semantic-completeness, and per-project isolation semantics recorded by 10.1
  through independently reviewable normal `spec` Changes with fresh IDs;
- consider repository-local normative authority and external-link quality
  findings as a new behavior candidate; the 10.1 inventory found no complete
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

Implement only 10.2, the contract-oracle decoupling recorded in
`plans/active/milestone-10-self-bootstrap-retirement.md`. Introduce the ordinary
contract verifier, migrate inventory authority and active fixture/test
terminology, preserve exact oracular bytes, and prove equal or stronger coverage
before removing `verify:stage-0` from required validation. Do not remove or move
`proposal/spec/`, archive the bootstrap procedure, change product behavior or
canonical Requirement meaning, execute 10.3, begin Milestone 11, or perform Git
operations in this leaf.
