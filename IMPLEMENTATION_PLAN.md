# SDD Yo implementation plan

## Status

- Active: Milestone 22 — public `sdd-yo@0.5.1` patch release
- Complete: Milestones 0–21 and public `sdd-yo@0.5.0`
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
CLI are implemented and verified. Normal `spec-code` and `spec` Changes retain
one candidate-and-package bundle. A Skill-owned authored candidate is created
outside the repository through the host temporary boundary and removed after
successful bundle retention; failures preserve it, caller-owned candidates are
not removed, and `code` creates no candidate directory. `code` retains one
package-only bundle and performs no specification-patch ceremony. Proposal
validation, approval recording, preparation, and merge checks consume the exact
retained bundle; superseded `0.4.x` handoff routes are absent.

Exact `sdd-yo@0.5.0` is public on npm from annotated tag `v0.5.0`. Its registry
tarball matches the retained reviewed artifact with SHA-256
`9999ad5cfaf4e5c594222213854ddddf1e4620a6cf9d2f8972927426c68110e9`,
inventory SHA-256
`db26f2f8520dee2e2717039e771ddd666b11edeaf9814fd77676b4b09c1f646d`,
and 2,138 entries. The public package, CLI identity, library, schemas,
repository Skill, and macOS user-scoped private CLI and wrapper are verified.

## Milestone 22 — Public `sdd-yo@0.5.1` patch release

### Outcome

Publish one immutable `sdd-yo@0.5.1` artifact from annotated tag `v0.5.1`
through the protected GitHub `release` environment and npm trusted publishing.
The patch release changes only the exact package and CLI version identity; its
runtime behavior, schema and Skill protocol majors, Node.js baseline, package
inventory boundaries, and macOS-only user-scoped lifecycle remain unchanged.

### Requirement traceability

- `REQ-B0B35D6D` — bind the registry, offline artifact, and documented commands
  to exact version `0.5.1`.
- `REQ-A2199BC2` — keep package, CLI, schema, and Skill surfaces on one exact
  compatibility identity.
- `REQ-ABFFEAF2` — publish only from the immutable reviewed release subject
  through protected OIDC trusted publishing.
- `REQ-0163273A` — retain exact artifact hashes, inventory, registry identity,
  and provenance evidence.

### Leaves

- [x] 22.1 — confirm the ID-free semantic model, retain and review the
      `spec-code` proposal, record explicit ApprovalEvidence, and apply its exact
      SpecPatch.
- [x] 22.2 — update package identity, user documentation, compatibility tests,
      Skill payload identity, and the release workflow for `0.5.1`.
- [x] 22.3 — pack the exact release tarball, verify package smoke, and bind its
      SHA-256, sorted inventory SHA-256, and entry count into the workflow tests.
- [ ] 22.4 — run full validation, commit and push the immutable subject, create
      and push annotated tag `v0.5.1`, publish the GitHub Release, and verify npm
      registry identity, integrity, provenance, and exact consumer installation.

### Exclusions

- no runtime feature, schema-major, Skill-protocol, or Node.js-baseline change;
- no Linux or Windows user-scoped lifecycle;
- no Codex plugin, hosted state, or unrelated refactor;
- no token-based npm publication or local `npm publish`.

### Done condition

Milestone 22 is complete only when the exact tagged artifact is public as npm
`latest`, its registry bytes and inventory match the reviewed release subject,
provenance links it to `briginas/sdd-yo` and `publish.yml`, an isolated exact
consumer smoke succeeds, and the active plan is compacted to the next state.

The reviewed npm `11.16.0` candidate has artifact SHA-256
`58d63d00103b06ef70539256bafd18b3faac5fb62dc4ba9d1bc52d9f0141dc8c`,
sorted inventory SHA-256
`db26f2f8520dee2e2717039e771ddd666b11edeaf9814fd77676b4b09c1f646d`,
and 2,138 entries; two independent packs matched byte-for-byte and package
smoke passed.

## Candidate backlog

No candidate is selected. Possible future milestones remain deliberately
uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
