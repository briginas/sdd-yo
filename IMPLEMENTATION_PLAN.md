# SDD Yo implementation plan

## Status

- State: active
- Current phase: Milestone 6 / Evidence, findings, and merge readiness
- Current leaf: 6.5 — Approval-bound Branch Preparation Gate
- Last updated: 2026-08-01
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

The repository contains an approved target specification and architecture, a
Stage 0 bootstrap verifier, a testable TypeScript library package, generated
contract types, configuration and Markdown parsing, graph validation, the
first implemented canonical `spec/` subset, and implemented `sdd init`, `id`,
`validate`, `inspect`, `trace`, and `diff` operations. Test adapter declarations,
bounded JSONL and JUnit discovery import, normalized suite inheritance, and
deterministic version 1 TestIndex output, TestIndex-backed trace, and
verification fingerprints and deltas, deterministic affected Requirement and
Capability scope, and bounded execution/QA evidence validation are implemented.
The runtime implements deterministic mechanical ProposalPackage generation,
package-bound read-only preparation, ConflictReport output, and exact SpecPatch
generation through the public `proposal prepare` command. Patch application and
Verification and Merge gates remain unimplemented.
Unimplemented target behavior remains under `proposal/spec/` and is promoted
only in verified bounded subsets.

The root commit is:

```text
63ab70f docs: add SDD Yo specification package
```

## Fixed decisions

- Implementation language: TypeScript.
- Runtime baseline: Node.js 22.18+.
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

- [x] **0.3a — Valid Markdown document goldens.** Add minimal and
      representative valid trees covering index, Capability, Capability
      fragment, Requirement, and Concept documents. Target Requirements:
      `REQ-DD91AD0F`, `REQ-8602BF02`, `REQ-0EF66B28`, `REQ-EAC56CB1`,
      `REQ-8ACBC52D`, `REQ-065A9911`, `REQ-40A38BA1`.
- [x] **0.3b — Invalid Markdown grammar and graph fixtures.** Add invalid
      frontmatter, marker, anchor, relation, ownership, reachability,
      duplicate ID, and portable-link cases. Target Requirements:
      `REQ-F3A241BE`, `REQ-7D93D64A`, `REQ-8D157EBE`, `REQ-99605FAB`,
      `REQ-13CF54D6`, `REQ-FBB24D6C`.
- [x] **0.3c — Markdown change-classification pairs.** Add
      semantic/structural/explanatory change pairs. Target Requirements:
      `REQ-8ACBC52D`, `REQ-065A9911`, `REQ-1095E571`.
- [x] **0.3d — Markdown encoding and normalization fixtures.** Add UTF-8 and
      normalized line-ending cases.

Primary target Requirements:
`REQ-DD91AD0F`, `REQ-8602BF02`, `REQ-0EF66B28`, `REQ-EAC56CB1`,
`REQ-8ACBC52D`, `REQ-065A9911`, `REQ-40A38BA1`, `REQ-8D157EBE`,
`REQ-99605FAB`, `REQ-F3A241BE`, `REQ-7D93D64A`, `REQ-13CF54D6`,
`REQ-FBB24D6C`.

Artifacts:
[`fixtures/v1/markdown/documents/cases.json`](fixtures/v1/markdown/documents/cases.json),
[`fixtures/v1/markdown/graph-invalid/cases.json`](fixtures/v1/markdown/graph-invalid/cases.json),
and
[`fixtures/v1/markdown/change-classification/cases.json`](fixtures/v1/markdown/change-classification/cases.json).

### 0.4 Fingerprint and delta goldens

- [x] **0.4a — Canonical object fingerprint goldens.** Define the version 1
      canonical JSON byte contract and add exact canonical bytes and SHA-256
      goldens for every applicable Capability, Requirement, and Concept
      fingerprint class. Cover format, title, path, relation ordering,
      acceptance ordering, and Unicode normalization invariants. Target
      Requirements: `REQ-13CF54D6`, `REQ-8ACBC52D`, `REQ-1095E571`,
      `REQ-B25091A0`.
- [x] **0.4b — Object delta truth tables.** Define add, modify, delete, mixed
      ordering, and semantic, structural, verification, and explanatory delta
      truth tables. Target Requirements: `REQ-24A372E7`, `REQ-AFD65A03`,
      `REQ-B25091A0`, `REQ-7341DBB7`.

Artifact:
[`fixtures/v1/fingerprints/objects/cases.json`](fixtures/v1/fingerprints/objects/cases.json)
and
[`fixtures/v1/fingerprints/deltas/cases.json`](fixtures/v1/fingerprints/deltas/cases.json).

Primary target Requirements:
`REQ-13CF54D6`, `REQ-1095E571`, `REQ-B25091A0`, `REQ-24A372E7`,
`REQ-AFD65A03`, `REQ-7341DBB7`.

### 0.5 Gate truth tables

- [x] **0.5a — Synchronization-mode truth tables.** Encode the complete
      decision-relevant valid and invalid `spec-code`, `spec`, and `code`
      input partitions, including approval-mode binding and target Requirement
      drift. Target Requirements: `REQ-E26A859E`, `REQ-983914F3`,
      `REQ-FB76FC6F`, `REQ-13CE0529`, `REQ-7341DBB7`.
- [x] **0.5b — Four-gate outcome truth tables.** Encode Proposal, Branch
      Preparation, Verification, and Merge outcome composition, including
      `PASS`, `REVIEW_REQUIRED`, `BLOCKED`, blocker precedence, and technical
      failure outside product status. Target Requirements: `REQ-E80F09C6`,
      `REQ-A8739118`, `REQ-964B9F80`, `REQ-9D265509`, `REQ-E451458E`,
      `REQ-5A832396`, `REQ-CDE94D0B`, `REQ-C11ACC55`, `REQ-20AAA622`,
      `REQ-2AF962EB`, `REQ-BCFA15D8`, `REQ-41EDF9A3`.
- [x] **0.5c — Gate evidence-state truth tables.** Cover stale, missing,
      negative, and contradictory evidence without duplicating artifact-schema
      fixtures. Target Requirements: `REQ-E85A06C3`, `REQ-220945C2`,
      `REQ-8E2D9A5F`.

Artifact:
[`fixtures/v1/gates/modes/cases.json`](fixtures/v1/gates/modes/cases.json)
and
[`fixtures/v1/gates/outcomes/cases.json`](fixtures/v1/gates/outcomes/cases.json),
with evidence-state composition in
[`fixtures/v1/freshness/cases.json`](fixtures/v1/freshness/cases.json).

Primary target Requirements:
`REQ-E26A859E`, `REQ-983914F3`, `REQ-FB76FC6F`, `REQ-13CE0529`,
`REQ-7341DBB7`, `REQ-9D265509`, `REQ-BCFA15D8`, `REQ-41EDF9A3`,
`REQ-E85A06C3`, `REQ-220945C2`, `REQ-8E2D9A5F`.

### 0.6 Test adapter contract kit

Bounded leaves:

- [x] **0.6a — JSONL happy path and test selection.** Publish the exact
      TestSelection schema and add valid language-neutral discovery, execution,
      and selection fixtures. Target Requirements: `REQ-12E19D70`,
      `REQ-5A832396`, `REQ-20F8CA5C`, `REQ-72BA737C`.
- [x] **0.6b — JSONL hierarchy and failure matrix.** Cover suite inheritance,
      multiple Requirements, empty suites, unknown Requirements, duplicate
      local IDs, cycles, malformed UTF-8, truncation, timeout, overflow,
      non-zero exit, forward parents, and record-order normalization. Target
      Requirements: `REQ-F7CEE6D0`, `REQ-E451458E`.
- [x] **0.6c — JUnit contract fixtures.** Add representative JUnit fixtures
      with retained and lost hierarchy, deterministic derived IDs, status and
      source mapping, malformed XML, and bounded XML failures. Target
      Requirements: `REQ-6D8DDDF7`, `REQ-12E19D70`.

All adapter fixtures remain language- and framework-neutral.

Artifact:
[`fixtures/v1/adapters/jsonl/cases.json`](fixtures/v1/adapters/jsonl/cases.json).

Primary target Requirements:
`REQ-12E19D70`, `REQ-F7CEE6D0`, `REQ-E451458E`, `REQ-5A832396`,
`REQ-6D8DDDF7`, `REQ-20F8CA5C`, `REQ-72BA737C`.

### 0.7 Security fixture corpus

- [x] Add traversal, absolute path, separator, reserved-name, symlink, junction,
      case-fold collision, and TOCTOU scenario definitions.
- [x] Add malicious JSONL and XML fixtures with external entities disabled.
- [x] Add argv versus shell-metacharacter cases.
- [x] Add evidence replay and subject-confusion cases.
- [x] Add repository prompt-injection cases for the future Agent Skill.

Primary target Requirements:
`REQ-7AFE9904`, `REQ-1DD46CA9`, `REQ-F91F7D11`, `REQ-E85A06C3`.

### 0.8 Stage 0 verifier

- [x] Add one repository command that validates fixture manifests, JSON
      examples, link targets, ID formats, duplicate fixture names, and truth
      table completeness.
- [x] Run it locally on macOS with Node.js 22; defer Linux and Windows
      execution until those environments are available.
- [x] Document every check and its failure output in
      [`docs/stage-0-verifier.md`](docs/stage-0-verifier.md).

Requirement traceability: this is a bootstrap-only repository command and
claims no executable Requirement coverage.

Done when the Stage 0 contract surface is machine-checkable on the current
macOS bootstrap host and no CLI behavior is claimed. Cross-platform execution
evidence remains deferred without removing Windows- or POSIX-specific fixture
definitions.

## Milestone 1 — Project scaffold and contract types (complete)

Mode: repository maintenance until a public command produces defined behavior.

Bounded leaves:

- [x] **1.1 — Direct TypeScript bootstrap verifier.** Add the minimum
      `package.json`, lockfile, and strict `tsconfig.json`; pin TypeScript and
      Node.js type definitions as development dependencies; rename
      `scripts/verify-stage-0.mjs` to `scripts/verify-stage-0.ts`; execute it
      directly with Node.js 22.18+ type stripping; and add exact `typecheck`
      and Stage 0 fixture-check scripts. `tsc --noEmit`, not Node.js type
      stripping, is authoritative for static type safety. Use ESM,
      `erasableSyntaxOnly`, `verbatimModuleSyntax`, explicit file extensions,
      and type-only imports. This leaf does not add product runtime code,
      source/test directories, a test runner, formatter, build output, schema
      validation dependencies, or public `sdd` behavior.
- [x] **1.2 — Remaining testable scaffold.** Add source/test directories,
      build, test, format-check, and their exact repository scripts. Keep
      dependency selection and product contract types in their later bounded
      leaves.
- [x] **1.3 — Product dependency spikes.** Select and pin the smallest
      standards-focused dependency set needed by the first production uses.
      Record why Node.js or an existing dependency is insufficient, verify ESM
      and Node.js 22.18+ compatibility, and defer contract/domain types, schema
      generation, package smoke tests, and public `sdd` behavior.
- [x] **1.4 — Foundational contract types and platform interfaces.** Define
      branded IDs, schema versions, diagnostics, result envelopes, and narrow
      injected filesystem, Git, process, clock, and randomness interfaces.
      Name the target `REQ-*` identifiers in the implementation handoff, but
      keep schema generation, config/Markdown/XML parsing, package smoke tests,
      executable behavior, and Requirement promotion in their later leaves.
      Foundational shapes are constrained by target Requirements
      `REQ-2C8E8085`, `REQ-13CF54D6`, `REQ-1095E571`, `REQ-B25091A0`,
      `REQ-7D93D64A`, `REQ-7C848ED0`, `REQ-F7D39246`, `REQ-41EDF9A3`, and
      `REQ-82256D82`; bootstrap tests do not claim executable Requirement
      coverage.
- [x] **1.5 — Schema and type single-source generation.** Generate version 1
      JSON Schemas and TypeScript types from the checked-in schema source,
      verify published schemas byte-for-byte, and keep parsing, executable
      behavior, package smoke tests, and Requirement promotion deferred. The
      inventory-driven generator covers all 16 materialized artifact schemas,
      follows only checked-in local shared-schema references, and checks the
      committed TypeScript output for deterministic freshness. Generated
      shapes preserve the target Requirement mappings recorded by the
      inventory: `REQ-04F23007`, `REQ-12E19D70`, `REQ-20AAA622`,
      `REQ-220945C2`, `REQ-2AF962EB`, `REQ-3B9FC7FF`, `REQ-3BF12AAD`,
      `REQ-5A832396`, `REQ-64DB876B`, `REQ-72BA737C`, `REQ-7341DBB7`,
      `REQ-7AFE9904`, `REQ-82256D82`, `REQ-89AFB91E`, `REQ-8E2D9A5F`,
      `REQ-964B9F80`, `REQ-9D265509`, `REQ-A3C3B779`, `REQ-A76942A0`,
      `REQ-A8739118`, `REQ-ADF9965A`, `REQ-AFD65A03`, `REQ-BCFA15D8`,
      `REQ-BDAFD401`, `REQ-C11ACC55`, `REQ-CDE94D0B`, `REQ-D5A7A5DF`,
      `REQ-DFF6BFA6`, `REQ-E26A859E`, `REQ-E451458E`, `REQ-E80F09C6`,
      `REQ-E85A06C3`, `REQ-F7CEE6D0`, and `REQ-FB66E5D6`. Bootstrap
      generation tests do not claim executable Requirement coverage.
- [x] **1.6 — Package and executable smoke tests.** Configure the local private
      bootstrap artifact with ESM library exports and declarations, exact
      generated output plus checked-in version 1 schemas, and `sdd` bin wiring.
      Build, pack, inspect, stage, import, and execute that actual artifact in
      temporary directories without network access. Until a product command exists, the
      thin process adapter writes only a technical-unavailable diagnostic to
      stderr, leaves stdout empty, and exits `3`; it cannot emit a product or
      gate result. This leaf is constrained by target Requirements
      `REQ-F7D39246`, `REQ-7C848ED0`, `REQ-41EDF9A3`, and `REQ-F91F7D11`, but
      bootstrap package tests claim no executable Requirement coverage.
      Config, Markdown, XML, runtime schema validation, canonical Requirement
      promotion, and Milestone 2 implementation remain deferred.

Done when a clean clone can install, build, typecheck, test, and validate all
Stage 0 fixtures deterministically.

## Milestone 2 — Read-only specification vertical slice

Mode: `spec-code`.

Promote only the Requirements implemented by the selected leaf.

### 2.1 Project resolution and configuration

Status: core implementation complete.

Implemented nearest/explicit config resolution, strict schema parsing, safe
project-relative configured paths, and stable configuration diagnostics behind
the provider-neutral library boundary.

Primary target Requirements:
`REQ-0361538D`.

This leaf establishes configuration isolation used later by
`REQ-FBB24D6C`; it does not complete cross-project graph validation or the
project-wide portability guarantee.

Canonical promotion of `REQ-0361538D` is intentionally deferred to 2.5. Its
Statement promises observable CLI behavior, while 2.1 implements only the
core library and the current executable still reports product commands as
unavailable. Requirement-named core tests provide implementation traceability
without claiming that the CLI Requirement is already canonical or fully
satisfied.

### 2.2 Markdown parsing and object identity

Status: parser and local model implementation complete.

Implemented deterministic UTF-8 CommonMark/GFM parsing for every Markdown
file below the configured specification root, strict typed frontmatter and
machine markers, stable Requirement anchors and metadata, normative and
explanatory sections, Capability-local Requirement ownership, Domain Concept
objects, relative graph-link records, and stable source diagnostics. This leaf
does not resolve links or validate graph-wide reachability, uniqueness, or
ownership.

Primary target Requirements:
`REQ-DD91AD0F`, `REQ-8602BF02`, `REQ-0EF66B28`, `REQ-EAC56CB1`,
`REQ-065A9911`, `REQ-40A38BA1`.

Core parsing and model behavior fully covers `REQ-8602BF02`,
`REQ-EAC56CB1`, `REQ-065A9911`, and `REQ-40A38BA1`.
`REQ-DD91AD0F` remains incomplete until graph validation proves that the index
lists every active Capability and Concept exactly once. `REQ-0EF66B28` remains
incomplete until graph validation proves fragment reachability and unique
Capability ownership. Requirement-named tests for those two Requirements
cover only their parser-local portions and do not claim full satisfaction.

Canonical promotion was deferred as one coherent subset to 2.3. Promoting only
the four parser-complete Requirements would require moving shared Concept
context out of `proposal/spec/` and retargeting the remaining proposal graph;
doing that before link resolution would either have duplicated normative
Concept copies or created an unverified canonical graph. Milestone 2.3
completed that promotion without retaining duplicate normative definitions.

### 2.3 Graph validation

Status: graph core and first coherent canonical subset complete.

Implemented configured-entrypoint validation, deterministic object ordering,
index completeness, duplicate identity checks, fragment reachability and
ownership, portable scope-contained link resolution, exact path-to-identity
binding, typed Requirement and Concept relations, stable anchors, dependency
cycle rejection, and stale display-title warnings. Graph errors use stable
codes and carry deterministic remediation guidance in diagnostic details.

Primary target Requirements:
`REQ-8D157EBE`, `REQ-99605FAB`, `REQ-F3A241BE`, `REQ-7D93D64A`,
`REQ-13CF54D6`.

This leaf completes and promotes `REQ-DD91AD0F`, `REQ-8602BF02`,
`REQ-0EF66B28`, `REQ-EAC56CB1`, `REQ-065A9911`, `REQ-40A38BA1`,
`REQ-8D157EBE`, `REQ-99605FAB`, and `REQ-F3A241BE`. The canonical graph also
owns the complete ten-Concept vocabulary needed by this first subset; the
remaining proposal model links to those canonical Concept definitions rather
than retaining editable copies.

`REQ-7D93D64A` remains proposed until 2.5 applies the diagnostic remediation
contract across parser and CLI failures and verifies that a CLI crash cannot
produce success. `REQ-13CF54D6` remains proposed until 2.4 makes fingerprints
explicitly uncomputable for unknown or ambiguous graph targets.

### 2.4 Fingerprints

Implement canonical AST values, canonical JSON bytes, SHA-256, and separate
semantic/structural fingerprints.

Primary target Requirements:
`REQ-8ACBC52D`, `REQ-1095E571`.

Verification fingerprints from `REQ-B25091A0` remain incomplete until TestIndex
support exists.

This leaf implements canonical version 1 semantic and structural projections,
exact compact UTF-8 JSON bytes, SHA-256 fingerprints, and a validated-graph
adapter that rejects unknown identities before computation. It completes and
promotes `REQ-8ACBC52D` and `REQ-13CF54D6`. `REQ-1095E571` remains proposed
until 2.5 makes its CLI Statement observable. Verification fingerprints remain
deferred with `REQ-B25091A0` until TestIndex support exists.

### 2.5 First CLI surface

Implement deterministic JSON and human views for `validate` and `inspect`,
including exit codes `0`, `1`, and `3`.

Primary target Requirements:
`REQ-7C848ED0`.

This leaf contributes to the full CLI surface in `REQ-F7D39246`; that
Requirement is promoted only after every named version 1 operation exists.
Merge-specific exit mapping in `REQ-41EDF9A3` remains deferred.

This leaf connects the production Node filesystem adapter and shared
configuration, parser, graph, and fingerprint pipeline to `sdd validate` and
`sdd inspect`. Both commands emit deterministic versioned JSON or a human view
of the same response, and map valid, blocked, and technical outcomes to exits
`0`, `1`, and `3`. It completes and promotes `REQ-0361538D`, `REQ-7C848ED0`,
`REQ-1095E571`, and `REQ-7D93D64A`. `REQ-F7D39246` remains proposed until all
named version 1 commands exist; `REQ-B25091A0` remains proposed until TestIndex
enables verification fingerprints.

Done when SDD Yo validates its first canonical Requirement subset and produces
byte-identical JSON/fingerprints across repeated runs.

## Milestone 3 — Initialization, IDs, trace, and diff

Mode: `spec-code`.

- [x] **3.1 — Non-overwriting project initialization.** Implement `sdd init`
      with injected cryptographic randomness and exclusive project writes.
      Create the version 1 config and minimal specification tree, preserve
      unrelated files, reject conflicting or unsafe targets, and assign one
      stable random project ID. Promote `REQ-382BBBD6`; `REQ-BFC18F28` remains
      proposed until repository-wide duplicate project-ID validation exists.
- [x] **3.2a — Random ID primitives and projectless issuance.** Implement
      collision-retrying cryptographic generation for `SDD`, `CAP`, `REQ`, and
      `CON` prefixes plus bounded `--count`. Expose projectless `sdd id` with
      machine-readable historical status `unchecked`; do not claim reservation.
- [x] **3.2b — Git snapshot and history boundary.** Implement the production
      argv-array Git adapter, resolve mutable refs once, read configured graphs
      from opaque object IDs, enumerate reachable history, and detect shallow
      or otherwise incomplete history without assuming a hash algorithm.
- [x] **3.2c1 — Canonical history index.** Build a fail-closed typed history
      index from versioned project configs and validated canonical graphs,
      retaining active-tip IDs separately from all reachable reserved IDs and
      following stable project identity across directory or spec-root moves.
- [x] **3.2c2 — Historical reservation and project identity.** Define new IDs
      relative to the resolved integration history tip, reject typed canonical
      reuse and parallel collisions, validate manual IDs through the same path,
      and block duplicate project IDs in one repository. Wire project-aware
      `sdd id` and validation, then promote `REQ-BFC18F28`, `REQ-2C8E8085`, and
      `REQ-8B656FC5`.
- [x] **3.3 — Graph queries and graph-only trace.** Extract deterministic
      reverse-relation queries from `inspect`; implement ownership, transitive
      dependency/dependent closure, direct referrers, and graph-only `trace`
      without executing or claiming tests. Promote `REQ-24073D4F`.
- [x] **3.4a — Semantic and structural delta core.** Implement canonical
      object-delta entries, bytes, and fingerprints from two validated graphs,
      including exact empty classes and no verification-class claim.
- [x] **3.4b — Git-ref diff and validate comparison CLI.** Expose the delta
      core through Git-ref-backed `validate --changed-from` and `diff`. Report
      unavailable verification separately from an available empty delta and
      emit no approval or review conclusion. Promote `REQ-24A372E7`.

Primary target Requirements:
`REQ-382BBBD6`, `REQ-BFC18F28`, `REQ-2C8E8085`, `REQ-8B656FC5`,
`REQ-24073D4F`, `REQ-24A372E7`.

This milestone contributes command coverage toward `REQ-F7D39246`, but that
Requirement remains proposed until Milestone 6 completes every version 1
operation. Approval binding in `REQ-AFD65A03` remains Milestone 5 work. Strict
merge-history enforcement in `REQ-FDD51416` remains Milestone 6 work.

## Milestone 4 — Test discovery and QA scope

Mode: `spec-code`.

- [x] **4.1 — JSONL discovery import and command adapter boundary.** Import
      versioned discovery JSONL from project-scoped files and configured
      argv-array commands, with bounded process and stream failure handling.
      Do not import JUnit, build the project TestIndex, extract inherited
      Requirement IDs, or handle execution and QA evidence in this leaf.
      Contributes to `REQ-20F8CA5C` and `REQ-72BA737C`; their remaining
      TestIndex and execution behavior stays proposed until later leaves.
- [x] **4.2 — JUnit-compatible import.** Import bounded, non-networked XML;
      preserve producer hierarchy, names, status, source, and time; report lost
      hierarchy without guessing from framework-specific names. Contributes to
      `REQ-6D8DDDF7` and `REQ-12E19D70`; observable TestIndex behavior stays
      proposed until 4.3.
- [x] **4.3 — Deterministic TestIndex and suite-name inheritance.** Add bounded
      file-import defaults, bind explicit JUnit imports to one selected adapter,
      validate hierarchy and active Requirement mappings, union adapters by
      namespace, emit `sdd tests discover`, and promote `REQ-12E19D70`,
      `REQ-F7CEE6D0`, `REQ-6D8DDDF7`, and `REQ-72BA737C`.
- [x] **4.4 — Test-backed trace and verification fingerprints.** Enrich `trace`
      from a subject-matched TestIndex, add deterministic Requirement
      verification fingerprints, and expose verification deltas only from a
      complete base/target TestIndex pair without changing graph-only trace.
- [x] **4.5 — Affected verification and QA scope.** Compute a deterministic,
      fingerprinted scope from direct Requirement changes, code targets,
      semantic Concept impact, transitive reverse dependencies, and former
      owners of deleted Requirements. This contributes the pure scope
      computation for `REQ-89AFB91E`; the Verification Gate remains in 4.6.
- [x] **4.6 — Execution and QA evidence validation.** Strictly parse bounded,
      project-scoped TestExecutionEvidence and QAEvidence; validate issuer,
      project, ref, configuration, adapter, TestIndex, and affected-scope
      freshness; and compute deterministic automated, manual, and Capability
      coverage with blocking versus review-required issue classifications.
      VerificationReport and readiness-status composition remain Milestone 6.

Primary target Capability:
`CAP-15DBC157`.

Also completes verification fingerprints in `REQ-B25091A0` and transitive
affected scope in `REQ-89AFB91E`.

## Milestone 5 — Proposal and exact patch

Mode: `spec-code`.

- [x] **5.0 — Proposal workflow contract alignment.** Separate mechanical
      proposal validation and package-bound preparation from Milestone 6
      approval, semantic findings, and full gate composition. Add the
      mechanical `REQ-8DE9E078`, bind ProposalPackage code targets and affected
      scope, make directory and CandidateTreeManifest the version 1 candidate
      inputs, reserve archive ingestion, and make all four preparation states
      explicit. This leaf changes contracts and fixtures only; it implements no
      runtime command and promotes no Requirement.
- [x] **5.1 — Proposal Gate and ProposalPackage generation.** Load a selected
      Git base plus a project-directory or CandidateTreeManifest candidate,
      validate the virtual graph, compute semantic and structural deltas and
      affected verification scope, enforce the mechanical three-mode rules,
      and emit a deterministic ProposalPackage without changing the worktree.
      `spec-code` and `spec` require a non-empty semantic delta. `code` requires
      empty semantic and structural deltas plus non-empty active code targets
      bound to their fingerprints. Emit `semantic_candidates: []` and make no
      implementation-behavior, existing-behavior, approval, or semantic-review
      claim. Promote only `REQ-E26A859E` and `REQ-8DE9E078`.
- [x] **5.2 — Package-bound mechanical three-way preparation.** Implement the
      core preparation library with explicit package, candidate, resolved
      branch-head, and resolved integration-ref inputs. Take `B` from
      `package.base.git_ref`, revalidate the exact `P` candidate bytes and all
      package bindings, require a merge base for `H` and `M`, perform read-only
      line-aware three-way comparison, and emit a deterministic ConflictReport
      plus an internal validated prepared tree only when clean. Public
      `proposal prepare` CLI wiring is deferred to 5.3 so 5.2 exposes no
      temporary response shape. Do not validate ApprovalEvidence, generate
      semantic candidates, compose `REQ-A8739118`, or emit a SpecPatch yet.
      This leaf contributes the comparison and conflict-analysis portion of
      `REQ-964B9F80` without promoting it.
- [x] **5.3 — Exact create/replace/delete SpecPatch.** Convert a clean prepared
      tree into deterministically path-sorted exact file operations with before
      and after hashes and whole-tree fingerprints. Do not apply the patch or
      add fuzzy, partial, force, Git-write, or approval behavior. Promote
      `REQ-964B9F80` and `REQ-3BF12AAD`. Wire the public `proposal prepare` CLI
      only once this leaf can return the stable ConflictReport and SpecPatch
      response together.
- [x] **5.4 — Safe all-or-nothing proposal apply.** Implement the only
      post-initialization specification write operation with project/spec-root
      containment, path traversal, symlink, `.git`, binary, duplicate-target,
      before/after hash, and result-tree checks plus rollback-safe atomic
      replacement. Preserve unrelated worktree changes and create no Git
      branch, commit, push, or merge. This leaf contributes the safe apply
      implementation for `REQ-7AFE9904` without promoting it before the
      interruption proof. The implemented boundary strictly imports the
      path-sorted SpecPatch, validates project/base/path/hash/result-tree state
      before mutation, and delegates sibling staging, atomic replacement, and
      reverse-order rollback to the injected project writer. The direct CLI
      exposes no fuzzy, partial, force, output-file, or Git-write path.
- [x] **5.5 — Stale-base and interruption proof.** Add race and failure
      injection across candidate revalidation, before-hash checks, staging,
      replacement, and rollback; prove stale inputs cannot apply and failures
      leave no partial final specification. Promote `REQ-7AFE9904` and complete
      Milestone 5 validation without broadening runtime behavior. The proof
      covers candidate drift between validation reads, apply-target drift
      before writer mutation, staging and multi-replacement failures, and a
      transient rollback failure. Sibling staging is fsynced where supported;
      rollback retries transient filesystem operations and leaves neither a
      partial final tree nor transaction debris.

Primary target Requirements:
`REQ-E26A859E`, `REQ-8DE9E078`, `REQ-964B9F80`, `REQ-3BF12AAD`,
`REQ-7AFE9904`.

The qualitative mode claims in `REQ-983914F3`, `REQ-FB76FC6F`, and
`REQ-13CE0529` remain proposed until their implementation/existing-behavior
and approval evidence is composed. Full Proposal Gate semantic candidates in
`REQ-E80F09C6`, approval-bound Branch Preparation in `REQ-A8739118`, and
approved-delta binding in `REQ-AFD65A03` are completed in Milestone 6.

## Milestone 6 — Evidence, findings, and merge readiness

Mode: `spec-code`.

Bounded leaves:

- [x] **6.0 — Milestone clarification.** Reconcile the completed Milestone 4
      evidence-assessment and Milestone 5 proposal/apply surfaces with the
      remaining target contracts. Split evidence, semantic review, gate
      composition, and CLI work into independently verifiable leaves and make
      6.1 the immediate next leaf. No runtime behavior changes in this leaf.
- [x] **6.1 — Approval and governance evidence.** Strictly parse bounded,
      project-scoped ApprovalEvidence and GovernanceEvidence; validate allowed
      issuers, exact mode/delta or adoption-transition subjects, negative and
      contradictory decisions, and freshness. Reuse the completed Milestone 4
      TestExecutionEvidence and QAEvidence boundary rather than duplicating it.
      Finding-family artifacts remain 6.3. Target Requirements:
      `REQ-7341DBB7`, `REQ-AFD65A03`, `REQ-E85A06C3`, `REQ-220945C2`.
      `REQ-7341DBB7` is promoted. This leaf contributes strict approval-delta,
      governance-subject, issuer, freshness, and decision assessment to the
      remaining Requirements; their gate-composition claims remain proposed
      until 6.3, 6.5, and 6.7.
- [x] **6.2 — Deterministic semantic candidates and input manifest.** Generate
      stable candidates from overlapping object changes, shared Concepts,
      Requirement dependencies, deletions, and incompatible graph operations;
      expand Concept impact; select only the required normative sections; and
      fingerprint a deterministic SemanticAnalysisInputManifest. Do not call a
      model or declare a semantic conflict. Target Requirements:
      `REQ-DFF6BFA6`, `REQ-04F23007`, `REQ-B5815BB5`, `REQ-18F84CE2`.
      Promote `REQ-DFF6BFA6`, `REQ-04F23007`, and `REQ-B5815BB5`.
      `REQ-18F84CE2` remains proposed until model-unavailable human-review
      composition is complete in 6.3 and 6.4.
- [x] **6.3 — Findings and human semantic decisions.** Strictly parse and
      validate Finding, FindingResolution, and HumanSemanticReviewEvidence;
      derive Finding IDs from analyzer and input identity; require concrete
      object/section citations; enforce resolution eligibility and freshness;
      reject semantic-conflict waivers; and represent unavailable optional
      model analysis as human review required. Target Requirements:
      `REQ-A76942A0`, `REQ-20AAA622`, `REQ-FB66E5D6`, `REQ-ADF9965A`,
      `REQ-2AF962EB`, `REQ-BDAFD401`. Promote `REQ-A76942A0` and
      `REQ-ADF9965A`. Resolution and human-review assessment now contribute to
      the remaining Requirements, whose gate/report composition stays proposed
      until 6.4 and 6.6.
- [x] **6.4 — Full Proposal Gate.** Compose mechanical proposal validation with
      deterministic semantic candidates, populate ProposalPackage
      `semantic_candidates`, preserve a read-only working tree, and promote the
      completed observable contract. Approval remains external. Target
      Requirements: `REQ-E80F09C6`, `REQ-18F84CE2`. Promote both Requirements.
      Proposal concerns remain deterministic review candidates rather than
      Findings and do not block or approve an otherwise valid package.
- [ ] **6.5 — Approval-bound Branch Preparation Gate.** Compose current
      ApprovalEvidence with mechanical preparation; require exact mode and
      canonical object-delta binding; preserve approval across independent
      integration additions; emit semantic candidates in ConflictReport; and
      withhold SpecPatch for review-required or blocked preparation. Target
      Requirements: `REQ-AFD65A03`, `REQ-7341DBB7`, `REQ-A8739118`.
- [ ] **6.6 — Verification Gate and VerificationReport.** Compose affected
      scope, TestIndex, execution evidence, manual Requirement decisions, QA,
      and finding state into deterministic satisfied/unsatisfied partitions,
      stable diagnostics, blocker precedence, and exactly one readiness
      status. Target Requirements: `REQ-E451458E`, `REQ-5A832396`,
      `REQ-CDE94D0B`, `REQ-C11ACC55`, `REQ-20AAA622`, `REQ-2AF962EB`,
      `REQ-BCFA15D8`.
- [ ] **6.7 — Merge Gate and deterministic MergeReport.** Accept explicit
      versioned inputs, resolve current refs, require complete strict history,
      recompute conflicts and affected scope, enforce mode-specific current
      evidence, and emit a reproducible governed-scope MergeReport without Git
      mutation. Target Requirements: `REQ-64DB876B`, `REQ-E85A06C3`,
      `REQ-8E2D9A5F`, `REQ-3B9FC7FF`, `REQ-220945C2`, `REQ-82256D82`,
      `REQ-44068C1A`, `REQ-93A4C44B`, `REQ-FDD51416`.
- [ ] **6.8 — Findings and merge CLI completion.** Expose
      `sdd findings validate` and `sdd merge check`, render deterministic JSON
      plus replaceable human views, map `PASS`, `BLOCKED`, `REVIEW_REQUIRED`,
      and technical failure to exit codes 0, 1, 2, and 3, and prove that no
      command can create a branch, commit, tag, push, or merge. Target
      Requirements: `REQ-F7D39246`, `REQ-41EDF9A3`, `REQ-44068C1A`,
      `REQ-A3C3B779`, `REQ-F91F7D11`.

Primary target Capabilities:
`CAP-F31EF876`, `CAP-205F5DBC`.

Also completes the qualitative synchronization-mode claims in
`REQ-983914F3`, `REQ-FB76FC6F`, and `REQ-13CE0529`, Concept impact in
`REQ-B5815BB5`, the full CLI surface in
`REQ-F7D39246`, strict history enforcement in `REQ-FDD51416`, and
merge-specific exit mapping in `REQ-41EDF9A3`.

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

- Stage 0 verifier execution on Linux and Windows CI.
- Hosted workflow service or durable workflow database.
- Automatic branch, commit, push, merge, approval, or QA actions.
- Cross-project graph relations.
- Implementation-file links in canonical Requirements.
- Detection of code behavior changes whose author did not update the spec.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.

## Immediate next leaf

`6.5 — Approval-bound Branch Preparation Gate` is active. It composes current
ApprovalEvidence with mechanical preparation, binds the approved mode and
object delta, and emits semantic candidates in ConflictReport. It does not
apply a patch, compose verification or merge reports, add CLI operations, or
perform Git side effects.
