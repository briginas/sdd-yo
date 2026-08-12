# SDD Yo implementation plan

## Status

- Active: Milestone 25 — public `sdd-yo@0.5.2` patch release
- Complete: Milestones 0–23 and public `sdd-yo@0.5.1`
- Last updated: 2026-08-12

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
CLI are implemented and verified. The Skill can additionally normalize one
explicit local feature branch, invalidate evidence after head movement, and
complete an explicitly authorized exact fast-forward with safe local branch
deletion; the CLI remains Git-side-effect-free and every remote operation stays
outside that route. Normal `spec-code` and `spec` Changes retain one
candidate-and-package bundle. A Skill-owned authored candidate is created
outside the repository through the host temporary boundary and removed after
successful bundle retention; failures preserve it, caller-owned candidates are
not removed, and `code` creates no candidate directory. `code` retains one
package-only bundle and performs no specification-patch ceremony. Proposal
validation, approval recording, preparation, and merge checks consume the exact
retained bundle; superseded `0.4.x` handoff routes are absent.

Exact `sdd-yo@0.5.1` is public on npm from annotated tag `v0.5.1` at commit
`877c25c5f76cb7002eccb9ebbad7ddecb81d6f45`. Its registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`58d63d00103b06ef70539256bafd18b3faac5fb62dc4ba9d1bc52d9f0141dc8c`,
inventory SHA-256
`db26f2f8520dee2e2717039e771ddd666b11edeaf9814fd77676b4b09c1f646d`,
and 2,138 entries. npm trusted publishing records SLSA provenance for the
GitHub Actions `publish.yml` subject. The public package, CLI identity, library,
schemas, repository Skill, macOS user-scoped private CLI and wrapper, and an
isolated exact consumer installation are verified.

## Milestone 25 — Public `sdd-yo@0.5.2` patch release

### Outcome

Publish one immutable `sdd-yo@0.5.2` artifact from annotated tag `v0.5.2`
through the protected GitHub `release` environment and npm trusted publishing.
The patch release changes only the exact package and CLI version identity; its
runtime behavior, schema and Skill protocol majors, Node.js baseline, package
inventory boundaries, and macOS-only user-scoped lifecycle remain unchanged.

### Requirement traceability

- `REQ-B0B35D6D` — bind the registry, offline artifact, and documented commands
  to exact version `0.5.2`.
- `REQ-A2199BC2` — keep package, CLI, schema, and Skill surfaces on one exact
  compatibility identity.
- `REQ-ABFFEAF2` — publish only from the immutable reviewed release subject
  through protected OIDC trusted publishing.
- `REQ-0163273A` — retain exact artifact hashes, inventory, registry identity,
  and provenance evidence.

### Leaves

- [x] **25.1 — Govern the exact version change.** Retain and review the
      confirmed `spec-code` candidate, record explicit ApprovalEvidence, prepare
      and explicitly apply its exact SpecPatch.
- [x] **25.2 — Bind the release identity.** Update package identity, user and
      repository documentation, compatibility tests, Skill payload identity,
      and the release workflow for `0.5.2`.
- [x] **25.3 — Reproduce and verify the release artifact.** Produce matching
      independent packs with npm `11.16.0`, bind their exact hashes and
      inventory into the workflow, and run the complete validation baseline.
- [ ] **25.4 — Publish and verify.** Commit and push the immutable subject,
      require successful CI, add the protected `v0.5.2` deployment rule, create
      and push the annotated tag, publish the GitHub Release, and verify npm
      registry bytes, integrity, provenance, and an isolated exact consumer.
- [ ] **25.5 — Close the release milestone.** Compact the durable release
      baseline, create and push the separate closeout commit, and require final
      CI while keeping `v0.5.2` bound to the release subject.

### Exclusions

- no runtime feature, schema-major, Skill-protocol, or Node.js-baseline change;
- no Linux or Windows user-scoped lifecycle;
- no Codex plugin, hosted state, or unrelated refactor;
- no token-based npm publication or local `npm publish`.

### Done condition

Milestone 25 is complete only when the exact tagged artifact is public as npm
`latest`, its registry bytes and inventory match the reviewed release subject,
provenance links it to `briginas/sdd-yo` and `publish.yml`, an isolated exact
consumer smoke succeeds, the active plan is compacted, and final CI passes.

The reviewed npm `11.16.0` candidate has artifact SHA-256
`2129c9ec55e0095aaff96554a2cd120641fa9338e408419a223cdab0c836beba`,
sorted inventory SHA-256
`7d2e69d75debc2639fcc0a9470df3b9494a378b45c831db5e803f47235448079`,
and 2,139 entries; two independent packs matched byte-for-byte.

## Milestone 24 — History-free object ID generation

Milestone 24 is a future candidate, not active work. It has no immediate leaf;
its semantic-contract confirmation begins only when the milestone is explicitly
selected.

### Outcome

Remove canonical-history identifier-reuse checks from object ID generation,
ordinary validation, proposal materialization, and strict merge readiness.
SDD Yo accepts the collision risk of random uppercase eight-hex identifiers and
does not reserve identifiers after their objects leave the active specification.

The CLI continues to require unique object IDs inside every selected active or
candidate specification graph. Proposal and merge operations continue to
resolve their explicit Git refs, validate complete graph and mode invariants,
compute exact deltas and affected scope, and perform their existing three-way
comparison. They no longer walk reachable history solely to discover whether an
otherwise valid active ID belonged to a removed historical object.

### Change mode and affected authority

- Mode: `spec-code`.
- Primary Capability: `CAP-E309CBCB` — Validation, fingerprints, and exact
  patches.
- Existing Requirements requiring normative revision:
  `REQ-2C8E8085`, `REQ-8B656FC5`, and `REQ-FDD51416`.
- Related proposal behavior: `REQ-8DE9E078` — Generate a deterministic
  mechanical ProposalPackage.
- Related Domain Concept: `CON-9F69CC0E` — Requirement.
- No new object identity is generated during milestone planning.

### Selected semantic decision

1. **Generate IDs without canonical-history lookup.**
   - Continue generating cryptographically random uppercase eight-hex `CAP`,
     `REQ`, `CON`, and `SDD` identifiers.
   - Reject duplicates within the selected active or candidate graph.
   - Do not resolve the configured integration ref, enumerate reachable
     commits, parse historical specification trees, or reserve removed IDs for
     `sdd id`.
   - Preserve the version 1 result shape by reporting project-aware generation
     as `history.status: unchecked` with `resolved_ref: null`.
2. **Remove historical reuse as a validation and gate condition.**
   - Ordinary validation does not scan canonical history for removed IDs and
     does not claim that identifier non-reuse was checked.
   - Proposal materialization rejects duplicates in its exact candidate graph
     but does not reject an ID solely because it appeared in older reachable
     history.
   - Strict merge readiness does not require a complete identifier-reuse scan
     and is not blocked solely because that historical check is absent.
   - Git refs, merge bases, current integration state, three-way conflicts,
     exact fingerprints, approval freshness, tests, QA, findings, and all other
     applicable readiness evidence remain authoritative.
3. **Accept reuse after removal.**
   - An identifier remains stable for the lifetime of its active object.
   - After an object leaves the active specification, the same identifier may
     later be generated or assigned again.
   - Historical artifacts remain bound to their original Git subjects and
     fingerprints; identifier text alone is not sufficient historical identity.

### Boundaries

Milestone 24 does not permit duplicate IDs in one active or candidate graph,
shorten or lengthen identifiers, add an ID registry or tombstone file, cache a
history index, weaken ref freshness or three-way Git comparison, change exact
patch behavior, infer approval or QA, add remote operations, publish a package,
or release a version.

### Planned leaves

- [ ] **24.1 — Activate and confirm the complete semantic contract.**
      Revalidate the selected project, present the complete ID-free model and
      boundaries, and obtain explicit confirmation before authoring a governed
      candidate.
- [ ] **24.2 — Author and apply the governed specification proposal.**
      Update the affected Capability, Requirements, Domain Concept, proposal
      behavior, and CLI/Skill contract through one immutable proposal bundle,
      separate human approval, exact patch preparation, and explicit application.
- [ ] **24.3 — Remove identifier-history scans from implementation.**
      Simplify ID generation, validation, proposal materialization, merge
      readiness, diagnostics, JSON result handling, Skill instructions, and
      architecture guidance while preserving active-graph uniqueness and every
      non-ID Git/evidence gate.
- [ ] **24.4 — Verify performance, compatibility, and close the milestone.**
      Add Requirement-named tests and fixtures, prove project-aware ID generation
      performs no reachable-history traversal, run the complete validation and
      package-smoke suite, update canonical documentation, and compact the plan.

### First leaf when selected

Milestone 24.1 confirms only the semantic model and boundaries for history-free
object ID generation. It does not generate IDs, author a candidate, record
approval, apply a patch, change implementation, mutate Git, publish, or release.

### Validation

Milestone 24 requires focused tests proving that:

- project-aware `id` succeeds without resolving or enumerating Git history;
- active and candidate graph duplicates remain invalid;
- reuse of an ID belonging only to a removed historical object is accepted;
- proposal and merge operations retain all non-ID ref, comparison, evidence,
  and freshness gates;
- the version 1 JSON result remains deterministic and compatible; and
- the complete repository validation baseline and package smoke pass.

## Candidate backlog

No milestone or immediate leaf is active. Other possible future milestones
remain deliberately uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
