# SDD Yo implementation plan

## Status

- State: active
- Current phase: Bootstrap / Stage 0 contract fixtures
- Current leaf: 0.3 Markdown grammar fixtures
- Last updated: 2026-07-30
- Target product behavior: [`proposal/spec/README.md`](proposal/spec/README.md)
- Architecture map:
  [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Bootstrap procedure:
  [`proposal/architecture/bootstrap.md`](proposal/architecture/bootstrap.md)

## Objective

Deliver a language-independent, offline-first SDD governance tool consisting
of:

1. a deterministic TypeScript library;
2. a thin `sdd` CLI with versioned JSON output;
3. language-independent test adapter protocols;
4. exact, approval-bound proposal and merge-readiness artifacts;
5. an optional progressive-disclosure Agent Skill built only after the CLI is
   stable.

## Current state

The repository contains an approved target specification and architecture but
no executable implementation. The target package is intentionally outside
canonical `spec/`; the first implemented slices will promote only the
Requirements they satisfy.

The root commit is:

```text
63ab70f docs: add SDD Yo specification package
```

## Fixed decisions

- Implementation language: TypeScript.
- Runtime baseline: Node.js 22+.
- Module system: ESM.
- Package manager: npm.
- CLI binary: `sdd`.
- Core has no network or telemetry requirement.
- Core modules do not depend on an AI provider.
- JSON and JSONL are automation protocols; human output is a view.
- Git, filesystem, process, clock, and randomness are injected boundaries.
- Initial implementation is a modular monolith, not a multi-process or
  multi-agent system.
- The Agent Skill is post-core and cannot fabricate external evidence.

## Delivery rules

- Each implementation milestone uses one explicit mode.
- A `spec-code` milestone promotes only the target Requirements implemented in
  that branch.
- Canonical `spec/` never contains an unimplemented target Requirement.
- A promoted Requirement is removed from the remaining proposal model or
  otherwise represented once in normative form; two editable normative copies
  are not allowed.
- Every milestone defines exact inputs, outputs, failure behavior, tests, and a
  done condition.
- Each leaf should be independently reviewable and normally fit one focused
  commit.
- No later milestone is required to validate an earlier leaf.

## Target module map

```text
src/
  cli/             Argument parsing, JSON/human rendering, exit mapping.
  config/          Project discovery and strict configuration parsing.
  markdown/        UTF-8 Markdown/frontmatter/marker parser.
  model/           Typed CAP/REQ/CON values and invariants.
  graph/           Link resolution, ownership, reachability, dependencies.
  fingerprint/     Canonical JSON and versioned SHA-256 fingerprints.
  git/             Read-only refs, history, merge-base, and tree access.
  proposal/        Proposal packages, three-way preparation, exact patches.
  tests/            Adapter protocols, JUnit import, indexes, execution evidence.
  evidence/         Approval, QA, test, governance, and resolution validation.
  findings/         Deterministic candidates and finding schemas.
  gate/             Proposal, Branch Preparation, Verification, Merge decisions.
  platform/         Injected filesystem, process, clock, randomness boundaries.
  schemas/          Typed artifact definitions and generated JSON Schemas.
```

The public library surface must not depend on terminal globals or implicit
process state.

## Milestone 0 — Bootstrap contract fixtures

Mode: repository maintenance. No observable `sdd` behavior exists yet and no
canonical product Requirement is promoted.

Goal: turn the architecture prose into executable contracts before runtime
implementation.

### 0.1 Contract inventory

- [x] Create a machine-readable inventory of every version 1 Markdown,
      artifact, JSONL, diagnostic, and gate contract.
- [x] Map each contract and fixture family to the target `REQ-*` identifiers it
      will eventually verify.
- [x] Mark normative schema fields, optional provenance, ordering rules, size
      limits, and compatibility behavior.
- [x] Validate that the inventory has no artifact name or schema-version
      conflicts.

Artifact:
[`contracts/v1/inventory.json`](contracts/v1/inventory.json).

Done when one reviewer can enumerate every required schema and fixture from
the inventory without searching prose.

### 0.2 Artifact schemas

- [x] Materialize JSON Schemas for ChangeDescriptor, CandidateTreeManifest,
      ProposalPackage, SpecPatch, ApprovalEvidence, TestIndex,
      TestExecutionEvidence, QAEvidence, GovernanceEvidence, Finding,
      FindingResolution, HumanSemanticReviewEvidence,
      SemanticAnalysisInputManifest, ConflictReport, VerificationReport, and
      MergeReport.
- [x] Add valid, minimally valid, maximally representative, malformed, unknown
      major, unknown field, wrong project, and wrong subject fixtures.
- [x] Confirm generated schemas and TypeScript types will come from one source.

Primary target Requirements:
`REQ-64DB876B`, `REQ-7C848ED0`, `REQ-A76942A0`, `REQ-82256D82`.

Bounded leaves:

- [x] **0.2a — Schema foundation and ChangeDescriptor.** Select checked-in
      Draft 2020-12 JSON Schemas as the Stage 0 typed source, add shared
      definitions, materialize ChangeDescriptor, and add its schema and
      contextual fixture matrix. Target Requirements: `REQ-E26A859E`,
      `REQ-7341DBB7`, `REQ-64DB876B`.
- [x] **0.2b — Remaining artifact schemas.** Materialize the other fifteen
      inventory artifact schemas without adding runtime dependencies.
- [x] **0.2c — Complete artifact fixture matrix.** Add the required valid,
      boundary, malformed, compatibility, project, and subject cases for the
      remaining artifacts.

Artifact:
[`fixtures/v1/artifacts/cases.json`](fixtures/v1/artifacts/cases.json).

### 0.3 Markdown grammar fixtures

- [ ] Add golden index, Capability, Capability fragment, Requirement, and
      Concept documents.
- [ ] Add invalid frontmatter, marker, anchor, relation, ownership,
      reachability, duplicate ID, and portable-link cases.
- [ ] Add semantic/structural/explanatory change pairs.
- [ ] Include UTF-8 and normalized line-ending cases.

Primary target Requirements:
`REQ-DD91AD0F`, `REQ-8602BF02`, `REQ-0EF66B28`, `REQ-EAC56CB1`,
`REQ-8ACBC52D`, `REQ-065A9911`, `REQ-40A38BA1`, `REQ-8D157EBE`,
`REQ-99605FAB`, `REQ-F3A241BE`, `REQ-7D93D64A`.

### 0.4 Fingerprint and delta goldens

- [ ] Define canonical JSON byte fixtures for every model object.
- [ ] Define semantic, structural, verification, and explanatory delta truth
      tables.
- [ ] Include ordering, path move, title, rationale, relation set, acceptance
      order, and Unicode cases.
- [ ] Version every canonicalization fixture explicitly.

Primary target Requirements:
`REQ-13CF54D6`, `REQ-1095E571`, `REQ-B25091A0`, `REQ-AFD65A03`.

### 0.5 Gate truth tables

- [ ] Encode all valid and invalid `spec-code`, `spec`, and `code` mode input
      combinations.
- [ ] Encode Proposal, Branch Preparation, Verification, and Merge outcomes.
- [ ] Cover `PASS`, `REVIEW_REQUIRED`, `BLOCKED`, and technical failure.
- [ ] Cover stale, missing, negative, and contradictory evidence.

Primary target Requirements:
`REQ-E26A859E`, `REQ-983914F3`, `REQ-FB76FC6F`, `REQ-13CE0529`,
`REQ-7341DBB7`, `REQ-9D265509`, `REQ-BCFA15D8`, `REQ-41EDF9A3`,
`REQ-E85A06C3`, `REQ-8E2D9A5F`.

### 0.6 Test adapter contract kit

- [ ] Add valid discovery and execution JSONL streams.
- [ ] Cover suite inheritance, multiple Requirements, empty suites, unknown
      Requirements, duplicate local IDs, cycles, malformed UTF-8, truncation,
      timeout, overflow, and non-zero exit.
- [ ] Add representative JUnit fixtures with retained and lost hierarchy.
- [ ] Keep all fixtures language- and framework-neutral.

Primary target Requirements:
`REQ-12E19D70`, `REQ-F7CEE6D0`, `REQ-E451458E`, `REQ-5A832396`,
`REQ-6D8DDDF7`, `REQ-20F8CA5C`, `REQ-72BA737C`.

### 0.7 Security fixture corpus

- [ ] Add traversal, absolute path, separator, reserved-name, symlink, junction,
      case-fold collision, and TOCTOU scenario definitions.
- [ ] Add malicious JSONL and XML fixtures with external entities disabled.
- [ ] Add argv versus shell-metacharacter cases.
- [ ] Add evidence replay and subject-confusion cases.
- [ ] Add repository prompt-injection cases for the future Agent Skill.

Primary target Requirements:
`REQ-7AFE9904`, `REQ-1DD46CA9`, `REQ-F91F7D11`, `REQ-E85A06C3`.

### 0.8 Stage 0 verifier

- [ ] Add one repository command that validates fixture manifests, JSON
      examples, link targets, ID formats, duplicate fixture names, and truth
      table completeness.
- [ ] Run it on macOS, Linux, and Windows CI.
- [ ] Document every check and its failure output.

Done when all Stage 0 contracts are machine-checkable and no CLI behavior is
claimed.

## Milestone 1 — Project scaffold and contract types

Mode: repository maintenance until a public command produces defined behavior.

- [ ] Create `package.json`, lockfile, strict `tsconfig.json`, source/test
      directories, build, typecheck, test, format-check, and fixture-check
      scripts.
- [ ] Select and pin the smallest dependency set after focused spikes.
- [ ] Define branded IDs, schema versions, diagnostics, result envelopes, and
      injected platform interfaces.
- [ ] Generate JSON Schemas and TypeScript types from one source.
- [ ] Add package and executable smoke tests without claiming full commands.

Done when a clean clone can install, build, typecheck, test, and validate all
Stage 0 fixtures deterministically.

## Milestone 2 — Read-only specification vertical slice

Mode: `spec-code`.

Promote only the Requirements implemented by the selected leaf.

### 2.1 Project resolution and configuration

Implement nearest/explicit config resolution and strict schema parsing.

Primary target Requirements:
`REQ-0361538D`.

This leaf establishes configuration isolation used later by
`REQ-FBB24D6C`; it does not complete cross-project graph validation or the
project-wide portability guarantee.

### 2.2 Markdown parsing and object identity

Implement typed documents, Requirement blocks, stable anchors, and model
objects without graph traversal.

Primary target Requirements:
`REQ-DD91AD0F`, `REQ-8602BF02`, `REQ-0EF66B28`, `REQ-EAC56CB1`,
`REQ-065A9911`, `REQ-40A38BA1`.

### 2.3 Graph validation

Implement entrypoint reachability, ownership, typed links, relation rules,
cross-project isolation, and stable diagnostics.

Primary target Requirements:
`REQ-8D157EBE`, `REQ-99605FAB`, `REQ-F3A241BE`, `REQ-7D93D64A`,
`REQ-13CF54D6`.

### 2.4 Fingerprints

Implement canonical AST values, canonical JSON bytes, SHA-256, and separate
semantic/structural fingerprints.

Primary target Requirements:
`REQ-8ACBC52D`, `REQ-1095E571`.

Verification fingerprints from `REQ-B25091A0` remain incomplete until TestIndex
support exists.

### 2.5 First CLI surface

Implement deterministic JSON and human views for `validate` and `inspect`,
including exit codes `0`, `1`, and `3`.

Primary target Requirements:
`REQ-7C848ED0`.

This leaf contributes to the full CLI surface in `REQ-F7D39246`; that
Requirement is promoted only after every named version 1 operation exists.
Merge-specific exit mapping in `REQ-41EDF9A3` remains deferred.

Done when SDD Yo validates its first canonical Requirement subset and produces
byte-identical JSON/fingerprints across repeated runs.

## Milestone 3 — Initialization, IDs, trace, and diff

Mode: `spec-code`.

- [ ] Implement non-overwriting `sdd init`.
- [ ] Implement cryptographically random IDs and canonical-history reuse
      checks.
- [ ] Implement reverse relations, `trace`, object deltas, and `diff`.
- [ ] Handle shallow history and opaque Git object IDs.

Primary target Requirements:
`REQ-382BBBD6`, `REQ-BFC18F28`, `REQ-2C8E8085`, `REQ-FDD51416`,
`REQ-AFD65A03`.

## Milestone 4 — Test discovery and QA scope

Mode: `spec-code`.

- [ ] Implement JSONL discovery import and command adapter boundary.
- [ ] Implement JUnit-compatible import.
- [ ] Build deterministic TestIndex and suite-name inheritance.
- [ ] Compute affected Requirements and Capabilities.
- [ ] Validate execution and QA evidence freshness and coverage.

Primary target Capability:
`CAP-15DBC157`.

Also completes verification fingerprints in `REQ-B25091A0` and transitive
affected scope in `REQ-89AFB91E`.

## Milestone 5 — Proposal and exact patch

Mode: `spec-code`.

- [ ] Implement ProposalPackage validation for all three modes.
- [ ] Implement Git three-way comparison and conflict candidates.
- [ ] Implement exact create/replace/delete SpecPatch.
- [ ] Implement path/symlink safety and all-or-nothing apply.
- [ ] Add interruption and stale-base tests.

Primary target Requirements:
`REQ-E80F09C6`, `REQ-A8739118`, `REQ-3BF12AAD`, `REQ-7AFE9904`,
`REQ-964B9F80`.

## Milestone 6 — Evidence, findings, and merge readiness

Mode: `spec-code`.

- [ ] Validate approval, test, QA, governance, and finding artifacts.
- [ ] Generate deterministic semantic candidates.
- [ ] Validate optional model findings without calling a provider in core.
- [ ] Implement finding resolution eligibility and freshness.
- [ ] Implement Verification and Merge gates and deterministic MergeReport.
- [ ] Confirm that no code path performs Git merge side effects.

Primary target Capabilities:
`CAP-F31EF876`, `CAP-205F5DBC`.

Also completes Concept impact in `REQ-B5815BB5`, the full CLI surface in
`REQ-F7D39246`, and merge-specific exit mapping in `REQ-41EDF9A3`.

## Milestone 7 — Existing-project dogfood

Mode: a sequence of `spec`, `spec-code`, and `code` Changes in fixture or
external projects; SDD Yo remains advisory.

- [ ] Onboard a small single-language project.
- [ ] Onboard a polyglot or multi-framework project.
- [ ] Onboard a monorepo with two independent SDD Projects.
- [ ] Record setup time, adapter work, renamed tests, diagnostics, false review
      candidates, and partial-adoption clarity.
- [ ] Fix recurring problems through contracts, validators, documentation, or
      evals.

## Milestone 8 — Agent Skill

Mode: `spec-code`.

- [ ] Implement one progressive-disclosure `sdd` skill.
- [ ] Route understand/change/baseline/fix/review/prepare/verify/merge intents.
- [ ] Require compatible CLI JSON for every deterministic claim.
- [ ] Add prompt-injection, stale-evidence, fabricated-evidence, and
      cross-project isolation evals.
- [ ] Keep model-assisted semantic review optional.

Primary target Requirements:
`REQ-26234DC8`, `REQ-1DD46CA9`, `REQ-18F84CE2`, `REQ-04F23007`,
`REQ-A76942A0`.

## Milestone 9 — Enforced governed scope

- [ ] Publish operational authorization and rollback guidance.
- [ ] Meet documented performance and cross-platform targets.
- [ ] Complete the MVP checklist in
      `proposal/architecture/evals-and-rollout.md`.
- [ ] Allow external projects to require `PASS` only for declared governed
      scope.

## Deferred scope

- Hosted workflow service or durable workflow database.
- Automatic branch, commit, push, merge, approval, or QA actions.
- Cross-project graph relations.
- Implementation-file links in canonical Requirements.
- Detection of code behavior changes whose author did not update the spec.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.

## Immediate next leaf

`Milestone 0.3 — Markdown grammar fixtures` is the only active implementation
leaf. It must add golden version 1 Markdown documents and invalid grammar,
graph, change-classification, UTF-8, and line-ending cases without adding a
runtime parser. Runtime schema libraries, generated TypeScript types, and CLI
behavior remain deferred to Milestone 1.
