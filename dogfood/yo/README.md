# `yo` dogfood study

## Status

- Study class: small single-language project with one test runner.
- Selected project: `/Users/dev.briginas/dev/yo`.
- SDD Project boundary: the `yo` repository as one independent project.
- Adoption mode: `incremental`.
- First Change mode: `spec`.
- First governed Capability: the completed approval-gated exact patch behavior.
- Onboarding status: incremental SDD Project initialized; first baseline
  contract clarified; Node JUnit root-test compatibility verified in SDD Yo;
  first governed Capability authored and test-traceable; deterministic
  ProposalPackage validated and its exact approval subject recorded; external
  specification approval and current full-suite test execution evidence
  recorded and validated; baseline QA evidence recorded and validated; gates
  not yet run.

The repository owner selected this study boundary on 2026-08-01. That planning
decision is not SDD ApprovalEvidence, QAEvidence, a gate result, or permission
to mutate `yo`. Each onboarding or product mutation remains a separately
approved bounded leaf.

## First-Change boundary

The first Change will describe explicitly accepted existing behavior without
changing observable `yo` behavior. It may add or rename only the tests needed
to establish traceability for the first Capability. It must not implement the
planned context-compaction or allowlisted-validation milestones in `yo`.

The study begins from the existing project structure. Production code and tests
must not be reorganized merely to accommodate SDD Yo. SDD Yo remains advisory:
its reports do not protect branches or authorize merges.

## First baseline contract clarification

Milestone 7.1c selected the contract for the first `spec` Change without
editing `yo`. The accepted behavior is the completed Milestone 3 vertical
slice in which a model may propose bounded exact replacements for one existing
text file, while trusted harness code owns target authorization, the complete
immutable preview, terminal approval, revalidation, atomic application, and a
single safe result.

The first Capability will contain exactly these five automated Requirements:

1. accept only bounded, exact, non-overlapping replacements against one
   original UTF-8 text version, preserving its BOM and dominant line endings;
2. authorize exactly one existing regular target inside the approved workspace
   and reject traversal, sensitive paths, symlinks, and non-regular targets;
3. prepare a complete immutable preview and apply nothing unless an available
   interactive terminal receives explicit `y` or `yes` approval for it;
4. reauthorize the target, verify the approved base and result immediately
   before a same-directory atomic replacement, preserving the file mode and
   leaving the target intact on conflict, abort, timeout, or write failure;
5. resolve every proposal call exactly once with ordered, sanitized runtime
   lifecycle events and an outcome that states whether the patch was applied.

These descriptions select the Requirement boundaries but do not define SDD
objects. Stable `REQ-XXXXXXXX` identifiers will be generated only when the
separately approved baseline-authoring leaf creates the canonical objects in
`yo`.

### Existing test mapping

The following current test anchors are the selected evidence surface. The
baseline-authoring leaf may add the eventual Requirement ID to these test or
ancestor-suite names, but it must not change their assertions or runtime
behavior.

- **Exact replacement contract:** suites `proposePatchArgumentsSchema` in
  `src/runtime/patch-contracts.test.ts` and `preparePatchTransform` in
  `src/runtime/patch-transform.test.ts`.
- **Authorized target:** suite `resolvePatchTarget` in
  `src/runtime/patch-preparer.test.ts`.
- **Immutable preview and explicit approval:** suite `preparePatchProposal` in
  `src/runtime/patch-preparer.test.ts`; every test in
  `src/runtime/patch-approval.test.ts` and `src/terminal-approval.test.ts`; and
  test `renders a chat patch preview but denies it in non-interactive mode` in
  `src/cli-app.test.ts`.
- **Revalidation and atomic application:** suite `applyPatchProposal` in
  `src/runtime/patch-applier.test.ts`.
- **Single result and safe lifecycle:** tests `dispatches an approved patch
with separate safe authorization and lifecycle evidence`, `fails closed
after preparation when approval is absent, denied, or aborted`, `does not
prepare a patch after invalid arguments or a path-policy denial`, `fails
closed when propose_patch has no approval infrastructure`, and `maps
conflicts, timeouts, and failures without writing an unapproved result` in
  `src/runtime/tool-dispatcher.test.ts`; tests `propagates approved sequential
patch calls as safe ordered lifecycle events`, `denies an unapproved patch
and lets the model recover with a read-only result`, and `records a conflict
before a read and approved reproposal while isolating lifecycle observers`
  in `src/runtime/agent-loop.test.ts`; and tests `completes an inspected,
approved patch through chat and reports its exact outcome` and `reuses the
active chat input for approval without adding an approval response to the
conversation` in `src/cli-app.test.ts`.

The exact rename count and percentage will be measured after importing a
representative JUnit report, because SDD traceability may inherit one ID from a
retained ancestor suite. The mapping above remains the boundary if the report
loses hierarchy; in that case IDs must be present in the normalized leaf test
names instead.

### Adapter and evidence boundary

The first Change will use one required adapter named `unit`, with type `junit`,
and a repository-scoped report such as `artifacts/junit/yo.xml`. The host will
run the unchanged full `node:test` suite with Node's built-in JUnit reporter;
SDD Yo will import that report with an explicit `--adapter unit` selection. No
custom JSONL adapter, shell command, selective-test executor, or
TypeScript-specific behavior will be added to SDD Yo for this Change.

Before test names are edited, the baseline-authoring leaf must generate one
representative report and confirm whether Node's JUnit output retains the
required suite hierarchy and stable test identity. A failure of that check
does not permit guessed mappings: it requires an explicit clarification of the
adapter or rename plan.

The future project configuration will allow these local evidence issuer names:

- `local-product-review` for ApprovalEvidence supplied by the actual Spec
  Approver;
- `local-test-run` for TestExecutionEvidence derived from the authorized full
  suite run;
- `local-qa` for QAEvidence supplied by the actual QA tester.

Issuer authentication, actor authorization, and artifact creation remain
external human workflow responsibilities. The first approval must bind
`spec` mode, the resolved base commit, and the exact semantic and structural
delta fingerprints. It must not be inferred from this clarification, the old
Milestone 3 approval, a passing test run, or repository ownership.

### Baseline QA boundary

All five Requirements are automated and must have current mapped passing test
results at the candidate head. Baseline QA independently covers the Capability
at that same head and its resolved integration commit. The authorized QA
tester will review at least one explicitly approved application, one
non-interactive or declined no-write outcome, and one stale-source conflict on
a temporary workspace fixture, then decide the Capability as a whole. No
manual Requirement decision is expected unless authoring changes a Requirement
to `verification: manual`.

The full unchanged `yo` suite, project formatting, SDD graph validation, and
the imported TestIndex must also pass. A live provider or paid request is not
required for deterministic coverage and will not be performed without
separate authorization. This clarification creates no ApprovalEvidence,
TestExecutionEvidence, QAEvidence, gate result, or permission to mutate `yo`.
The runtime lifecycle events named above are not versioned SDD Evidence
artifacts.

## Baseline authoring and traceability result

Milestone 7.1d authored `CAP-7E001BA8` with exactly five automated
Requirements:

- `REQ-32B1F442` — bounded exact replacements;
- `REQ-60E10F76` — safe existing target authorization;
- `REQ-17B4C424` — immutable preview and explicit terminal approval;
- `REQ-245F8421` — immediate revalidation and atomic replacement;
- `REQ-D8B3ADC2` — single safe lifecycle settlement.

The `unit` JUnit adapter reads `artifacts/junit/yo.xml`. The selected issuer
names are `local-product-review`, `local-test-run`, and `local-qa`; this
allowlist creates no evidence and grants no actor authority by itself.

The full unchanged runtime suite passed all 286 Node test-runner tests. Its
JUnit report contained 272 executable `<testcase>` entries. Establishing the
selected mapping required editing 23 source name anchors: five ancestor suites
and 18 top-level or leaf tests. Suite inheritance and direct names produced 41
mapped executable TestIndex entries, or 15.1% of the imported entries:

- 9 for `REQ-32B1F442`;
- 5 for `REQ-60E10F76`;
- 11 for `REQ-17B4C424`;
- 6 for `REQ-245F8421`;
- 10 for `REQ-D8B3ADC2`.

Candidate graph validation returned one Capability, five Requirements, no
Concepts, complete configured Git history, and no diagnostics. Candidate
TestIndex construction in an isolated temporary Git repository succeeded with
the expected `SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE` warning for Node's
top-level tests. Project formatting passed after temporary reports were
removed. The temporary candidate repository, JUnit report, and TestIndex were
deleted; no ApprovalEvidence, TestExecutionEvidence, QAEvidence, or gate result
was created.

## Proposal validation and approval subject result

Milestone 7.1e built the current local SDD Yo CLI and mechanically validated
the committed `yo` baseline candidate with:

```text
node /Users/dev.briginas/dev/sdd-yo/dist/bin/sdd.js proposal validate \
  --cwd /Users/dev.briginas/dev/yo \
  --mode spec \
  --base 84133ed37f470040aa829bef393197697934fa9e \
  --candidate /Users/dev.briginas/dev/yo \
  --format json
```

The base is the committed initialized empty SDD Project. The candidate is the
clean `yo` worktree at
`7d8422824ab8cddb9df730232e476759af070aea`. Two independent stdout runs each
exited 0 and produced byte-identical 1,139-byte JSON responses with status
`ok`, no diagnostics, and this exact ProposalPackage subject:

- project: `SDD-4A2395B6`;
- mode: `spec`;
- base tree:
  `sha256:97ad08de035888c1cc13e58f668195d1cb0936b4b0df26440558c043737c189f`;
- candidate tree:
  `sha256:921632dd7d44d238df535c733ee09763c78b234f098708d4005365c51ae68278`;
- semantic delta:
  `sha256:9d7bbfed46510a6812a346e4d33e5032efa06e5dba70e96c2d3989b10b75195e`;
- structural delta:
  `sha256:ab6e6aa2c9a40b609471371e7816d9a337dd192561a568b6367d2806cbc01bbe`;
- affected scope:
  `sha256:0ba8c31e9565ae587084aaeefa776e9ba955eecd1e32ef39e6f6978d2b4ed4bc`.

The object delta adds exactly `CAP-7E001BA8` and its five selected
Requirements, with no modified or deleted SDD objects. The affected scope is
the same Capability and five Requirements. `code_targets` and deterministic
`semantic_candidates` are empty, as expected for this baseline package.

The CLI also rejected an attempted absolute `--output` path outside `yo` with
`SDD_CONFIG_CLI_OUTPUT_INVALID`, preserving its project-scope write boundary.
The successful validation therefore used stdout and did not retain a package
file or modify `yo`. Mechanical validity did not confirm that the described
existing behavior deserved canonical status; that separate human decision is
recorded below.

## External specification approval result

Milestone 7.1f presented the exact 7.1e ProposalPackage subject to the actual
Spec Approver. `ivan-briginas` decided `approved` through the configured
`local-product-review` issuer because the Requirements correctly describe the
accepted existing behavior. The decision is recorded inside the `yo` project
as `evidence/approvals/7.1e-baseline-spec.json`.

Before recording the evidence, two proposal validations from the `yo` root
again exited 0 and produced byte-identical 1,139-byte JSON responses. An
additional self-contained run from the SDD Yo root with explicit
`--cwd /Users/dev.briginas/dev/yo` produced the same ProposalPackage subject.
Strict project-scoped import and approval assessment returned `current` with no
issues for the exact project, configured issuer, `spec` mode, base commit, and
semantic and structural delta fingerprints.

This decision approves only the baseline specification of existing behavior.
It is not TestExecutionEvidence, QAEvidence, a Verification or Merge Gate
result, permission to merge, or approval of a later `yo` milestone.

## Current test execution evidence result

Milestone 7.1g retained the unchanged `yo` candidate head at
`b446b0d6a98cc2b87b63aa3d0d6c63cc78a179fa` and ran the complete unchanged
Node test suite with simultaneous `spec` and JUnit reporters. All 286
test-runner tests in 27 suites passed; none failed, skipped, or remained todo.
The generated JUnit report contained 272 executable test cases.

The current local SDD Yo CLI imported that configured `unit` report into
`evidence/test-indexes/7.1g-full-suite.json`. The normalized TestIndex retained
the expected producer hierarchy warning, contained 272 executable entries and
41 Requirement-mapped entries, and bound these exact subjects:

- project: `SDD-4A2395B6`;
- head: `b446b0d6a98cc2b87b63aa3d0d6c63cc78a179fa`;
- configuration:
  `sha256:35be403c6507a2ccc44d579ca38bf115007752927fa1bc5e5a62e491f90594cb`;
- `unit` adapter:
  `sha256:495f4f05fdb1ac3387894db0c64ad8070f08096c78d533693171141d9d2c531a`;
- TestIndex:
  `sha256:e070b76f3d25fd30073b6a1a618f3d666598fdd5c28a43ecfa1ec93efb945021`.

Project-scoped TestExecutionEvidence from the configured `local-test-run`
issuer is recorded as
`evidence/test-executions/7.1g-full-suite.json`. It contains one current
`passed` result for every one of the 272 TestIndex entries. Strict parsing and
evidence assessment satisfied test coverage and execution for all five
affected automated Requirements with no unsatisfied Requirement. The only
remaining assessment issue was the expected `SDD_EVIDENCE_QA_MISSING` with
`REVIEW_REQUIRED` for `CAP-7E001BA8`; no QA evidence was fabricated and no
Verification or Merge Gate was run.

An initial import that combined the configured `unit` report with an explicit
import of the same path was correctly rejected with
`SDD_ADAPTER_DISCOVERY_DUPLICATE_ID`. Selecting the configured adapter once
resolved the duplicate without changing configuration or product behavior.
The temporary JUnit and CLI response files were removed after the retained
TestIndex and TestExecutionEvidence were validated.

## Baseline QA evidence result

Milestone 7.1h exercised the three scenarios selected in 7.1c through the
actual `yo` patch dispatcher on temporary workspace fixtures. The focused Node
test run covered an explicitly approved application, absent, denied, and
aborted approval with no write, and a stale-source conflict that retained the
newer source. All three selected tests passed; none failed, skipped, or
remained todo. The runtime, tests, specification, and configuration at the
bound candidate remained unchanged; the later `yo` head differed from that
candidate only by the retained 7.1g TestIndex and TestExecutionEvidence.

After reviewing the Capability contract, the selected scenarios, and the
prior approval and test evidence, the actual local QA engineer
`ivan-briginas` decided `passed` for `CAP-7E001BA8`. Project-scoped QAEvidence
from the configured `local-qa` issuer is recorded as
`evidence/7.1h-baseline-qa.json` with these exact subjects:

- candidate head: `b446b0d6a98cc2b87b63aa3d0d6c63cc78a179fa`;
- resolved integration commit:
  `4e851106eb446c82a85684d38912b84e77cb8f89`;
- affected scope:
  `sha256:0ba8c31e9565ae587084aaeefa776e9ba955eecd1e32ef39e6f6978d2b4ed4bc`.

Strict artifact import and evidence assessment accepted the configured issuer,
actor, decision, exact project and subjects, the Capability decision, and the
empty manual-Requirement list. Combined with the retained 7.1g evidence, the
assessment satisfied test coverage and execution for all five automated
Requirements plus QA coverage for the affected Capability with no issues. No
Verification or Merge Gate was run, and the QA decision grants no Git or
hosting authorization.

## Initialization result

Milestone 7.1a used the locally built SDD Yo CLI on 2026-08-01:

```text
node dist/bin/sdd.js init \
  --root /Users/dev.briginas/dev/yo \
  --adoption incremental \
  --format json
```

- Result: `ok` with no diagnostics.
- Assigned project identity: `SDD-4A2395B6`.
- Created paths: `.sdd/config.yaml`, `spec/README.md`, `spec/capabilities`, and
  `spec/concepts`.
- Measured command time: 0.10 seconds real, 0.10 seconds user, and 0.01 seconds
  system on the local macOS host. This excludes the preceding local CLI build
  and is not yet the full setup-time metric.
- Existing tracked `yo` files were not modified, and the CLI created no branch
  or commit.
- `sdd validate --cwd /Users/dev.briginas/dev/yo --format json` returned `ok`,
  an empty valid graph, and complete history resolved at
  `d2dd21193155b236eeb6b0542b7c1b8e14dac439`.
- The unchanged `yo` runtime suite passed all 286 tests after initialization.
- `npm run format:check` did not pass: the project Prettier configuration
  rejected both generated files. This failure is recorded below and must not be
  reported as a passing project check.
- The generated configuration has no test adapters or allowed evidence issuers;
  those remain later explicit decisions.

### OBS-YO-001 — Project selector recovery is underspecified

During setup, an operator first attempted `sdd validate --project <path>`.
The CLI rejected the unsupported option with
`SDD_CONFIG_CLI_ARGUMENT_INVALID`, but its remediation only said to correct the
arguments. The documented selector is `--cwd`; the diagnostic did not name the
unknown option or the supported project selectors. Classify this as a
provisional recurring usability observation pending the other dogfood studies.

### OBS-YO-002 — Initialization output requires host formatting

After successful initialization and graph validation, the existing
`npm run format:check` command rejected `.sdd/config.yaml` and
`spec/README.md`. The generated YAML and frontmatter use SDD Yo's deterministic
two-space, double-quoted style, while the project's Prettier configuration
expects four-space indentation and single quotes. No existing tracked file was
affected, and all runtime tests passed, but the repository-wide formatting gate
is not green immediately after onboarding.

Milestone 7.1b resolved the project-local failure by formatting only the two
initialized files with the existing `yo` Prettier configuration. It changed no
formatter setting and excluded no SDD path. After formatting:

- `npm run format:check` passed;
- `sdd validate` returned the same `SDD-4A2395B6` identity, an empty valid
  graph, complete history, and no diagnostics;
- all 286 existing `yo` tests passed.

For `yo`, classify formatting as an expected post-init host-integration step,
not a reason to change the project's formatter or ignore SDD files. Formatting
must happen before decision-bearing proposal, approval, or exact-patch
artifacts are created because their tree or file hashes would otherwise become
stale. Keep the missing onboarding guidance as a provisional documentation
observation for comparison with later dogfood projects.

### OBS-YO-003 — Node JUnit mixes suites and root testcases

Before the first traceability rename, the unchanged full `yo` suite was run
with Node's built-in JUnit reporter. The report preserved every `describe`
suite as `<testsuite>`, but emitted each top-level `test(...)` directly under
the root `<testsuites>` element. The initial SDD import returned
`SDD_ADAPTER_JUNIT_MALFORMED_XML` because the importer required every
`<testcase>` to have a suite parent.

Milestone 7.1c.1 resolved the producer-compatibility gap in SDD Yo. Direct
root testcases now import as executable tests with `parent_id: null`, nested
suites in the same report remain intact, and the importer emits
`SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE` rather than inventing a synthetic or
framework-derived suite. The regression is bound to `REQ-6D8DDDF7` and
`REQ-12E19D70`. No `yo` file, human evidence, or gate result was retained from
the failed authoring attempt.

## Observation boundary

Record measured results and concrete examples here as the study progresses:

- elapsed time to initialize the SDD Project and define its first governed
  Capability;
- custom test-adapter work, including whether one is required;
- the count and percentage of existing tests whose normalized names need exact
  Requirement IDs;
- friction caused by Git history, repository layout, and project boundaries;
- useful, false-positive, and missed semantic review candidates;
- time and clarification needed for the author, developer, and QA roles to
  understand affected scope;
- diagnostics that do not give a clear recovery action;
- every output or explanation that could confuse governed scope with complete
  project coverage.

For each observation, record the command or workflow step, expected and actual
result, relevant stable diagnostic or artifact identity, measured effort, and
whether the issue appears project-specific or recurring. Do not store secrets,
OAuth material, unrestricted environment output, or fabricated human evidence.

## Success boundary

The `yo` study is complete only when one real Change is governed end to end
with understandable diagnostics and without adding TypeScript- or `node:test`-
specific behavior to the SDD Yo core. Completion requires an explicit review of
the recorded observations; a successful command demo alone is insufficient.
