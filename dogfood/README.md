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

This synthesis does not satisfy the three-repository MVP criterion in
[`evals-and-rollout.md`](../proposal/architecture/evals-and-rollout.md), prove
cross-project behavior, or establish whole-project completeness. The studies
used `spec` Changes to baseline accepted existing behavior under incremental
adoption; neither study claims that all behavior in its host repository is
governed.

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

## Bounded follow-up work

Milestone 7.4 owns fixes, one independently verified leaf at a time:

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

The first follow-up is a contract-clarification leaf. It must resolve the
supported retention topology before implementation changes; no current
Requirement or architecture document defines an unambiguous recovery that can
be safely inferred from the blocked dogfood run.

## Deferred claims

- The existing-monorepo study and two-project isolation evidence remain
  deferred.
- The three-repository MVP checklist item remains incomplete.
- Cross-platform reproducibility, broader usability, and enforced merge policy
  remain outside these two studies.
- No observation here authorizes a product fix, external-project mutation,
  branch operation, merge, approval, or QA decision.
