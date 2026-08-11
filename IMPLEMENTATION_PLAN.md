# SDD Yo implementation plan

## Status

- Active: Milestone 19.7 — Public `0.5.0` release and closeout
- Complete: Milestones 0–18, Milestones 19.1–19.6, and public `sdd-yo@0.4.1`
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

## Milestone 19 — Normal Change workflow optimization

### Outcome

Make the normal `spec-code`, `spec`, and `code` workflows shorter and safer for
a human working through the `sdd-yo` Agent Skill. Replace manual candidate and
ProposalPackage handoffs with one deterministic artifact path, specialize the
mechanical route by mode, and remove redundant validation work without
weakening semantic confirmation, exact-subject approval, explicit SpecPatch
application, verification, or merge-readiness boundaries.

The intended human interaction has three decision points: confirm the complete
ID-free semantic model for `spec-code` and `spec`, decide the exact validated
ProposalPackage for every mode, and explicitly select an exact SpecPatch for
application only when the specification changes. Deterministic work between
those decisions may be composed by the Skill, but remains implemented and
validated by the CLI rather than reimplemented in prompts.

Milestone 19 produces one clean `0.5.0` contract. It assumes no existing user
depends on a `0.4.x` configuration, workflow artifact, command shape, Skill
route, installation binding, or retained package. Design and implementation
target only the final `0.5.0` behavior; no compatibility layer, migration,
deprecation period, legacy reader, fallback, or conversion path is required.

Existing canonical Requirements expected to change or gain related behavior
include `REQ-E26A859E`, `REQ-8DE9E078`, `REQ-E80F09C6`, `REQ-A8739118`,
`REQ-A3C3B779`, `REQ-2C8E8085`, `REQ-32C76ED3`, `REQ-26234DC8`,
`REQ-D17B2FB9`, `REQ-F7D39246`, `REQ-7C848ED0`, `REQ-7AFE9904`,
`REQ-97D96950`, `REQ-A2199BC2`, and `REQ-B0B35D6D`. Implementation and test
changes must retain exact Requirement traceability after the governed
specification Change establishes the final contract.

### Boundaries

- Deliver the workflow optimization through one bounded normal `spec-code`
  Change before implementing it. The milestone plan is not an alternate route
  for changing canonical Requirement meaning.
- Preserve exactly three Change modes. Tests and QA do not select a mode, and
  ordinary maintenance remains outside the Change workflow.
- Keep the semantic-model checkpoint for `spec-code` and `spec`, explicit
  human approval for the exact proposal subject, and separate explicit
  application authorization for a non-empty specification patch.
- The CLI remains deterministic, provider-neutral, offline-first, and driven
  by explicit versioned artifacts. No hidden durable workflow database or
  prompt-owned fingerprint, delta, patch, or approval rule is introduced.
- Treat every affected `0.4.x` configuration, artifact format, CLI option,
  wrapper route, Skill instruction, fixture, and installation binding as
  nonexistent. Remove superseded surfaces instead of detecting, reading,
  converting, documenting, or testing them.
- Select schema and Skill protocol versions solely for the final `0.5.0`
  contract. The compatibility identity binds the exact `0.5.0` package, CLI,
  schema, and Skill protocol that belong together and rejects a mixed
  installation; it makes no backward-compatibility promise.
- `code` keeps the active specification byte-for-byte unchanged and targets
  exact active Requirement IDs. It must not create or apply an empty
  SpecPatch merely to pass through a specification-oriented route.
- Candidate, package, approval, patch, verification, QA, and Git authorities
  remain distinguishable. No command creates a branch, commit, push, merge,
  approval decision, QA decision, publication, or release as an implied side
  effect.
- Exact package version `0.5.0` and its public release are milestone outcomes.
  Version synchronization, immutable artifact preparation, Git operations,
  npm publication, and release verification remain separate leaves and
  explicit authorities; this plan does not itself authorize any of them.
- Linux and Windows support, a Codex plugin, hosted workflow state, migration
  notes, legacy compatibility documentation, and changes to the canonical
  Markdown dialect unrelated to the optimized workflow are out of scope.

### 19.1 — Workflow optimization semantic contract and candidate

- Inspect only the active authoring, proposal, approval, exact-patch, CLI, and
  Skill Requirements needed for this Change.
- Present one complete ID-free semantic model covering the artifact handoff,
  mode-specific routes, human stops, post-pause freshness, failure behavior,
  and the boundary between Skill orchestration and CLI authority.
- Stop for explicit human confirmation. Any semantic correction invalidates
  the earlier confirmation and requires the complete model to be presented
  again.
- After unchanged confirmation, generate any new object IDs through the
  compatible CLI, materialize one bounded `spec-code` candidate, and validate
  it against the exact selected base without modifying canonical `spec/`.

Done when the complete confirmed model has one valid unapplied candidate with
its exact normative delta, affected scope, and unresolved semantic-review
decisions presented for review. This leaf creates no canonical specification
change, approval evidence, exact patch, runtime or Skill implementation, QA
verdict, package-version change, publication, or Git operation.

### 19.2 — Governed workflow optimization specification Change

- Run Proposal Gate for only the retained 19.1 candidate and exact base; do not
  reconstruct or silently revise its confirmed semantic model.
- Record only an identified human's explicit decision after displaying and
  revalidating the exact proposal subject.
- Prepare an exact SpecPatch only from retained current inputs, present its
  behavior and consequence, and stop for separate application authorization.
- Apply only the unchanged explicitly selected patch and validate the resulting
  canonical specification.

Done when the approved workflow behavior is canonical and valid. Stop before
CLI or Skill implementation, test execution, QA, package identity changes,
publication, or Git operations unless each is separately requested.

### 19.3 — Deterministic candidate and ProposalPackage handoff

- Add one safe explicit route from a confirmed authored candidate to a complete
  candidate artifact and an exact retained ProposalPackage without manual JSON
  transcription.
- Keep candidate content explicit and reviewable, write only to a selected
  bounded staging location outside canonical `spec/`, and reject traversal,
  symlink escape, existing-target replacement, partial output, and changed
  inputs.
- Validate the complete candidate graph and retain the exact CLI-produced
  package bytes atomically with project, base, candidate-tree, object-delta,
  affected-scope, mode, and code-target bindings intact.
- Cover interruption, malformed content, stale base, unsafe paths, duplicate
  IDs, output collision, and byte-for-byte reproducibility with
  Requirement-named tests and versioned fixtures.

Done when the Skill can obtain a reviewable candidate and retained exact
ProposalPackage through deterministic CLI operations without copying JSON from
chat or stdout and without changing the active specification or Git state.

Implemented and verified for `REQ-20D8EC8C`: `proposal materialize` publishes
one new ignored two-member bundle through an atomic writer boundary, rejects
unsafe, changed, malformed, stale, or colliding inputs, and leaves the active
specification and Git state unchanged.

### 19.4 — Mode-specific mechanical routes

- Preserve the shared mode-selection and ProposalPackage semantics while
  specializing the work required after selection.
- For `spec-code` and `spec`, retain the non-empty semantic delta, exact
  candidate, approval, preparation, and explicit SpecPatch application path.
- For `code`, derive the unchanged candidate subject directly from the selected
  base and exact Requirement targets, bind their current semantic and
  structural fingerprints, and proceed from approved proposal to
  implementation verification without preparing or applying an empty patch.
- Keep affected-scope, evidence freshness, semantic review, test discovery,
  QA, findings, and Merge Gate behavior explicit and mode-correct.
- Add Requirement-named unit, CLI, contract-fixture, and end-to-end coverage for
  all three successful routes and for attempted mode switching or invalid
  deltas.

Done when every mode performs only its necessary mechanical work and the final
`0.5.0` contract has complete explicit bindings and gate evidence without any
retained legacy route.

Implemented and verified for `REQ-5FFEC13F` and `REQ-A8739118`: code mode
derives its unchanged subject from the resolved base, retains only an exact
package with bound active Requirement targets, and is rejected by SpecPatch
preparation while specification-changing modes keep the bundle-and-patch path.

### 19.5 — Composed Skill orchestration and approval freshness

- Update the Skill so one explicitly selected authoring route may compose ID
  generation, bounded candidate materialization, proposal validation, exact
  package retention, and reviewer-oriented presentation after an unchanged
  semantic confirmation.
- Keep the three human decision points visually and semantically distinct;
  confirmation never becomes approval, and approval never becomes patch
  application or implementation authority.
- Before requesting approval, revalidate and display the exact retained
  subject. After the pause, rely on the recorder's atomic current-subject
  revalidation and accept success only when its returned subject exactly
  matches what the human saw; do not perform a redundant separate validation
  pass when this invariant is satisfied.
- Present the semantic model, object delta, affected scope, file map, and
  focused review questions by default. Keep exact candidate bytes and technical
  artifacts available on request without forcing complete file bodies through
  conversational context.
- Add Skill evals for corrections, stale pauses, rejection, changed candidates,
  artifact-write failures, each mode-specific route, and every authority stop.

Done when the Skill provides one continuous, progressive-disclosure workflow
over deterministic CLI JSON while remaining thin and making no human decision
or product-rule computation itself.

Implemented and verified for `REQ-32C76ED3`, `REQ-26234DC8`, and
`REQ-D17B2FB9`: the Skill revalidates and displays one retained subject before
the approval pause, invokes the recorder once afterward, accepts only the same
complete recorder-returned subject, and preserves correction, rejection,
mode-specific, and downstream authority stops through focused evals.

### 19.6 — Clean `0.5.0` release candidate and integrated proof

- Run representative end-to-end `spec-code`, `spec`, and `code` workflows in
  isolated repositories, including retained artifacts, human-decision pauses,
  exact patch behavior where applicable, implementation verification, and
  merge-readiness recomputation.
- Remove superseded `0.4.x` command paths, configuration and artifact readers,
  Skill instructions, fixtures, diagnostics, compatibility branches, and tests
  instead of retaining migration or deprecation behavior.
- Synchronize exact version `0.5.0` across the package manifest, lockfile, CLI
  identity, schemas and fixtures where applicable, Skill metadata and binding,
  installation inventories, documentation, and package assertions.
- Update CLI help, schemas, fixtures, architecture, Skill references, evals,
  README guidance, and package smoke coverage for the final command and
  artifact contract.
- Build and retain one exact offline and public-registry-shaped `0.5.0` package
  artifact, verify its inventory, compatibility identity, CLI, library,
  schemas, repository Skill, macOS user Skill lifecycle, and absence of hidden
  network or migration work.
- Run the focused checks and the full repository validation suite and inspect
  the exact candidate diff. A successful pack or dry run is not publication
  authorization.

Done when one reviewed immutable `sdd-yo@0.5.0` artifact implements only the
new workflow contract, passes the complete repository and package proof, and
is ready for a separately authorized public release.

Implemented and verified: the final bundle-only workflow contract and exact
`0.5.0` identity pass representative isolated `spec-code`, `spec`, and `code`
CLI workflows plus the complete repository and package proof. The retained
release candidate has SHA-256
`af6abc82173d0d31dc579672bde939c186d6d221f41383536a53c02d89298835`,
inventory SHA-256
`db26f2f8520dee2e2717039e771ddd666b11edeaf9814fd77676b4b09c1f646d`,
and 2,138 entries. No publication, tag, push, or release authority was inferred.

### 19.7 — Public `0.5.0` release and closeout

- After separate publication authorization, publish only the reviewed exact
  `0.5.0` artifact from one immutable subject through the protected release
  route and verify registry identity, integrity, provenance, and selected tag.
- In a fresh macOS environment with no retained SDD Yo configuration,
  artifacts, installation, or cache, install the exact public package and
  complete representative first-use workflows through its bound user Skill
  and private CLI.
- Record automated release evidence separately from any identified human
  first-use review. Neither source creates approval, QA, Git, or merge
  authority for a target SDD Project.
- Update current canonical documentation with the final supported `0.5.0`
  behavior and limitations, run the required closeout checks, inspect the exact
  diff, and compact this plan according to `plans/README.md`.

Done when exact `sdd-yo@0.5.0` is public, a clean macOS consumer proves the
packaged CLI and Skill workflow without legacy state, all release evidence is
current, and Milestone 19 is closed. Git commit, push, tag, publication, and
human review remain separately authorized actions even when this leaf is
active.

Milestone 19 is done when a developer can complete each normal Change mode
without manually materializing or transcribing workflow artifacts, `code`
performs no specification-patch ceremony, the Skill retains only the necessary
human stops, no legacy configuration or artifact path is retained, and exact
public `sdd-yo@0.5.0` preserves all deterministic bindings, freshness checks,
safety boundaries, and merge-readiness guarantees.
