# Milestone 10 self-bootstrap retirement record

## Status and authority

- Status: completed archive; leaves 10.0 through 10.3 and the milestone done
  condition completed on 2026-08-05.
- Recorded against: repository history through `3eed6f5` plus the validated 10.3
  working-tree retirement and closeout change; no 10.3 commit or other Git
  operation was created.
- Current milestone authority remains
  [`../../IMPLEMENTATION_PLAN.md`](../../IMPLEMENTATION_PLAN.md). This record
  preserves the completed disposition, dependency, retained-coverage, and
  execution evidence for Milestone 10; it is not an active implementation plan.
- Canonical behavior remains under [`../../spec/`](../../spec/README.md).
  Former proposal definitions recorded here are historical provenance, not
  canonical behavior or reserved future IDs.

This inventory changes no product behavior, Requirement meaning, contract or
fixture bytes, script or command name, package contents, runtime code, evidence,
or Git history. It does not execute any disposition.

## Milestone objective and execution leaves

Milestone 10 retired the completed temporary self-bootstrap procedure as active
repository authority, preserved useful contract-oracle coverage and historical
rationale, and made the normal `spec-code`, `spec`, and `code` workflows the
only active paths for changing product behavior before private distribution
work began.

- **10.0 — Active-plan compaction and private-distribution alignment.** Moved
  the completed Milestones 0–9 execution record into the indexed archive,
  refreshed repository instructions, preserved the private source and package
  boundary, and made local tarball installation the Milestone 11 distribution
  target. Completed at `312bc67`; it changed no product Requirement, runtime
  behavior, package contents, installed Skill state, or Git history.
- **10.1 — Self-bootstrap retirement inventory and disposition.** Reproduced
  the live 15-Requirement and zero-Capability proposal-only baselines, gave
  every maintained bootstrap-bound surface one disposition, and named one 10.2
  coverage successor for every retained verifier check. Completed at `c4b5709`;
  it did not execute a disposition or create canonical behavior.
- **10.2 — Contract-oracle decoupling.** Replaced `verify:stage-0` with the
  ordinary `verify:contracts` oracle, retained all 30 diagnostic families, 37
  contract IDs, 17 fixture-family IDs, and 176 required-case mappings, and kept
  all 15 protected historical producer payloads byte-identical. Completed at
  `3eed6f5`; it changed no product behavior or canonical Requirement meaning.
- **10.3 — Bootstrap authority and target-package retirement.** Executed
  `S04`–`S09`, preserved the nonnormative destinations below, archived the
  historical procedure and evidence pointers, removed active promotion
  authority and the former target specification, and retained normal proposal
  runtime, schemas, fixtures, and exact-patch behavior. Completed in the
  validated working tree after `3eed6f5`; no Git operation was created.

The milestone done condition passed: the former target specification and
bootstrap procedure are no longer active authority; all 15 former proposal-only
Requirements retain an executed or scheduled disposition; the independent
contract verifier remains authoritative without proposal dependencies; active
instructions name only normal product workflows; and focused plus full
validation passed while normal ProposalPackage and exact-patch behavior stayed
intact.

## Reproduced baseline

The baseline was reproduced from Markdown definitions, not from prose counts:

- `proposal/spec/` defines exactly 15 `REQ-XXXXXXXX` headings.
- None of those 15 IDs is defined under canonical `spec/`.
- The proposal and canonical entrypoints name the same eight Capability IDs:
  `CAP-0B417FC4`, `CAP-15DBC157`, `CAP-205F5DBC`, `CAP-404305F6`,
  `CAP-79E22870`, `CAP-CB22A5A3`, `CAP-E309CBCB`, and `CAP-F31EF876`.
- Therefore the proposal-only Requirement set has 15 members and the
  proposal-only Capability set is empty.

The allowed Requirement dispositions are:

- `select-later-through-normal-change`;
- `preserve-as-nonnormative-backlog`;
- `baseline-implemented-behavior-through-normal-change`;
- `retire-with-rationale`.

Historical proposal IDs below are provenance only. Any future normal Change
must run `sdd id`, use a fresh checked ID, and bind evidence to the fresh
candidate. Neither this record nor a retained fixture occurrence reserves a
historical proposal ID.

## Evidence and dependency keys

The Requirement table uses these evidence keys. Passing bootstrap fixtures
alone is never treated as proof that behavior ran.

| Key             | Current implementation and test evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADOPTION`      | [`src/init/initialize-project.ts`](../../src/init/initialize-project.ts), [`src/verification/evidence.ts`](../../src/verification/evidence.ts), and [`src/verification/merge-report.ts`](../../src/verification/merge-report.ts); focused coverage in [`test/cli.test.ts`](../../test/cli.test.ts), [`test/evidence.test.ts`](../../test/evidence.test.ts), and [`test/merge-report.test.ts`](../../test/merge-report.test.ts); existing-project studies are retained under [`dogfood/`](../../dogfood/).                                                                                                                                                                                                                       |
| `GRAPH`         | Active-graph, deletion, dependent, and history behavior in [`src/graph/validate-graph.ts`](../../src/graph/validate-graph.ts), [`src/fingerprint/object-delta.ts`](../../src/fingerprint/object-delta.ts), [`src/ids/history-index.ts`](../../src/ids/history-index.ts), and proposal preparation/application; focused coverage in [`test/graph.test.ts`](../../test/graph.test.ts), [`test/object-delta.test.ts`](../../test/object-delta.test.ts), [`test/history-index.test.ts`](../../test/history-index.test.ts), and the proposal tests.                                                                                                                                                                                  |
| `MODES`         | Mechanical mode validation and the four implemented gate surfaces in [`src/proposal/validate-proposal.ts`](../../src/proposal/validate-proposal.ts), [`src/proposal/prepare-proposal.ts`](../../src/proposal/prepare-proposal.ts), [`src/verification/verification-report.ts`](../../src/verification/verification-report.ts), and [`src/verification/merge-report.ts`](../../src/verification/merge-report.ts), with focused proposal, preparation, verification, merge, and CLI tests. The [completed Milestone 6 record](../completed/milestones-0-9.md) explicitly says the three qualitative mode claims were completed.                                                                                                   |
| `JSONL`         | Bounded file and argv-array adapter handling in [`src/tests/discovery-jsonl.ts`](../../src/tests/discovery-jsonl.ts) and the test-index/execution modules, with Requirement-named coverage in [`test/discovery-jsonl.test.ts`](../../test/discovery-jsonl.test.ts) and [`test/test-index.test.ts`](../../test/test-index.test.ts).                                                                                                                                                                                                                                                                                                                                                                                              |
| `SEMANTIC`      | The deterministic false completeness claim in [`src/verification/findings.ts`](../../src/verification/findings.ts), with current coverage in [`test/findings.test.ts`](../../test/findings.test.ts).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `ISOLATION`     | Explicit project selection in [`src/config/resolve-project.ts`](../../src/config/resolve-project.ts), project-relative graph validation, adapter scoping in [`src/tests/discover-project-tests.ts`](../../src/tests/discover-project-tests.ts), and project/subject-bound MergeReports in [`src/verification/merge-report.ts`](../../src/verification/merge-report.ts); focused coverage in [`test/configuration.test.ts`](../../test/configuration.test.ts), [`test/graph.test.ts`](../../test/graph.test.ts), [`test/test-discovery-cli.test.ts`](../../test/test-discovery-cli.test.ts), and [`test/merge-report.test.ts`](../../test/merge-report.test.ts). No repository-wide orchestration side effect exists in the CLI. |
| `NO-LOCAL-NORM` | The core is offline and local links are validated, but no maintained validator or Requirement-named test was found for the proposed rule that an external URL in a normative section creates a quality finding. That acceptance boundary is not claimed as implemented.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Inbound dependency keys name the maintained contract surfaces that must be
decoupled in 10.2:

| Key              | Inbound maintained dependencies                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `D-CONFIG`       | `contracts/v1/inventory.json` contract `config.project`; fixture families `configuration` and `markdown-graph-invalid`.                   |
| `D-GOVERNANCE`   | Contract `artifact.governance-evidence`; fixture family `decision-evidence`; governance artifact cases.                                   |
| `D-SEMANTIC`     | Contract `artifact.human-semantic-review-evidence`; finding artifact cases; `test/findings.test.ts`.                                      |
| `D-VERIFICATION` | Contracts `artifact.verification-report` and `gate.verification`; fixture families `workflow-artifacts` and `mode-and-gate-truth-tables`. |
| `D-JSONL`        | Four JSONL/command contracts; fixture families `adapter-jsonl` and `security-path-process`; JSONL discovery and TestIndex tests.          |
| `D-MODES`        | Fixture family `mode-and-gate-truth-tables` and its two gate manifests.                                                                   |

## Proposal-only Requirement dispositions

The following table is set-equal to the 15 proposal-only definitions. Every row
has one disposition; no row creates a canonical Requirement or claims approval.

| Source Requirement                                                              | Proposal source and canonical presence                                                                      | Evidence                | Inbound dependencies        | Disposition                                           | Rationale, provenance, and destination                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REQ-13CE0529` — Align implementation to active contract in code mode           | `former proposal/spec/capabilities/proposal-modes-and-workflow-gates.md#req-13ce0529`; absent canonically   | `MODES`                 | `D-MODES`                   | `baseline-implemented-behavior-through-normal-change` | Code mode already requires empty semantic/structural delta and bound active Requirement targets. Preserve this row and the completed-plan evidence; schedule a post-Milestone 11 normal `spec` baseline candidate with a fresh ID.                                                      |
| `REQ-168CDE5F` — Remove completed Change state from canonical specification     | `former proposal/spec/capabilities/proposal-modes-and-workflow-gates.md#req-168cde5f`; absent canonically   | `MODES`                 | none                        | `retire-with-rationale`                               | Canonical `REQ-A3C3B779` already keeps workflow state external, and the canonical Markdown graph contains no workflow record type. Retain this row as provenance; no replacement Requirement is planned.                                                                                |
| `REQ-20F8CA5C` — Support generic JSONL test protocols                           | `former proposal/spec/capabilities/test-traceability-and-qa.md#req-20f8ca5c`; absent canonically            | `JSONL`                 | `D-JSONL`                   | `baseline-implemented-behavior-through-normal-change` | JSONL discovery, execution input, argv-array commands, and bounded failure handling exist with direct tests. Schedule a post-Milestone 11 normal `spec` baseline candidate with a fresh ID; 10.2 removes this historical ID from active test and fixture mappings.                      |
| `REQ-24C14972` — Remove inactive objects from canonical content                 | `former proposal/spec/capabilities/specification-model-and-authoring.md#req-24c14972`; absent canonically   | `GRAPH`                 | none                        | `baseline-implemented-behavior-through-normal-change` | Active graph validation, guarded deletion, dependent checks, and historical non-reuse exist. Schedule a post-Milestone 11 normal `spec` baseline candidate with a fresh ID.                                                                                                             |
| `REQ-784F200F` — Support incremental adoption                                   | `former proposal/spec/capabilities/project-initialization-and-adoption.md#req-784f200f`; absent canonically | `ADOPTION`              | none                        | `baseline-implemented-behavior-through-normal-change` | Incremental initialization, partial-adoption dogfood, scoped reports, and governed-scope qualification exist. Schedule the adoption baseline set as one bounded post-Milestone 11 normal `spec` Change using fresh IDs.                                                                 |
| `REQ-8D1283E5` — Exclude ordinary maintenance from SDD modes                    | `former proposal/spec/capabilities/proposal-modes-and-workflow-gates.md#req-8d1283e5`; absent canonically   | `MODES`                 | none                        | `retire-with-rationale`                               | Canonical `REQ-E26A859E` already states that ordinary maintenance outside contract synchronization creates no SDD Change. The proposed block adds no independent active behavior; retain this rationale only.                                                                           |
| `REQ-983914F3` — Change contract and implementation in spec-code mode           | `former proposal/spec/capabilities/proposal-modes-and-workflow-gates.md#req-983914f3`; absent canonically   | `MODES`                 | `D-MODES`                   | `baseline-implemented-behavior-through-normal-change` | Mechanical deltas, approval binding, preparation, and later verification implement the bounded workflow; completed Milestone 6 records the qualitative claim as complete. Schedule the mode baseline set as a post-Milestone 11 normal `spec` Change with fresh IDs.                    |
| `REQ-9D265509` — Use four explicit workflow gates                               | `former proposal/spec/capabilities/proposal-modes-and-workflow-gates.md#req-9d265509`; absent canonically   | `MODES`                 | `D-VERIFICATION`, `D-MODES` | `baseline-implemented-behavior-through-normal-change` | Proposal validation, approval-bound preparation, VerificationReport, and MergeReport are explicit deterministic surfaces. Schedule a post-Milestone 11 normal `spec` baseline candidate with a fresh ID; 10.2 rebinds contract authority.                                               |
| `REQ-A44EB430` — Keep normative behavior repository-local                       | `former proposal/spec/capabilities/specification-model-and-authoring.md#req-a44eb430`; absent canonically   | `NO-LOCAL-NORM`         | none                        | `preserve-as-nonnormative-backlog`                    | The external-URL quality-finding acceptance rule is not implemented and must not be baselined. Preserve only a post-Milestone 11 candidate describing repository-local normative authority; selection requires a new bounded normal Change and fresh ID.                                |
| `REQ-B1BB25C9` — Baseline existing behavior without changing it                 | `former proposal/spec/capabilities/project-initialization-and-adoption.md#req-b1bb25c9`; absent canonically | `ADOPTION`, `MODES`     | none                        | `baseline-implemented-behavior-through-normal-change` | Spec mode, explicit approval, and the retained dogfood baseline demonstrate the accepted-existing-behavior path without a product mutation claim. Schedule with the adoption/mode baseline candidates after Milestone 11 using a fresh ID.                                              |
| `REQ-BDAFD401` — Avoid completeness claims for semantic analysis                | `former proposal/spec/capabilities/semantic-review-and-conflicts.md#req-bdafd401`; absent canonically       | `SEMANTIC`              | `D-SEMANTIC`                | `baseline-implemented-behavior-through-normal-change` | Findings assessment deterministically returns `semantic_completeness_claimed: false`, and current tests cover stale and contradictory review. Schedule a post-Milestone 11 normal `spec` baseline candidate with a fresh ID.                                                            |
| `REQ-BFAC609F` — Derive governed scope from canonical presence                  | `former proposal/spec/capabilities/project-initialization-and-adoption.md#req-bfac609f`; absent canonically | `ADOPTION`, `ISOLATION` | none                        | `baseline-implemented-behavior-through-normal-change` | Project scope is computed from the selected canonical graph, no object stores a governed flag, and incremental reports avoid completeness claims. Schedule with the adoption baseline set after Milestone 11 using a fresh ID.                                                          |
| `REQ-D5A7A5DF` — Complete adoption by governance decision                       | `former proposal/spec/capabilities/project-initialization-and-adoption.md#req-d5a7a5df`; absent canonically | `ADOPTION`              | `D-GOVERNANCE`              | `baseline-implemented-behavior-through-normal-change` | GovernanceEvidence, adoption-transition subjects, freshness, negative/contradictory decisions, and Merge gate assessment exist; the CLI does not infer a transition. Schedule with the adoption baseline set after Milestone 11 using a fresh ID.                                       |
| `REQ-FB76FC6F` — Align specification to accepted existing behavior in spec mode | `former proposal/spec/capabilities/proposal-modes-and-workflow-gates.md#req-fb76fc6f`; absent canonically   | `MODES`, `ADOPTION`     | `D-MODES`                   | `baseline-implemented-behavior-through-normal-change` | Spec mode requires a semantic delta, keeps behavior judgment human, and was exercised by retained dogfood evidence. Schedule with the mode baseline set after Milestone 11 using a fresh ID.                                                                                            |
| `REQ-FBB24D6C` — Isolate project graphs                                         | `former proposal/spec/capabilities/multi-project-cli-and-skill.md#req-fbb24d6c`; absent canonically         | `ISOLATION`             | `D-CONFIG`                  | `baseline-implemented-behavior-through-normal-change` | Each invocation selects one project; graph paths, identifiers, adapters, evidence, and reports are project-bound, and orchestration remains external. Schedule a post-Milestone 11 normal `spec` baseline candidate with a fresh ID; do not expand it into cross-project orchestration. |

## Active-surface dispositions

The following rows partition the maintained bootstrap-bound surface. Brace
groups and explicit exclusions are part of the path identity, so a file is not
assigned twice. Completed plans and immutable evidence are historical and are
not disposition targets.

| Surface ID and exact path set                                                                                                                                                                                     | Current role, consumers, and coverage                                                                                                                                                                     | Disposition           | Replacement or archive destination                                                                                                                                                                                                                            | Execution leaf    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `S01` — `AGENTS.md`                                                                                                                                                                                               | Transitional reading order, proposal read-only boundary, and required `verify:stage-0` command.                                                                                                           | `retain-and-decouple` | Add this record to the Milestone 10 reading order in 10.1; after decoupling, name only normal workflow authority and the replacement verifier.                                                                                                                | 10.1, 10.2, 10.3  |
| `S02` — `IMPLEMENTATION_PLAN.md`                                                                                                                                                                                  | Active Milestone 10 authority and immediate leaf.                                                                                                                                                         | `retain-and-decouple` | Record verified 10.1 completion and make 10.2 current; compact only at milestone closeout.                                                                                                                                                                    | 10.1 and closeout |
| `S03` — `plans/README.md` and this active record                                                                                                                                                                  | Active disposition/dependency handoff and plan index.                                                                                                                                                     | `retain-and-decouple` | Link the active record now; archive the exact Milestone 10 execution record under `plans/completed/` only after 10.3 and the done condition pass.                                                                                                             | 10.1 and closeout |
| `S04` — `proposal/README.md`                                                                                                                                                                                      | Active target-package and bootstrap promotion route.                                                                                                                                                      | `archive`             | Preserve its historical naming and promotion rationale with the bootstrap procedure in `plans/completed/self-bootstrap-procedure.md`, then remove the active route.                                                                                           | 10.3              |
| `S05` — `proposal/spec/README.md` plus all eight files under `proposal/spec/capabilities/`                                                                                                                        | Active target definitions: 15 proposal-only Requirements and zero proposal-only Capabilities.                                                                                                             | `remove`              | Execute the Requirement table first; retain provenance in this record and the post-Milestone 11 candidate backlog, then remove the tree only after no maintained link or verifier depends on it.                                                              | 10.3              |
| `S06` — `proposal/architecture/bootstrap.md`                                                                                                                                                                      | Active temporary ID reservation and incremental promotion procedure.                                                                                                                                      | `archive`             | `plans/completed/self-bootstrap-procedure.md`; remove the active architecture-map link after archive links pass.                                                                                                                                              | 10.3              |
| `S07` — `proposal/architecture/README.md`                                                                                                                                                                         | Architecture map still routes to bootstrap and describes remaining target behavior.                                                                                                                       | `retain-and-decouple` | Keep the architecture map, remove the active bootstrap route, and describe implemented/current architecture without proposal authority.                                                                                                                       | 10.3              |
| `S08` — `proposal/architecture/{artifact-schemas,cli,configuration,evals-and-rollout,fingerprints-and-git,implementation-stack,markdown-format,overview,security,skill,test-adapters}.md`                         | Maintained implementation rationale; seven files are also named by `contracts/v1/inventory.json` authority fields, while artifact schemas, evals, and fingerprint docs contain Stage 0/bootstrap wording. | `retain-and-decouple` | Keep implementation rationale at the same paths, remove promotion/phase authority language, and make inventory authority canonical or explicitly versioned. Do not turn architecture prose into product Requirements.                                         | 10.2 and 10.3     |
| `S09` — `spec/README.md`                                                                                                                                                                                          | Canonical map currently points remaining behavior to `proposal/spec/`.                                                                                                                                    | `retain-and-decouple` | After proposal retirement, state that new behavior enters through normal bounded Changes; canonical content remains implemented-only.                                                                                                                         | 10.3              |
| `S10` — `contracts/v1/inventory.json`                                                                                                                                                                             | Bootstrap status, authority order, proposal Requirement mappings, contract/fixture inventory, and truth-table denominator.                                                                                | `retain-and-decouple` | Convert to an ordinary version 1 contract inventory; remove the 15 historical Requirement IDs, replace three `proposal/spec` authority values, keep canonical Requirement mappings and explicit versioned contract sources, and preserve contract/family IDs. | 10.2              |
| `S11` — `contracts/v1/schemas/*.schema.json`, `scripts/generate-schema-types.ts`, and `src/schemas/v1/artifacts.generated.ts`                                                                                     | Versioned schema oracle, in-memory staleness check, and generated declarations consumed by build and package tests.                                                                                       | `retain-and-decouple` | Keep bytes and generator behavior unless the renamed inventory path requires a reference update; these become explicit contract-oracle sources rather than bootstrap outputs.                                                                                 | 10.2              |
| `S12` — `package.json` script `verify:stage-0`                                                                                                                                                                    | Required repository validation entrypoint.                                                                                                                                                                | `rename`              | Add `verify:contracts` for the equal-or-stronger oracle and remove `verify:stage-0` only after coverage equivalence passes.                                                                                                                                   | 10.2              |
| `S13` — `scripts/verify-stage-0.ts`                                                                                                                                                                               | Independent JSON/JSONL/schema/fingerprint/truth-table/link/path/ID repository verifier.                                                                                                                   | `rename`              | `scripts/verify-contracts.ts`, with `CONTRACT_*` diagnostics and no proposal-definition authority.                                                                                                                                                            | 10.2              |
| `S14` — `docs/stage-0-verifier.md`                                                                                                                                                                                | Command, check, diagnostic, and platform documentation for `S13`.                                                                                                                                         | `rename`              | `docs/contract-fixture-verifier.md`, synchronized with the replacement command and diagnostics.                                                                                                                                                               | 10.2              |
| `S15` — `docs/product-dependencies.md`                                                                                                                                                                            | Describes dependency selection and still calls schemas/tests/bootstrap validation Stage 0.                                                                                                                | `retain-and-decouple` | Keep the dependency decisions and update only active phase/authority terminology after the replacement verifier exists.                                                                                                                                       | 10.2              |
| `S16` — the 28 `fixtures/v1/**/cases.json` files listed below                                                                                                                                                     | Manifest/matrix status, contract and Requirement references, declarations, required-case coverage, and path/authority links.                                                                              | `rename`              | Use ordinary contract-fixture manifest statuses; remove the 15 historical Requirement mappings; preserve case IDs, declared negative forms, contract IDs, and truth-table coverage.                                                                           | 10.2              |
| `S17` — `fixtures/v1/adapters/jsonl/discover-valid.jsonl`                                                                                                                                                         | Valid JSONL discovery payload contains a test name mapped to historical `REQ-20F8CA5C`.                                                                                                                   | `rename`              | Rebind the mapping to the applicable canonical adapter Requirement while preserving the valid JSONL scenario.                                                                                                                                                 | 10.2              |
| `S18` — the 15 `maximally-representative-valid.json` files listed below                                                                                                                                           | Exact artifact payload literals use producer name `sdd-yo-bootstrap-fixtures`; artifact bytes are regression inputs.                                                                                      | `retain-and-decouple` | Keep the producer literal byte-for-byte as historical fixture data; document that it grants no current authority.                                                                                                                                             | 10.2              |
| `S19` — all remaining files under `fixtures/v1/`, excluding `S16`–`S18`                                                                                                                                           | JSON, JSONL, Markdown, configuration, schema, path, security, malformed, canonical-byte, and fingerprint regression inputs.                                                                               | `retain-and-decouple` | Preserve exact malformed inputs, canonical bytes, hashes, and other payloads; update only references proven non-oracular and required for decoupling.                                                                                                         | 10.2              |
| `S20` — `test/dependency-contracts.test.ts`, `test/foundational-contracts.test.ts`, `test/graph.test.ts`, `test/object-delta.test.ts`, `test/performance-benchmark.test.ts`, and `test/schema-generation.test.ts` | Maintained tests whose names still say bootstrap or Stage 0 while exercising current dependency, graph, fingerprint, performance, and schema contracts.                                                   | `rename`              | Use contract-oracle/current-product terminology without changing assertions or claiming new Requirement coverage.                                                                                                                                             | 10.2              |
| `S21` — `test/discovery-jsonl.test.ts`, `test/test-index.test.ts`, and `test/findings.test.ts`                                                                                                                    | Maintained test names contain historical proposal IDs `REQ-20F8CA5C` or `REQ-BDAFD401`.                                                                                                                   | `rename`              | Remove historical proposal IDs and retain only applicable canonical Requirement IDs after checking each suite's actual coverage.                                                                                                                              | 10.2              |

The apparent `proposal/spec` matches in `test/proposal.test.ts`,
`test/proposal-prepare.test.ts`, and `test/proposal-apply.test.ts` are imports of
the legitimate product modules `src/proposal/specification-tree.ts` and
`src/proposal/spec-patch.ts`. They are not bootstrap authority and are excluded
from retirement.

### Fixture manifest set (`S16`)

The 28 manifest/matrix paths are:

```text
fixtures/v1/adapters/jsonl/cases.json
fixtures/v1/adapters/junit/cases.json
fixtures/v1/artifacts/cases.json
fixtures/v1/artifacts/evidence/approval-evidence/cases.json
fixtures/v1/artifacts/evidence/governance-evidence/cases.json
fixtures/v1/artifacts/evidence/qa-evidence/cases.json
fixtures/v1/artifacts/findings/finding-resolution/cases.json
fixtures/v1/artifacts/findings/finding/cases.json
fixtures/v1/artifacts/findings/human-semantic-review-evidence/cases.json
fixtures/v1/artifacts/findings/semantic-analysis-input-manifest/cases.json
fixtures/v1/artifacts/tests/test-execution-evidence/cases.json
fixtures/v1/artifacts/tests/test-index/cases.json
fixtures/v1/artifacts/workflow/candidate-tree-manifest/cases.json
fixtures/v1/artifacts/workflow/change-descriptor/cases.json
fixtures/v1/artifacts/workflow/conflict-report/cases.json
fixtures/v1/artifacts/workflow/merge-report/cases.json
fixtures/v1/artifacts/workflow/proposal-package/cases.json
fixtures/v1/artifacts/workflow/spec-patch/cases.json
fixtures/v1/artifacts/workflow/verification-report/cases.json
fixtures/v1/fingerprints/deltas/cases.json
fixtures/v1/fingerprints/objects/cases.json
fixtures/v1/freshness/cases.json
fixtures/v1/gates/modes/cases.json
fixtures/v1/gates/outcomes/cases.json
fixtures/v1/markdown/change-classification/cases.json
fixtures/v1/markdown/documents/cases.json
fixtures/v1/markdown/graph-invalid/cases.json
fixtures/v1/security/cases.json
```

### Historical producer-literal payload set (`S18`)

The 15 retained payload paths are:

```text
fixtures/v1/artifacts/evidence/approval-evidence/maximally-representative-valid.json
fixtures/v1/artifacts/evidence/governance-evidence/maximally-representative-valid.json
fixtures/v1/artifacts/evidence/qa-evidence/maximally-representative-valid.json
fixtures/v1/artifacts/findings/finding-resolution/maximally-representative-valid.json
fixtures/v1/artifacts/findings/finding/maximally-representative-valid.json
fixtures/v1/artifacts/findings/human-semantic-review-evidence/maximally-representative-valid.json
fixtures/v1/artifacts/findings/semantic-analysis-input-manifest/maximally-representative-valid.json
fixtures/v1/artifacts/tests/test-execution-evidence/maximally-representative-valid.json
fixtures/v1/artifacts/tests/test-index/maximally-representative-valid.json
fixtures/v1/artifacts/workflow/candidate-tree-manifest/maximally-representative-valid.json
fixtures/v1/artifacts/workflow/conflict-report/maximally-representative-valid.json
fixtures/v1/artifacts/workflow/merge-report/maximally-representative-valid.json
fixtures/v1/artifacts/workflow/proposal-package/maximally-representative-valid.json
fixtures/v1/artifacts/workflow/spec-patch/maximally-representative-valid.json
fixtures/v1/artifacts/workflow/verification-report/maximally-representative-valid.json
```

## Stage 0 coverage-successor map

Every current diagnostic/check family has one intended 10.2 successor. Names
below are the required replacement boundary, not diagnostics emitted by 10.1.

| Current diagnostic/check family                                                                            | Coverage supplied now                                                                                              | 10.2 successor                                                                                                                                                                                 | Decision                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `S0_NODE_VERSION`, repository-relative discovery, `S0_INTERNAL_ERROR`                                      | Supported Node baseline, caller-cwd independence, and fail-closed crash reporting.                                 | `CONTRACT_NODE_VERSION`, repository-relative `scripts/verify-contracts.ts`, and `CONTRACT_INTERNAL_ERROR`.                                                                                     | Retain.                                                                               |
| `S0_MANIFEST_PARSE`, `S0_JSON_PARSE`, `S0_EXPECTED_MALFORMED_JSON`                                         | Parses contracts/manifests/positive JSON and proves declared malformed JSON remains malformed.                     | `CONTRACT_MANIFEST_PARSE`, `CONTRACT_JSON_PARSE`, and `CONTRACT_EXPECTED_MALFORMED_JSON` over the same corpus.                                                                                 | Retain byte-sensitive negative coverage.                                              |
| `S0_MANIFEST_SHAPE`                                                                                        | Version, status, and primary collection shape for all 28 manifests.                                                | `CONTRACT_MANIFEST_SHAPE` with ordinary `contract-fixture-manifest` and `contract-artifact-fixture-matrix` statuses.                                                                           | Rename without reducing the manifest denominator.                                     |
| `S0_JSONL_UTF8`, `S0_JSONL_PARSE`                                                                          | Fatal UTF-8 and per-record JSON validation for declared positive JSONL; declared negative streams remain negative. | `CONTRACT_JSONL_UTF8` and `CONTRACT_JSONL_PARSE` over the same declarations and payloads.                                                                                                      | Retain.                                                                               |
| `S0_ID_FORMAT`                                                                                             | Exact lexical form for `CAP`, `CON`, `REQ`, and `SDD` tokens in inventory and fixtures.                            | `CONTRACT_ID_FORMAT`; historical proposal-ID occurrences remain syntax data only.                                                                                                              | Retain without reservation semantics.                                                 |
| `S0_DUPLICATE_MODEL_ID`                                                                                    | Duplicate definitions across canonical and proposal models, with a temporary split-Capability exception.           | `CONTRACT_DUPLICATE_MODEL_ID` over canonical `spec/`; remove the split-proposal exception after `S05` is removed.                                                                              | Retain canonical duplicate coverage; retire only the bootstrap exception.             |
| `S0_UNKNOWN_REQUIREMENT`                                                                                   | Requires inventory/manifest Requirement mappings to resolve to proposal or canonical definitions.                  | `CONTRACT_UNKNOWN_REQUIREMENT` requiring active mappings to resolve canonically; versioned contracts may stand on explicit schema/contract authority without a historical Requirement mapping. | Retain and decouple.                                                                  |
| `S0_REQUIREMENT_SHAPE`                                                                                     | Metadata, Statement, and Acceptance sections across proposal and canonical Requirements.                           | Canonical `sdd validate` plus `CONTRACT_REQUIREMENT_SHAPE` for repository-maintenance fail-closed coverage.                                                                                    | Retain for canonical content; proposal coverage ends only when `S05` is removed.      |
| `S0_DUPLICATE_FIXTURE_NAME`, `S0_DUPLICATE_COVERAGE_KEY`                                                   | Unique case/pair/golden/variant names, artifact declarations, and split-table coverage keys.                       | `CONTRACT_DUPLICATE_FIXTURE_NAME` and `CONTRACT_DUPLICATE_COVERAGE_KEY`.                                                                                                                       | Retain.                                                                               |
| `S0_DUPLICATE_CONTRACT`, `S0_DUPLICATE_FIXTURE_FAMILY`, `S0_UNKNOWN_CONTRACT`, `S0_UNKNOWN_FIXTURE_FAMILY` | Inventory identity uniqueness and manifest-to-inventory resolution.                                                | Corresponding `CONTRACT_*` diagnostics over the decoupled inventory.                                                                                                                           | Retain.                                                                               |
| `S0_PATH_ESCAPE`, `S0_MISSING_TARGET`                                                                      | Lexical, existence, realpath/symlink containment, and declared target checks.                                      | `CONTRACT_PATH_ESCAPE` and `CONTRACT_MISSING_TARGET` with the same repository boundary.                                                                                                        | Retain.                                                                               |
| `S0_MARKDOWN_LINK_TARGET`, `S0_MISSING_ANCHOR`                                                             | Local links and anchors across proposal, canonical, plan, and docs surfaces.                                       | `CONTRACT_MARKDOWN_LINK_TARGET` and `CONTRACT_MISSING_ANCHOR` across canonical, architecture, plans, and docs; archived links remain checked.                                                  | Retain while removing the retired proposal tree from the denominator only after 10.3. |
| `S0_SCHEMA_REF_TARGET`, `S0_SCHEMA_REF_POINTER`                                                            | Local JSON Schema file and JSON Pointer resolution.                                                                | Corresponding `CONTRACT_*` diagnostics over the unchanged version 1 schema graph.                                                                                                              | Retain.                                                                               |
| `S0_UNDECLARED_FIXTURE`                                                                                    | Every artifact JSON and JSONL payload is declared once by a manifest.                                              | `CONTRACT_UNDECLARED_FIXTURE` over the same payload denominator.                                                                                                                               | Retain.                                                                               |
| `S0_TRUTH_TABLE_INCOMPLETE`, `S0_COVERAGE_TARGET`                                                          | Inventory-required case coverage, including split gate tables and mapped real case IDs.                            | `CONTRACT_TRUTH_TABLE_INCOMPLETE` and `CONTRACT_COVERAGE_TARGET` with unchanged required-case and case-ID sets.                                                                                | Retain.                                                                               |
| `S0_FINGERPRINT_MISMATCH`                                                                                  | Recomputes every SHA-256 value from exact `canonical_json_utf8` bytes.                                             | `CONTRACT_FINGERPRINT_MISMATCH` over byte-identical goldens.                                                                                                                                   | Retain byte-for-byte.                                                                 |
| `S0_TRAILING_WHITESPACE`, `S0_UNRESOLVED_TODO`                                                             | Repository-maintenance hygiene with the intentional prompt-injection exclusion.                                    | Corresponding `CONTRACT_*` diagnostics with the same exclusion and active surface.                                                                                                             | Retain.                                                                               |

Leaf 10.2 cannot remove `verify:stage-0` until the replacement produces a
complete exit-zero result over the retained denominator and a focused
comparison confirms every retained row above is equal or stronger. An
unavailable, crashed, truncated, or partially migrated run is not equivalence.

## Leaf 10.2 execution result

Leaf 10.2 completed on 2026-08-05 in the working tree based on `c4b5709`; no
commit or other Git operation was created. The old verifier completed first at
27,567 checks. The replacement `npm run verify:contracts` then completed at
27,369 checks from both the repository root and `/private/tmp`. The raw total is
not the equivalence denominator because proposal model definition/shape checks
and retired mapping lines intentionally left the active surface.

The focused before/after comparison produced:

| Retained surface                       |   Before |    After | Result                                                               |
| -------------------------------------- | -------: | -------: | -------------------------------------------------------------------- |
| Normalized diagnostic families         |       30 |       30 | Exact family set retained under the `CONTRACT_*` prefix.             |
| Version 1 contract IDs                 |       37 |       37 | Exact ordered ID set retained.                                       |
| Fixture-family IDs                     |       17 |       17 | Exact ordered ID set retained.                                       |
| Inventory-required cases               |      176 |      176 | Exact per-family case sets retained.                                 |
| Fixture manifests and matrices         |       28 |       28 | All use ordinary contract-fixture statuses.                          |
| Contract files / JSON Schema files     |  19 / 18 |  19 / 18 | Denominators retained.                                               |
| Fixture files / JSONL streams          | 310 / 14 | 310 / 14 | Denominators retained.                                               |
| Declared artifact payload files        |      188 |      188 | Denominator retained.                                                |
| Historical producer-literal payloads   |       15 |       15 | All fifteen are byte-identical to `c4b5709`.                         |
| Active historical Requirement mappings |       19 |        0 | Removed without reserving or canonizing the historical proposal IDs. |

The only non-manifest fixture edit was
`fixtures/v1/adapters/jsonl/discover-valid.jsonl`, whose historical
`REQ-20F8CA5C` test-name mapping was rebound to canonical `REQ-12E19D70` as
specified by `S17`. All malformed JSON, canonical JSON bytes, fingerprints,
case IDs, contract IDs, fixture-family IDs, truth-table required cases, and the
fifteen `sdd-yo-bootstrap-fixtures` producer payloads were preserved.

The complete required validation passed: `npm test` (202 tests),
`npm run test:package`, `npm run check:schemas`, `npm run build`,
`npm run typecheck`, `npm run format:check`, `npm run verify:contracts`, and
`git diff --check`. This satisfies the dependency for leaf 10.3; it does not
execute any 10.3 disposition.

## 10.2 and 10.3 execution handoff

Leaf 10.2 must execute only rows assigned to 10.2, preserve exact oracle bytes,
and record the before/after denominator and diagnostic-family comparison. It
does not remove `proposal/spec/` or the bootstrap procedure.

Leaf 10.3 may execute `S04`–`S09` only after 10.2 has removed all active
proposal dependencies. It must preserve the following nonnormative candidate
destinations in active-plan backlog prose, never as Requirement blocks:

- baseline currently implemented adoption semantics;
- baseline currently implemented qualitative mode and four-gate semantics;
- baseline currently implemented inactive-object, JSONL adapter, semantic
  completeness, and per-project isolation semantics;
- consider repository-local normative authority and external-link findings as
  a future behavior candidate.

The two retire-with-rationale rows need no future candidate. Milestone 11 does
not select any of these candidates implicitly.

## Leaf 10.3 execution result

Leaf 10.3 completed on 2026-08-05 in the working tree based on `3eed6f5`; no
commit or other Git operation was created. It executed only `S04`–`S09`:

- the former target-package route and complete temporary procedure moved to
  [`self-bootstrap-procedure.md`](self-bootstrap-procedure.md) as historical,
  non-authoritative rationale;
- all nine files under the former `proposal/spec/` tree and the two active
  bootstrap route files were removed after maintained links were decoupled;
- canonical, architecture, repository-instruction, rollout, and plan maps now
  name normal bounded Changes as the only path for product behavior;
- the twelve baseline destinations, one nonnormative future-behavior candidate,
  and two retire-with-rationale decisions remain preserved in this record and
  the active-plan backlog without active Requirement blocks or reserved IDs;
- `src/proposal/`, ProposalPackage, SpecPatch, schemas, fixtures, tests, and
  version 1 CLI behavior were not changed.

Focused retirement verification reproduced exactly 15 disposition rows: 12
`baseline-implemented-behavior-through-normal-change`, one
`preserve-as-nonnormative-backlog`, and two `retire-with-rationale`. It found no
file under the former target tree, no maintained Markdown link to a retired
path, and no active target-package or bootstrap-authority reference. Normal
proposal imports remained only under `src/proposal/` and their tests.

The complete required validation passed against the retired surface:
`npm test` (202 tests), `npm run test:package` (one packaged-consumer smoke
test), `npm run check:schemas`, `npm run build`, `npm run typecheck`,
`npm run format:check`, `npm run verify:contracts` (26,506 checks), and
`git diff --check`. The lower contract-oracle count is the intended removal of
the retired target Markdown files from local-link and model-document
denominators; no maintained contract, fixture, diagnostic family, or required
case was removed. The unrelated pre-existing `src/.DS_Store` remained
unmodified and outside the leaf.

After the active record was archived, the plan index updated, and the active
plan compacted to Milestone 11, the complete suite passed again against the
final closeout subject with 202 tests, one packaged-consumer smoke test, current
generated schemas, a successful build and typecheck, repository formatting,
26,370 contract-oracle checks, and `git diff --check`. The further oracle-count
decrease is the expected removal of completed Milestone 10 prose from the active
plan denominator, not loss of a maintained contract or fixture check.
