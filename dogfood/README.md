# Existing-project dogfood synthesis

## Status

- Completed studies: [`yo`](yo/README.md), a small single-language project
  with one test runner; and [`pi`](pi/README.md), an existing multi-framework
  npm workspace governed as one SDD Project.
- Synthesis scope: Milestone 7.3.
- Result: the two studies confirm bounded onboarding, traceability, proposal,
  approval, current test-evidence, and QA workflows, while leaving several
  workflow problems and eval measurements unresolved.
- Deferred study: an existing monorepo with two independent SDD Projects and
  explicit project and evidence isolation.

This synthesis satisfies the two complementary existing-project study shapes
required by the MVP checklist in
[`evals-and-rollout.md`](../proposal/architecture/evals-and-rollout.md). It does
not prove sibling-project isolation, cross-project behavior, broader monorepo
usability, or whole-project completeness. The studies used `spec` Changes to
baseline accepted existing behavior under incremental adoption; neither study
claims that all behavior in its host repository is governed.

## Comparable results

| Evaluation surface                | `yo`                                                                                                      | `pi`                                                                                                                      | Synthesis                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Initialization                    | Valid empty incremental project in 0.10 seconds                                                           | Valid empty incremental project in 0.17 seconds                                                                           | Reproduced; timings exclude CLI build and host setup and are not full onboarding time                    |
| Test adapters                     | One existing Node JUnit producer; no custom adapter                                                       | Existing Vitest and Node JUnit producers; no custom adapter                                                               | Reproduced without language-specific core or custom adapter work                                         |
| JUnit hierarchy                   | Node root testcases required the 7.1c.1 compatibility fix; some leaves have no suite parent               | Node retained hierarchy; Vitest flattened suite information into names                                                    | Producer hierarchy cannot be assumed; the existing warning and direct leaf IDs provide a usable fallback |
| Traceability                      | 23 source-name anchors yielded 41 mapped entries out of 272, or 15.1%                                     | Nine existing name anchors plus two new deterministic tests yielded 11 mapped entries out of a focused 16-entry TestIndex | Both established bounded traceability; only `yo` recorded a repository-wide TestIndex denominator        |
| Proposal review candidates        | Empty for the baseline `spec` ProposalPackage                                                             | Empty for the baseline `spec` ProposalPackage                                                                             | Determinism was confirmed, but false-positive and missed semantic-candidate behavior was not exercised   |
| Approval, execution, and QA       | Current project-scoped evidence validated                                                                 | Current project-scoped evidence validated                                                                                 | Reproduced for the selected Capability boundaries                                                        |
| Verification and Merge assessment | Deterministic `BLOCKED` MergeReport exposed current-ref, historical-ID, stale-scope, and retention issues | Not run                                                                                                                   | The `yo` gate observations cannot be classified as absent or project-specific from `pi` evidence         |
| Host formatting                   | Generated files were formatter-owned and needed host formatting                                           | Generated file types were ignored by the host formatter                                                                   | Every onboarding must check formatter ownership, but the concrete outcomes are project-specific          |
| Role comprehension time           | Not measured                                                                                              | Not measured                                                                                                              | Eval measurement remains incomplete                                                                      |

The initialization measurements are machine-local command timings, not
performance claims. Neither study measured total elapsed time from an empty
project to its first governed Capability. The `pi` focused TestIndex also does
not support a percentage over all existing executable tests. These omissions
must remain explicit rather than being reconstructed from commit timestamps or
partial reports.

## Observation classification

### Reproduced constraints

- Existing JUnit producers do not reliably retain the same suite hierarchy.
  `yo` exposed Node root testcases, while `pi` exposed flattened Vitest names.
  SDD Yo handled both with stable normalized leaf names, direct Requirement IDs
  where needed, and `SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE`; no new adapter
  type is justified by these studies.
- Host formatter ownership must be checked immediately after initialization
  and before creating fingerprint-bound artifacts. `yo` required formatting;
  `pi` ignored the generated file types. This is a recurring onboarding
  decision point, not one shared formatter defect.
- Partial-adoption scope required explicit wording throughout both studies.
  The recorded Capability, approval, tests, and QA decision cover only the
  selected baseline behavior, not either complete repository.

### Project-specific or already resolved observations

- `OBS-YO-002` was resolved by applying the existing `yo` formatter only to
  initialized files. `OBS-PI-001` is the opposite host boundary: Biome does not
  own those file types. Neither result supports changing deterministic init
  bytes globally.
- `OBS-YO-003` was a real Node JUnit compatibility defect and was already fixed
  and regression-tested in Milestone 7.1c.1.
- `OBS-PI-002` is pre-existing generated-lock drift in `pi`. It limited a host
  root check but is not an SDD Yo product defect.
- The initially incorrect Vitest executable path in `pi` was recovered with
  the workspace-native command. It is package-layout-specific adapter
  invocation friction, not evidence for package-manager logic in SDD Yo.

### Confirmed once, not comparable in the second study

- `OBS-YO-001`: an unsupported project-selector diagnostic did not name the
  supported `--cwd` recovery.
- `OBS-YO-004`: retaining evidence on the integration branch advanced the Git
  subjects that the baseline evidence bound, leaving no demonstrated
  in-project retention topology for a current gate.
- `OBS-YO-005`: after recomputation collapsed affected scope to empty, test and
  QA summaries said `PASS` with zero satisfied and zero unsatisfied objects
  beneath a correctly `BLOCKED` report.
- `OBS-YO-006`: retaining a directory candidate inside the project created a
  duplicate nested SDD Project; the tar workaround required an undocumented
  manual extraction step.

The `pi` study stopped after current QA evidence and did not execute the
Verification or Merge gates. Therefore `OBS-YO-004`, `OBS-YO-005`, and
`OBS-YO-006` are not reproduced, disproved, or safely classified as
`yo`-specific. A later fix may rely on the concrete `yo` reproduction, but it
must not claim two-project confirmation.

## Resolved follow-up work

1. Clarify and test a baseline evidence-retention topology that preserves the
   current Git subjects required by Approval, QA, Verification, and Merge
   assessment. This is first because the demonstrated topology prevented the
   `yo` baseline from reaching a meaningful non-blocked gate result.
2. Make empty recomputed scope visibly non-verifying in decision summaries so
   zero-object `PASS` cannot be mistaken for verification of an earlier
   approved scope.
3. Define a reproducible portable candidate-snapshot workflow that neither
   creates a nested discoverable SDD Project nor depends on an undocumented
   manual extraction step.
4. Improve onboarding recovery guidance for project selectors, host formatter
   ownership, and producer-specific JUnit hierarchy without embedding host
   language, framework, or package-manager behavior in the core.
5. Tighten the existing-project eval record so future studies capture total
   time to first Capability, a repository-wide traceability denominator,
   semantic-candidate review quality, and role-comprehension time.

### 7.4a resolution — External retention with project-local staging

Milestone 7.4a resolves `OBS-YO-004` at the workflow-contract boundary. Durable
ApprovalEvidence, TestExecutionEvidence, QAEvidence, candidate bytes, and gate
reports belong to a project-namespaced store outside the Git refs being
assessed. For a CLI run, the invoker materializes their exact immutable bytes
under an ignored staging root inside the selected project, passes explicit
project-relative paths, and exports deterministic output before optional
cleanup. The staging root is never committed to the proposal or integration
ref, and no retention-only branch or tag is created.

This topology preserves existing path containment and strict subject
validation while preventing evidence retention from advancing the subjects it
binds. A moved ref still makes dependent evidence stale and requires new
evidence. This clarification changes no runtime, schema, or gate semantics. It
does not define the portable candidate-snapshot production and materialization
workflow in `OBS-YO-006`; that remains bounded Milestone 7.4c.

### 7.4b resolution — Empty scope is non-verifying

Milestone 7.4b resolves the report-comprehension problem in `OBS-YO-005`.
When gate recomputation produces no affected Requirements or Capabilities, the
MergeReport now emits `NOT_APPLICABLE` for both nested test and QA summaries,
with zero satisfied and zero unsatisfied objects. The schema rejects an empty
scope paired with `PASS` summaries and rejects `NOT_APPLICABLE` when the scope
is non-empty. The human view states that the summaries are non-applicable
because the affected scope is empty.

This nested summary state does not change the Merge Gate's top-level `PASS`,
`REVIEW_REQUIRED`, or `BLOCKED` result, blocker-first precedence, or any
evidence subject. A Requirement-named regression reproduces the original
integration-advance condition and confirms the overall report remains
`BLOCKED` while its zero-object summaries no longer imply verification.

### 7.4c resolution — Git-ref candidate snapshot manifest

Milestone 7.4c resolves the reproducibility problem in `OBS-YO-006` with
`sdd candidate snapshot`. The command resolves explicit base and candidate Git
refs, reads the same selected SDD Project from both trees, and creates an exact
CandidateTreeManifest at a new Git-ignored project-relative staging path. The
retained manifest contains only the configured specification files, so it can
be passed directly to proposal preparation or merge assessment without
retaining a second `.sdd/config.yaml` or extracting a tar archive.

The output path must already have a safe in-project parent, cannot traverse a
symbolic link, and is created exclusively so an existing retained value is not
replaced. The command neither adds archive support nor manages the external
durable store; the invoker still exports and later materializes the exact
manifest bytes under the retention topology established in 7.4a.

### 7.4d resolution — Producer-neutral onboarding recovery

Milestone 7.4d resolves the guidance gap in `OBS-YO-001` and makes the two
reproduced onboarding decision points actionable without adding host-specific
behavior. Unsupported `--project` use, conflicting selectors, and project
resolution failures now direct the invoker to either `--cwd <project-root>` or
the exact `--config <project-root>/.sdd/config.yaml` selector.

After initialization, the invoker checks whether the existing host formatter
owns the created file types and formats only those files when applicable,
before creating fingerprint-bound artifacts. The CLI neither detects nor runs
that formatter. When a JUnit producer reports unavailable hierarchy, the
invoker reviews normalized full names and either places Requirement IDs
directly in applicable executable test names or selects a producer mode that
retains suites. SDD Yo continues to report the loss and never reconstructs
framework-specific hierarchy.

### 7.4e resolution — Complete future-study measurements

Milestone 7.4e tightens the existing-project onboarding eval so future studies
measure total wall-clock time from the clean selected baseline through a
committed, valid first governed Capability. The measurement includes host
setup, formatting, authoring, traceability work, and waits, and records its
start, stop, and any exclusions rather than substituting the isolated init
command duration.

Each future study also records the repository-wide existing executable-test
count, the existing normalized names that require Requirement IDs, and the
resulting percentage. New tests and focused TestIndexes remain separate and
cannot provide that denominator. Semantic-candidate quality requires human
classification of every candidate as useful or false-positive plus a stated
method and results for finding missed review relationships. A zero-candidate
package alone is not evidence that false positives or misses are absent.

Author, developer, and QA comprehension are timed separately from the same
bounded review packet, including the clarifications each role needs to identify
affected specification, implementation or test, and QA scope. The `yo` and
`pi` command timings, focused reports, and commit history do not satisfy these
measurements. Their missing values remain `not measured`; this resolution
changes the record required of future studies without fabricating historical
results.

## Deferred claims

- The existing-monorepo study and two-project isolation evidence remain
  deferred.
- The two-study MVP onboarding criterion does not establish monorepo or
  sibling-project isolation guarantees.
- macOS reproducibility, broader usability, and enforced merge policy
  remain outside these two studies.
- No observation here authorizes a product fix, external-project mutation,
  branch operation, merge, approval, or QA decision.
