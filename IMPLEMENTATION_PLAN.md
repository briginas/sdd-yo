# SDD Yo implementation plan

## Status

- Active: Milestone 18.1 — User-scoped installation semantic contract and candidate
- Complete: Milestones 0–17 and public/offline wording alignment
- Last updated: 2026-08-10

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
and approval-gated repository Skill route are implemented and verified. New
behavior must use a bounded normal `spec-code`, `spec`, or `code` Change;
no alternate specification-write or ID-reservation route exists.

## Milestone 18 — macOS user-scoped Skill and private CLI installation

### Outcome

Let one macOS developer install the `sdd-yo` Skill once in the Codex user Skill
directory and use it across explicitly selected repositories without installing
an npm package or Skill in each repository. Keep the CLI in an owned private
user-level store, bind the Skill to one exact compatible CLI, and preserve the
implemented repository-scoped installation route as a separate supported mode.

The intended layout is `~/.agents/skills/sdd-yo` for the user Skill and
`~/Library/Application Support/sdd-yo/cli/<version>/` for exact CLI package
bytes. The user-installed wrapper must resolve only its verified binding; it
must never search `PATH`, use `npm install -g`, download at first use, or infer
a target SDD Project. The normal specification workflow decides the final
command shape, binding representation, ownership rules, and compatibility
contract before implementation.

Existing canonical Requirements expected to change or gain related behavior
include `REQ-3F19778B`, `REQ-CF3A1070`, `REQ-A0456614`, `REQ-DAF21960`,
`REQ-8DC50806`, `REQ-AA165BDE`, `REQ-B0B35D6D`, and `REQ-A2199BC2`.
Implementation and test changes must retain exact Requirement traceability
after the governed specification Change establishes the final targets.

### Boundaries

- macOS is the only supported user-scoped installation environment in this
  milestone. Linux and Windows behavior remains deferred.
- One active user-scoped `sdd-yo` installation is sufficient. Coexisting or
  dynamically selected Skill versions remain deferred.
- A Codex plugin, marketplace distribution, organization-wide deployment,
  native executable, Homebrew formula, hosted service, and MCP server are out
  of scope.
- Installation, update, removal, publication, approval, QA, and Git operations
  remain distinct explicit authorities. Ordinary product commands never
  trigger lifecycle or network activity.
- The existing repository-scoped package and Skill lifecycle remains supported
  unless a separately approved normative Change says otherwise.

### 18.1 — User-scoped installation semantic contract and candidate (active)

- Inspect only the current installation, lifecycle, package-distribution,
  compatibility, and Skill-orchestration Requirements needed for this Change.
- Present one complete ID-free semantic model covering the macOS user Skill
  destination, private versioned CLI store, exact package source, binding,
  ownership, install/update/remove lifecycle, repository selection, refusal
  behavior, and coexistence with repository-scoped installations.
- Stop for explicit human confirmation. Any semantic correction invalidates the
  earlier confirmation and requires the complete model to be presented again.
- After unchanged confirmation, generate any new IDs through the compatible
  CLI, materialize one bounded `spec-code` candidate, and validate it against
  the exact selected base without modifying canonical `spec/`.

Done when the complete confirmed model has one valid unapplied candidate with
its exact normative delta and affected scope presented for review. This leaf
creates no canonical specification change, approval evidence, exact patch,
runtime implementation, installation, package-version change, publication,
QA verdict, or Git operation.

### 18.2 — Governed user-scoped installation specification Change

- Run the normal Proposal Gate for only the retained 18.1 candidate and exact
  base, and present deterministic delta, affected scope, diagnostics, and open
  semantic-review decisions.
- Record only an identified human's explicit decision after the exact subject
  is displayed and revalidated; authorship or a valid candidate is not
  approval.
- Prepare an exact SpecPatch only from retained current inputs. Present its
  behavior and consequence, then stop for separate application authorization.
- Apply only the unchanged explicitly selected exact patch and validate the
  resulting canonical specification.

Done when the approved user-scoped installation and lifecycle behavior is
canonical and valid. Stop before implementation, package identity changes,
installation, publication, human QA, or Git operations unless each is
separately requested.

### 18.3 — User-scoped CLI store and lifecycle implementation

- Add explicit user-scope selection without weakening the existing required
  repository-root selection or treating the process cwd as authority.
- Resolve the macOS user Skill and Application Support roots through injected
  platform boundaries. Reject traversal, symlink escape, unsafe components,
  foreign ownership, and any resolved target outside the selected owned roots.
- Install exact packaged CLI and Skill bytes without a global npm executable,
  lifecycle script, first-use download, or mutation of a target repository.
- Implement explicit atomic install, update, recovery, and removal with exact
  inventories, fingerprints, compatibility identity, collision refusal, and
  preservation of unrelated user files.
- Add Requirement-named unit and integration coverage for successful lifecycle,
  stale or modified bytes, interruption, concurrent changes, unsafe paths, and
  strict separation from repository-scoped installations.

Done when focused tests prove the macOS user-level store lifecycle is
deterministic, fail-closed, independently injectable, and leaves repository,
Git, approval, QA, and adjacent user data unchanged.

### 18.4 — User Skill binding and compatible execution

- Define and emit the owned user installation binding with exact package, CLI,
  JSON-schema, Skill-protocol, inventory, fingerprint, and canonical CLI path
  identity.
- Extend the compatibility wrapper to distinguish verified repository and user
  bindings without ambiguity. User mode invokes only the bound private CLI and
  never falls back to `PATH`, a global npm executable, network, or another
  installed version.
- Require one explicit target SDD Project for every project operation and
  preserve all existing human-decision, exact-patch, evidence, and filesystem
  boundaries.
- Add Requirement-named tests and Skill evals for discovery, binding selection,
  compatibility preflight, malformed or stale identity, moved or symlinked
  stores, repository isolation, and absence of first-use installation repair.

Done when a verified user Skill can invoke its exact private CLI against two
separately selected fixture repositories while incompatible, ambiguous, or
unsafe bindings fail before any product command executes.

### 18.5 — Distribution contract, package evidence, and documentation

- Update CLI help, machine-readable results, schemas, diagnostics, fixtures,
  architecture, and public documentation for the exact user lifecycle while
  keeping repository-scoped commands unambiguous.
- Package all bytes needed for user installation and first use in one exact npm
  artifact inventory. Installation from that artifact performs no hidden
  package-manager, network, Git, project initialization, approval, or QA side
  effect.
- Extend package smoke and contract verification for public-registry-shaped and
  retained-offline installation, exact binding bytes, update/removal, tamper
  refusal, and README command identity.
- Select and synchronize an exact next package version only through a separate
  reviewed release-identity change. A successful pack or dry run is not npm
  publication authorization.

Done when one reviewed local package artifact can install, use, update, and
remove the macOS user Skill and private CLI in a clean isolated home while the
full repository validation suite passes. No registry publication is implied.

### 18.6 — Public macOS consumer proof and closeout

- After separate publication authorization, publish only the reviewed exact
  artifact from one immutable subject through the protected release route and
  verify registry identity, integrity, provenance, and selected tag.
- In a fresh macOS user environment, install from the exact public package,
  discover `$sdd-yo`, validate two explicit external repositories, update or
  report unchanged state, remove only owned bytes, and verify outside-store and
  outside-repository sentinels remain unchanged.
- Record automated evidence separately from an identified human review of Skill
  discovery and first use. Neither evidence source creates approval, QA, Git,
  or merge authority for a target project.
- Update canonical specification, architecture, README, supported-environment
  wording, limitations, and deferred work, run the full validation suite, then
  compact this plan according to `plans/README.md`.

Milestone 18 is done when another macOS developer can install one public exact
`sdd-yo` user Skill and private CLI, use the bound CLI across explicit
repositories without per-repository package or Skill installation, and safely
update or remove the owned user installation. This does not imply multiple
active versions, Linux or Windows support, Codex plugin distribution,
organization deployment, automatic lifecycle, or any automatic Git, approval,
QA, finding-resolution, or merge decision.

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
