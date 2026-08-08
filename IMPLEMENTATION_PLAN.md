# SDD Yo implementation plan

## Status

- State: Milestones 0–17 complete; Milestone 18 active
- Current phase: Codex plugin with bundled CLI
- Current leaf: 18.1 — Plugin execution contract and semantic model
- Last updated: 2026-08-08

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
  [`plans/completed/milestone-15-semantic-spec-patch-confirmation.md`](plans/completed/milestone-15-semantic-spec-patch-confirmation.md),
  [`plans/completed/milestone-16-public-github-source-readiness.md`](plans/completed/milestone-16-public-github-source-readiness.md),
  and [`plans/completed/milestone-17-public-npm-cli-distribution.md`](plans/completed/milestone-17-public-npm-cli-distribution.md)
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
- Milestone 16 is complete; its exact execution record is archived at
  [`plans/completed/milestone-16-public-github-source-readiness.md`](plans/completed/milestone-16-public-github-source-readiness.md).
- The deterministic version 1 library, CLI, artifact schemas, proposal and exact
  patch workflow, evidence composition, findings validation, merge readiness,
  enforced governed-scope integration, and explicit approval-gated Skill route
  are implemented and verified.
- Milestone 12 retained the identified human approval-recording Skill verdict,
  full validation results, and closeout evidence under
  [`plans/completed/milestone-12-explicit-human-approval-evidence-recording.md`](plans/completed/milestone-12-explicit-human-approval-evidence-recording.md).
- New product behavior uses a normal bounded `spec-code`, `spec`, or `code`
  Change. Completed bootstrap history grants no alternate specification-write
  or ID-reservation route.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Next milestone

### Milestone 18 — Codex plugin with bundled CLI

Distribute `sdd-yo` as an installable Codex plugin
whose Skill invokes an exact CLI bundled in the same installed plugin artifact.
The user must not install `sdd-yo` into each target repository, copy Skill files,
or download a CLI on first use. The existing repository-scoped package and Skill
route remains a supported alternative.

The planned first combined package/plugin version is `0.4.0`. The same
`sdd-yo@0.4.0` npm artifact will be both the public CLI package and the plugin
package: it will contain `.codex-plugin/plugin.json`, `skills/sdd-yo`, built
CLI/library/schema surfaces, and every locked production dependency required by
the bundled CLI. A marketplace npm source must select one exact version rather
than a range. The plugin must not add an MCP server merely to invoke local CLI
behavior.

Official OpenAI plugin behavior and manifest fields are temporally unstable;
recheck the official plugin documentation before each contract, packaging, and
submission leaf. Public-directory submission and acceptance remain external,
separately authorized boundaries.

#### 18.1 — Plugin execution contract and semantic model

- Confirm the exact supported Codex surfaces, plugin manifest and marketplace
  rules, installed-cache layout assumptions, script execution permissions,
  Node.js availability, update behavior, and public-submission requirements.
- Present one complete ID-free semantic model for dual Skill operation:
  verified repository installation or verified plugin-bundled installation.
  Plugin mode must resolve only the sibling bundled CLI through a fixed safe
  path, verify its compatibility identity and owned bytes, require one explicit
  target project, and never fall back to `PATH`, the network, or a package
  manager.
- Preserve all human authority, exact-patch, filesystem-scope, and Git
  boundaries. Explicitly exclude ChatGPT web repository execution unless the
  official host contract and retained tests establish it.

Done when the human confirms the complete unchanged model. No IDs, candidate,
plugin scaffold, package version change, marketplace entry, or publication is
created in this leaf.

#### 18.2 — Governed plugin-distribution specification Change

- Materialize and validate only the confirmed `spec-code` candidate, using
  fresh IDs for new plugin-specific Requirements and changing existing
  repository-only meaning only where the confirmed model requires it.
- Complete the normal Proposal Gate, identified human decision, exact patch
  preparation, and separately authorized canonical application.
- Stop before implementation, Git operations, npm publication, marketplace
  installation, plugin submission, human QA, or public-directory review.

Done when the exact approved plugin and bundled-CLI behavior is canonical.

#### 18.3 — Deterministic combined plugin package

- Add the required plugin manifest and install-surface metadata while keeping
  the repository Skill as the single maintained workflow source. Do not fork or
  reimplement deterministic CLI rules in plugin prompts.
- Extend the compatibility wrapper with two explicit fail-closed bindings:
  the existing repository `installation.json` route and the plugin-bundled
  fixed-path route. Reject ambiguous, missing, symlinked, modified,
  incompatible, stale, or outside-plugin CLI bytes.
- Include the manifest, Skill, CLI, schemas, and production dependencies in one
  exact npm inventory. Package installation and plugin installation must run no
  lifecycle script and must not initialize a project or mutate `.agents`,
  `.sdd`, `spec`, Git, or adjacent repositories.
- Add Requirement-named tests for manifest shape, exact inventories and hashes,
  both binding modes, precedence/refusal behavior, path escape, interruption,
  and absence of first-use network or package-manager execution.

Done when one local `sdd-yo@0.4.0` package is simultaneously a verified CLI
package and a valid locally installable plugin artifact.

#### 18.4 — Local marketplace installation and Skill evaluation

- Install the exact artifact from a local or repository marketplace into a
  clean Codex environment and confirm that `$sdd-yo` is discoverable without a
  repository-local Skill or npm dependency.
- Exercise representative explicit and implicit prompts for onboarding,
  understanding, proposal review, approval recording, exact patch handoff,
  verification, diagnostics, and refusal boundaries in fresh conversations.
- Verify that plugin mode uses only its bundled CLI, works against an explicit
  external fixture root, records the same version 1 JSON identity, preserves
  outside-root sentinels, and does not mutate plugin-owned bytes.
- Retain deterministic eval results separately from an identified human Skill
  review; automated success does not create that verdict.

Done when local installation and the required human review accept the exact
plugin subject. No public npm update or public-directory submission is implied.

#### 18.5 — Exact plugin release and public submission

- Rebuild and review the combined `sdd-yo@0.4.0` package from one immutable Git
  subject, run the complete package, plugin, Skill-eval, and repository
  validation suites, and separately authorize its npm publication.
- Publish the exact package, then create or update the plugin marketplace entry
  to select exactly `sdd-yo@0.4.0` from the public npm registry. Verify that the
  host downloads it without lifecycle scripts and that installed bytes match
  the reviewed package integrity.
- Only after separate submission authorization, submit the exact plugin
  metadata and package subject to the public plugin directory. Preserve the
  external review status without inferring acceptance from submission.

Done when the reviewed combined artifact is public and its exact plugin subject
has been submitted. The milestone remains open while a required external review
or acceptance decision is pending.

#### 18.6 — Public plugin install evidence and closeout

- Install the accepted public plugin in a fresh supported Codex environment,
  invoke `$sdd-yo` against a clean external Git repository, and verify bundled
  CLI identity, incremental initialization, first validation, update behavior,
  refusal paths, and absence of repository npm or Skill installation state.
- Update user documentation to distinguish direct npm CLI use,
  repository-scoped Skill use, and install-once plugin use, including platform
  and host limitations established by evidence.
- Run the complete validation suite and archive the exact package, plugin,
  marketplace, external-review, human-review, and consumer evidence through
  the normal closeout procedure.

Milestone 18 is done only when another user can install the public plugin and
use its bundled CLI without per-repository package or Skill installation. It
does not imply hosted execution, an MCP service, ChatGPT web filesystem access,
standalone native binaries, organization-wide mandatory deployment, or any
automatic Git, approval, QA, finding-resolution, or merge authority.

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
- add a private organization registry only if the selected public registry
  route later proves insufficient for separately controlled release channels;
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

Milestone 18.1 only: recheck the official Codex plugin host and marketplace
contract, then present one complete ID-free plugin execution model for human
confirmation. Do not create IDs, a candidate, plugin scaffold, package-version
change, marketplace entry, publication, Git operation, approval, or QA verdict.
