# SDD Yo implementation plan

## Status

- Active: Milestone 18.1 — Plugin execution contract and semantic model
- Complete: Milestones 0–17
- Last updated: 2026-08-08

## Authority and navigation

- Implemented product behavior: [`spec/README.md`](spec/README.md)
- Architecture and implementation boundaries:
  [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Completed execution records and closeout procedure:
  [`plans/README.md`](plans/README.md)
- Repository work discipline and validation: [`AGENTS.md`](AGENTS.md)

Load completed plans only for historical rationale, exact boundaries,
Requirement traceability, decisions, exclusions, or evidence. Current
specification, architecture, implementation, and evidence outrank history.

## Product baseline

SDD Yo is an offline-first, repository-native specification-governance system:
a deterministic TypeScript library, the `sdd` CLI and versioned JSON protocols,
language-independent test adapters, exact approval-bound workflow artifacts,
and an optional progressive-disclosure `sdd-yo` Agent Skill.

The version 1 library, CLI, schemas, proposal and exact-patch workflow, evidence
composition, findings validation, merge readiness, governed-scope integration,
and approval-gated repository Skill route are implemented and verified. New
behavior must use a bounded normal `spec-code`, `spec`, or `code` Change;
completed bootstrap work grants no alternate specification-write or
ID-reservation route.

## Milestone 18 — Codex plugin with bundled CLI

### Outcome

Distribute `sdd-yo` as an install-once Codex plugin whose Skill invokes the
exact CLI bundled in the same artifact. Users must not need a repository-local
package or Skill, copied files, or a first-use download. The repository-scoped
package and Skill remain supported.

The planned first combined package/plugin is `sdd-yo@0.4.0`. One npm artifact
contains `.codex-plugin/plugin.json`, `skills/sdd-yo`, built CLI/library/schema
surfaces, and all locked production dependencies. A marketplace npm source
selects one exact version. Do not add an MCP server solely to invoke the local
CLI.

Codex plugin and marketplace contracts are temporally unstable. Recheck
official OpenAI documentation before the contract, packaging, and submission
leaves. Publication, directory submission, and external acceptance are
separate authorization boundaries.

### 18.1 — Plugin execution contract and semantic model (active)

- Verify supported Codex surfaces, manifest and marketplace rules,
  installed-cache layout, script permissions, Node.js availability, update
  behavior, and submission requirements.
- Present one complete ID-free model for two explicit Skill bindings:
  verified repository installation or verified plugin-bundled installation.
- Plugin mode resolves only a fixed safe sibling CLI, verifies compatibility
  identity and owned bytes, requires one explicit target project, and never
  falls back to `PATH`, network, or a package manager.
- Preserve human authority, exact-patch, filesystem-scope, and Git boundaries.
  Exclude ChatGPT web repository execution unless official host contracts and
  retained tests establish it.

Done when the human confirms the complete unchanged model. This leaf creates
no IDs, candidate, plugin scaffold, package-version change, marketplace entry,
publication, Git operation, approval, or QA verdict.

### 18.2 — Governed plugin-distribution specification Change

- Materialize and validate only the confirmed `spec-code` candidate. Use fresh
  IDs for plugin-specific Requirements; change existing repository-only meaning
  only when the confirmed model requires it.
- Complete the normal Proposal Gate, identified human decision, exact patch
  preparation, and separately authorized canonical application.

Done when the exact approved plugin and bundled-CLI behavior is canonical.
Stop before implementation, Git operations, npm publication, marketplace
installation, plugin submission, human QA, or public-directory review.

### 18.3 — Deterministic combined plugin package

- Add the manifest and install metadata while retaining one maintained Skill
  workflow source; do not duplicate deterministic CLI rules in prompts.
- Extend the compatibility wrapper with two fail-closed bindings: repository
  `installation.json` and plugin-bundled fixed path. Reject ambiguous, missing,
  symlinked, modified, incompatible, stale, or outside-plugin CLI bytes.
- Package the manifest, Skill, CLI, schemas, and production dependencies in one
  exact inventory. Package and plugin installation run no lifecycle script and
  initialize or mutate no target project, `.agents`, `.sdd`, `spec`, Git state,
  or adjacent repository.
- Add Requirement-named tests for manifest shape, inventories and hashes,
  binding modes and refusal precedence, path escape, interruption, and absence
  of first-use network or package-manager execution.

Done when one local `sdd-yo@0.4.0` package is both a verified CLI package and a
valid locally installable plugin artifact.

### 18.4 — Local marketplace installation and Skill evaluation

- Install the exact artifact from a local or repository marketplace into a
  clean Codex environment and confirm `$sdd-yo` discovery without
  repository-local Skill or npm state.
- Evaluate representative explicit and implicit prompts for onboarding,
  understanding, proposal review, approval recording, exact-patch handoff,
  verification, diagnostics, and refusal boundaries in fresh conversations.
- Verify bundled-CLI-only execution against an explicit external fixture root,
  version 1 JSON identity, outside-root sentinels, and immutable plugin bytes.
- Retain deterministic eval results separately from an identified human Skill
  review; automation does not create the human verdict.

Done when local installation and human review accept the exact plugin subject.
This implies no public npm update, directory submission, or publication.

### 18.5 — Exact plugin release and public submission

- Rebuild and review `sdd-yo@0.4.0` from one immutable Git subject; run complete
  package, plugin, Skill-eval, and repository validation; separately authorize
  npm publication.
- Publish the exact package. Point the marketplace entry to exactly
  `sdd-yo@0.4.0` in the public npm registry; verify the host downloads it
  without lifecycle scripts and installed bytes match reviewed integrity.
- After separate submission authorization, submit the exact metadata and
  package subject. Record external review status without treating submission as
  acceptance.

Done when the reviewed artifact is public and its exact plugin subject is
submitted. Keep the milestone open while required external review or
acceptance is pending.

### 18.6 — Public plugin install evidence and closeout

- In a fresh supported Codex environment, install the accepted public plugin
  and invoke `$sdd-yo` against a clean external Git repository. Verify bundled
  CLI identity, incremental initialization, first validation, updates, refusal
  paths, and absence of repository-local npm or Skill state.
- Document direct npm CLI, repository-scoped Skill, and install-once plugin
  routes, including evidence-backed platform and host limitations.
- Run the full validation suite and archive the exact package, plugin,
  marketplace, external-review, human-review, and consumer evidence using the
  normal closeout procedure.

Milestone 18 is done when another user can install the public plugin and use
its bundled CLI without per-repository package or Skill installation. This does
not imply hosted execution, an MCP service, ChatGPT web filesystem access,
standalone native binaries, organization-wide deployment, or automatic Git,
approval, QA, finding-resolution, or merge authority.

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
