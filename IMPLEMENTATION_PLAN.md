# SDD Yo implementation plan

## Status

- Active: Milestone 24 — history-free object ID generation
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

## Milestone 24 — History-free object ID generation

Milestone 24 is active. Its immediate leaf is semantic-contract confirmation;
implementation does not begin until the normal governed proposal sequence has
completed.

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

### Leaves

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

### Immediate leaf

Milestone 24.1 is next. It confirms only the semantic model and boundaries for
history-free object ID generation. It does not generate IDs, author a candidate,
record approval, apply a patch, change implementation, mutate Git, publish, or
release.

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

Milestone 24 is active. Other possible future milestones remain deliberately
uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
