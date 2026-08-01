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
  first governed Capability authored and test-traceable; human evidence and
  gates not yet run.

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
