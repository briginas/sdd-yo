# SDD Yo implementation plan

## Status

- State: Milestones 0–16 complete; Milestone 17 active
- Current phase: Public npm CLI distribution
- Current leaf: 17.5 — Explicit public npm publication
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
  and [`plans/completed/milestone-16-public-github-source-readiness.md`](plans/completed/milestone-16-public-github-source-readiness.md)
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
- Milestone 16 is complete. The GitHub source repository is public while the
  `sdd-yo@0.2.0` npm package and Codex plugin remain unpublished; its exact
  record is archived at
  [`plans/completed/milestone-16-public-github-source-readiness.md`](plans/completed/milestone-16-public-github-source-readiness.md).
- The deterministic version 1 library, CLI, artifact schemas, proposal and exact
  patch workflow, evidence composition, findings validation, merge readiness,
  enforced governed-scope integration, and explicit approval-gated Skill route
  are implemented and verified.
- Milestone 12 retained the identified human approval-recording Skill verdict,
  full validation results, and closeout evidence under
  [`plans/completed/milestone-12-explicit-human-approval-evidence-recording.md`](plans/completed/milestone-12-explicit-human-approval-evidence-recording.md).
- The `sdd-yo@0.3.0` public package metadata, exact compatibility identity,
  retained offline-tarball route, documentation, and protected trusted-publisher
  workflow are implemented and locally verified. The package remains
  unpublished; no registry, marketplace, cross-platform onboarding-study, or
  whole-project completeness claim is implied until the selected Milestones 17
  and 18 satisfy their respective done conditions.
- Leaf 17.4 retained one exact release candidate from immutable Git subject
  `da3365ae58051facf9eb520b2b2db5116697c8a2`, exercised the ordinary npm and
  isolated Yarn Plug'n'Play consumer routes, completed the npm publication dry
  run, and passed the full repository validation suite. The package remains
  unpublished and no authentication, publication-readiness, approval, or QA
  claim was made.
- New product behavior uses a normal bounded `spec-code`, `spec`, or `code`
  Change. Completed bootstrap history grants no alternate specification-write
  or ID-reservation route.
- Leaf 17.1 is complete. The human confirmed the unchanged ID-free public
  distribution model and the preflight choices: the personal npm publisher is
  `briginas`; the unscoped `sdd-yo` name is available; the first public version
  is `0.3.0`; and publication will use a GitHub Actions trusted publisher for
  `briginas/sdd-yo` through `publish.yml` with a protected `release`
  environment, OIDC, and provenance. No registry mutation or repository
  product change occurred in that leaf.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Next milestone

### Milestone 17 — Public npm CLI distribution

Publish an exact `sdd-yo` package to the public npm registry so a developer can
install the deterministic CLI as repository tooling and invoke its `sdd`
executable through npm without obtaining a private tarball. Preserve the local
tarball as an offline installation artifact, keep installation lifecycle inert,
and bind the public package, CLI, library, schemas, and packaged repository
Skill to one compatibility identity.

The planned first public version is `sdd-yo@0.3.0`. Before that identity becomes
normative or publishable, leaf 17.1 must confirm that the unscoped package name
is available to or already controlled by the selected npm publisher. If it is
not, stop for an explicit naming decision; do not silently scope or rename the
package.

Milestone 17 changes the currently private distribution contract and therefore
uses one normal bounded `spec-code` Change. The publication command, Git commit,
tag or release creation, and any human approval or QA verdict remain separately
authorized operations.

#### 17.1 — Public-release contract and registry preflight

- Recheck the current official npm publication, trusted-publishing,
  provenance, access, and package-name rules at execution time.
- Verify package-name ownership or availability, selected publisher identity,
  account and organization boundary, required authentication policy, and the
  supported provenance route without exposing credentials in repository files,
  logs, fixtures, or model context.
- Present one complete ID-free semantic model for the `spec-code` Change. It
  must cover public registry installation, exact-version invocation through
  npm, preservation of the offline tarball route, release-subject and artifact
  identity, inert installation, and explicit non-authority for Skill
  installation, project initialization, Git, approval, QA, or merge effects.
- Identify the existing `CAP-6AD33965` and its Requirements whose private-only
  meaning must change, plus any genuinely new release-security Requirements;
  do not generate IDs, draft a candidate, edit canonical `spec/`, or change
  package metadata before explicit semantic-model confirmation.

Done when the human has confirmed one unchanged semantic model and every
publisher, package-name, access, version, and provenance choice needed by the
candidate is explicit. Registry mutation, package publication, implementation,
and evidence creation are excluded.

**Completed 2026-08-08.** The confirmed model changes the private-only meaning
of `REQ-B0B35D6D`, `REQ-A2199BC2`, and `REQ-43B4311E` under `CAP-6AD33965` and
requires new public-release security Requirements. It preserves the offline
tarball route, exact compatibility identity, inert installation, and all human,
Skill-installation, project-initialization, Git, approval, QA, and merge
authority boundaries. No candidate, ID, canonical specification, package
metadata, registry state, or evidence artifact was created.

#### 17.2 — Governed public-distribution specification Change

- Materialize only the confirmed candidate, validate it in `spec-code` mode,
  and present the exact normative delta and affected scope through the normal
  Proposal Gate.
- Record any approval or rejection only from an identified human decision,
  revalidate the exact subject after every pause, and prepare/apply only the
  separately authorized exact `SpecPatch` on the selected integration base.
- Stop after canonical application. Do not implement package changes, publish,
  create a branch or commit, or infer review or QA from deterministic checks.

Done when the exact approved public-distribution Requirements are canonical and
the resulting specification bytes equal the validated candidate.

**Completed 2026-08-08.** Identified human `ivan-briginas`, through issuer
`product-review`, approved the exact `spec-code` subject based on
`565bc151afaad7459ed6fce202e42c730ea2a7a0`. The retained ProposalPackage,
ApprovalEvidence, conflict report, and SpecPatch remain under ignored
`.sdd/staging/milestone-17.2/`; the exact patch was applied and the canonical
bytes were recorded in `a116471a5d8a7ea09fe46fa5f5a3e76ad44711d0`. No
package implementation or publication occurred in that leaf.

#### 17.3 — Public package implementation and release automation

- Update the package manifest for explicit public access and version `0.3.0`,
  preserving the `sdd` executable, ESM/library exports, Node.js baseline,
  versioned schemas, bundled production dependencies, and repository Skill
  payload required by the canonical contract.
- Support and document exact local installation as development tooling and the
  cross-platform `npm exec -- sdd ...` invocation; do not require a global
  executable or rely on ambiguous PATH fallback.
- Add a least-privilege release workflow that binds one immutable Git subject
  to one npm artifact and uses the confirmed current trusted-publishing and
  provenance mechanism. It must not expose a long-lived npm token, run on an
  unreviewed subject, or make ordinary CI and product commands publish-capable.
- Extend Requirement-named tests and package smoke coverage for public manifest
  metadata, exact packed inventory, executable wiring, lifecycle-hook absence,
  README commands, and unchanged private-tarball installation.

Done when the release implementation is complete and locally verifiable but no
package has been published.

**Completed 2026-08-08.** The manifest and lockfile now identify the explicit
public `sdd-yo@0.3.0` package, while the CLI and packaged Skill expose the same
compatibility identity and the offline tarball route remains inert and exact.
The README documents exact development installation and
`npm exec --package=sdd-yo@0.3.0 -- sdd ...` without a global executable. The
new `publish.yml` runs only for a published release through the protected
`release` environment, binds the release tag, commit, package identity, and
exact tarball, grants only repository read and OIDC permissions, and publishes
with public access and provenance without an npm token. Requirement-named tests
cover the public manifest, workflow, identity, packed inventory, Skill binding,
inert lifecycle, commands, and retained offline installation. The complete
repository validation suite passed; the ignored 17.2 candidate was temporarily
externalized during root-project checks and restored unchanged afterward. No
registry request, publication, tag, release, approval, QA decision, branch,
commit, push, or plugin change occurred.

#### 17.4 — Release rehearsal and exact artifact review

- Build and pack one release candidate from the exact selected Git subject;
  retain its version, full inventory, sizes, integrity hashes, provenance input,
  and package-manager output without writing the tarball into tracked source.
- Exercise clean ordinary npm and isolated Yarn Plug'n'Play consumers, including
  package identity, `npm exec -- sdd --version --format json`, repository Skill
  installation, initialization, first validation, and outside-root sentinels.
- Run an npm publication dry run and the complete repository validation suite.
  Treat network failure, unavailable authentication, incomplete output, or a
  changed artifact as failure rather than publication readiness.

Done when one exact release candidate and publication command are reviewable.
No commit, tag, GitHub release, npm publication, approval, or QA verdict is
implied.

**Completed 2026-08-08.** The retained candidate was built from exact Git
subject `da3365ae58051facf9eb520b2b2db5116697c8a2` as
`sdd-yo-0.3.0.tgz` with 2,125 entries, packed size 1,145,468 bytes, unpacked
size 5,964,868 bytes, SHA-256
`65a7f9f95684085ad54af828e32e5cb64bad2a9f1f3e1ce7769841cf04d4fae8`,
and npm integrity
`sha512-kr+RaJzHXEmtPEu/Dz+1zebmSkX6m+aAoBrda9Cu4M8erYquPhswcGhLaG6dWssy2ImE6Jo2IaRgNYuRzUjHCg==`.
The clean offline npm consumer reported the exact compatibility identity
through `npm exec`; package smoke passed the isolated Yarn Plug'n'Play Skill
installation, initialization, first validation, and outside-root checks. The
npm publication dry run and complete repository validation suite passed. Exact
command output, full inventory, artifact, hashes, provenance input, validation
context, and the non-publishing command remain under ignored
`.sdd/staging/milestone-17.4/`. The dry run did not exercise GitHub Actions OIDC
authentication and makes no publication-readiness claim. No registry write,
publication, branch, commit, tag, push, GitHub release, approval, QA verdict,
plugin artifact, or marketplace action occurred.

#### 17.5 — Explicit public npm publication

- After separate authorization, publish only the retained reviewed artifact
  through the selected least-privilege release route. Refuse a changed Git
  subject, version, package inventory, integrity hash, access mode, publisher,
  or provenance configuration.
- Verify the immutable public registry response, package metadata, dist-tag,
  integrity and provenance records, and retain the exact publication subject.
  Do not overwrite or reuse an existing version.

Done when `sdd-yo@0.3.0` is publicly resolvable with the reviewed identity and
evidence. Publication does not authorize a plugin submission, Git merge, or
release announcement.

#### 17.6 — Public consumer evidence and closeout

- Install exact `sdd-yo@0.3.0` from the public registry into fresh Linux,
  macOS, and Windows consumers without a source checkout or private artifact.
- Verify the CLI, library, declarations, schemas, repository Skill installation
  and compatibility binding, incremental initialization, and first validation;
  retain platform, Node/npm, package-integrity, CLI-identity, command, and
  filesystem-write evidence.
- Update the public quickstart and recovery guidance to distinguish registry
  installation from the retained offline-tarball route, then run the complete
  validation suite and the normal milestone closeout procedure.

Milestone 17 is done only when the public artifact is independently installable
on every claimed platform, documentation matches the verified commands, and
the exact execution record is archived. It does not publish or install a Codex
plugin.

### Planned Milestone 18 — Codex plugin with bundled CLI

After Milestone 17 closes, distribute `sdd-yo` as an installable Codex plugin
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

Milestone 17.5 only: after separate explicit authorization, publish only the
retained reviewed `sdd-yo@0.3.0` artifact through the protected trusted-publisher
route, refuse any subject, identity, inventory, integrity, access, publisher,
or provenance drift, and verify the immutable registry response. Do not infer
plugin submission, Git integration, approval, QA, or release-announcement
authority.
