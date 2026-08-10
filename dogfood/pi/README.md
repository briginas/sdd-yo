# `pi` dogfood study

## Status

- Study class: existing multi-framework project.
- Selected project: `/Users/dev.briginas/dev/pi`.
- Selection baseline: clean `main` worktree at
  `85f89db9bcf4104b1e207ddb6f787bc5a4b631ce`.
- SDD Project boundary: the complete `pi` repository as one independent
  project.
- Adoption mode: `incremental`.
- First Change mode: `spec`.
- First governed Capability: existing user-prompt acquisition across the
  coding-agent CLI and terminal input components.
- Onboarding status: empty incremental SDD Project initialized; first baseline
  contract clarified, authored, test-traceable, mechanically validated, and
  externally approved as a current `spec` subject; current test execution and
  baseline QA evidence are recorded. No Verification or Merge gate has run.

The repository is an npm workspace containing several packages, but this study
treats the complete repository as one SDD Project because its packages share
one Git history, root configuration, dependency lock, and root test workflow.
That choice does not satisfy the deferred existing-monorepo study, which still
requires two independently configured SDD Projects and explicit project and
evidence isolation.

The user selected this study boundary on 2026-08-02. This planning decision is
not permission to mutate `pi`, ApprovalEvidence, QAEvidence, a gate result, or
acceptance of the proposed baseline specification. Initialization and every
later mutation remain separately approved bounded leaves.

## Selection evidence

The existing package scripts establish the multi-framework boundary without a
custom SDD adapter or a language-specific core change:

- `packages/agent`, `packages/ai`, and `packages/coding-agent` use Vitest;
- `packages/tui` uses the Node.js test runner;
- the root `test` script delegates to package test scripts, while the repository
  instructions require `./test.sh` for the safe non-e2e project test workflow.

The repository is TypeScript rather than polyglot. Milestone 7.2 accepts either
a polyglot or a multi-framework project, so the independent Vitest and
`node:test` producers are the characteristic under study.

## First-Change boundary

The first `spec` Change will baseline accepted existing behavior for acquiring
one user prompt without changing observable runtime behavior. Its bounded
subject is the path from terminal or CLI input to the exact prompt value made
available to the coding-agent session:

- terminal input submits the edited value through the configured submit action
  without silently dropping ordinary input characters;
- piped standard input, file text, and the first CLI message are combined in
  their defined order to form the initial prompt;
- remaining CLI messages stay available as later prompts rather than being
  absorbed into the initial prompt.

The clarification leaf must turn this boundary into the smallest accepted
Requirement set before any SDD object or stable ID is created. It must confirm
that these behaviors are product commitments rather than merely current
implementation details.

The initial test anchors are:

- Vitest: `packages/coding-agent/test/initial-message.test.ts`;
- `node:test`: `packages/tui/test/input.test.ts` and only the directly relevant
  submission cases in `packages/tui/test/editor.test.ts` if clarification shows
  they verify the accepted boundary.

These paths are candidates, not a traceability claim. The clarification leaf
must inspect normalized report names and select exact tests or ancestor suites
before names receive Requirement IDs. It must not broaden the Capability to
general editor behavior, rendering, model execution, tool execution, session
persistence, or provider transport.

## Adapter and evidence boundary

The first Change is expected to configure two required JUnit adapters with
distinct report paths and names: one report produced by Vitest for the affected
coding-agent surface and one produced by `node:test` for the TUI surface. The
clarification leaf must first prove that both current producers yield stable,
importable normalized names. If either producer cannot supply adequate JUnit,
the result is an explicit adapter decision; it does not authorize framework
logic in SDD Yo or guessed traceability.

Approval, test execution evidence, QA evidence, and later gate inputs must bind
the exact `pi` project, commits, configuration, TestIndex, and proposal
subjects. No live model provider, credential, network request, paid request,
release action, or e2e test requiring external services belongs to this
baseline.

## Initialization result

Milestone 7.2b used the locally built SDD Yo CLI on 2026-08-02:

```text
node dist/bin/sdd.js init \
  --root /Users/dev.briginas/dev/pi \
  --adoption incremental \
  --format json
```

- Result: `ok` with no diagnostics.
- Assigned project identity: `SDD-B6FCE07B`.
- Initialization commit: `8ce561aacd3ea0c7a098b923dad07faec3a0db09`.
- Created paths: `.sdd/config.yaml`, `spec/README.md`, `spec/capabilities`, and
  `spec/concepts`.
- Measured command time: 0.17 seconds real, 0.12 seconds user, and 0.02 seconds
  system on the local macOS host. This excludes the preceding local CLI build
  and dependency hydration needed for the host formatter check.
- Existing tracked `pi` files were not modified, and the CLI created no branch
  or commit.
- `sdd validate --cwd /Users/dev.briginas/dev/pi --format json` returned `ok`,
  an empty valid graph with zero Capabilities, Requirements, Concepts, or
  fingerprints, and complete history resolved at
  `85f89db9bcf4104b1e207ddb6f787bc5a4b631ce`.
- After committing only the two initialized files, the same validation result
  held with complete configured history resolved at the initialization commit.
- The result exercises the initialized-project behavior in `REQ-382BBBD6`,
  stable identity in `REQ-BFC18F28`, the permitted empty incremental index in
  `REQ-DD91AD0F`, and complete-history reporting in `REQ-8B656FC5` without
  claiming new automated Requirement coverage.
- The generated configuration has no test adapters or allowed evidence
  issuers; those remain later explicit decisions.

### OBS-PI-001 — The host formatter does not own initialized SDD file types

The selected baseline had no installed dependencies. `npm ci --ignore-scripts`
installed the exact lockfile dependencies without lifecycle scripts; npm
reported 352 packages added in 4 seconds, one unsupported-engine warning for a
workspace dependency under the current Node.js 22.22.3 runtime, and four audit
findings. Dependency hydration did not change tracked files and is recorded
only as a setup prerequisite, not as a product vulnerability assessment or
remediation leaf.

A read-only targeted check with Biome 2.3.5 then exited 1, reported that it
checked zero files in 1395 microseconds, and identified `.sdd/config.yaml` and
`spec/README.md` as ignored by `biome.json`. Their SHA-256 hashes remained
unchanged, and subsequent SDD validation returned the same project identity,
empty graph, complete history, and no diagnostics.

Unlike `OBS-YO-002`, onboarding did not create files that the host formatter
owns but rejects. The `pi` formatter scope currently excludes both initialized
SDD file types, so 7.2b records no host-formatting pass for them and does not
change the formatter configuration or SDD output. Treat this as a provisional
project-specific coverage boundary for later cross-study synthesis.

## First baseline contract clarification

Milestone 7.2c used the committed empty-project base
`8ce561aacd3ea0c7a098b923dad07faec3a0db09`. The first `spec` Change has the
working Capability title **User prompt acquisition** and exactly three
automated candidate Requirements. Stable Capability and Requirement IDs remain
deferred until the authoring leaf. This clarification selects the proposal
subject; the later actual Spec Approver still decides whether the behavior
deserves canonical status.

### Compose the initial prompt from CLI sources

The coding-agent CLI composes one initial prompt from the available piped
standard input, processed file text, and first positional CLI message, in that
order.

- Non-empty standard input can form the initial prompt by itself; processed
  file text and the first positional message are included when present.
- Source strings are concatenated directly without an inserted delimiter.
  Producer-provided newlines therefore remain significant.
- When the combined result is empty, the selected mode does not send an initial
  prompt.
- File-image acquisition, argument parsing, file decoding, provider transport,
  and prompt-template expansion are outside this Requirement.

### Preserve later positional messages as later prompts

Only the first positional CLI message contributes to the composed initial
prompt. Every remaining positional message retains its original order and is
made available to the selected interactive or print mode as a later prompt.

- Building the initial message removes at most the first positional message.
- Print and interactive startup processing preserve the remaining array order.
- Streaming, compaction, retry, RPC, and post-startup steering or follow-up
  queues are outside this Requirement.

### Submit an ordinary interactive Editor prompt

The main multi-line TUI Editor submits a non-command ordinary prompt through
its configured submit action and makes the resulting text available to the
coding-agent interactive input path.

- Paste markers are expanded, leading and trailing whitespace is trimmed, and
  an empty result is not submitted.
- Ordinary internal characters are retained. A backslash immediately before
  Enter is the documented newline workaround and is not submitted literally;
  a backslash elsewhere remains ordinary input.
- The Editor clears its submitted state and the idle interactive path receives
  the same normalized prompt value.
- Slash commands, bash commands, extension commands, alternate editors,
  streaming, compaction, queued steer/follow-up behavior, rendering, history,
  and provider execution are outside this Requirement.

The generic single-line `Input` component is not the main coding-agent prompt
editor. Its tests remain useful TUI coverage but receive no Requirement ID from
this Capability. This corrects the provisional `packages/tui/test/input.test.ts`
anchor from 7.2a rather than expanding the product contract to unrelated
dialogs.

### Exact test mapping and missing coverage

The initial-message Vitest report supplies these three normalized names:

- `test/initial-message.test.ts buildInitialMessage > merges piped stdin with
the first CLI message into one prompt`;
- `test/initial-message.test.ts buildInitialMessage > uses stdin as the initial
prompt when no CLI message is present`;
- `test/initial-message.test.ts buildInitialMessage > combines stdin, file
text, and first CLI message in one prompt`.

All three map to initial-prompt composition. The third also verifies that a
second positional message remains after composition, but no current test proves
that multiple remaining messages are delivered later in order. The authoring
leaf must add one deterministic Vitest case around print-mode sequencing; it
must not call a live provider.

The focused `node:test` Editor report supplies six normalized names: the five
descendants of `Editor component Backslash+Enter newline workaround` and
`Editor component Undo clears undo stack on submit`. They map to interactive
Editor submission and its explicit backslash exception. Existing tests stop at
the Editor callback, so the authoring leaf must also add one deterministic
coding-agent test proving that an ordinary idle submission reaches the
interactive input path with the same normalized value. It may use a stub or
the repository faux-provider harness, but must not change runtime behavior.

Only these nine existing executable tests need the new Requirement IDs in this
bounded mapping. The two new deterministic tests must include their exact IDs
in their own normalized names. The later full TestIndex will measure these
eleven mapped tests against the complete executable-test population; this
clarification does not claim the final percentage.

### JUnit producer feasibility

Vitest 4.1.9 produced a three-test JUnit report with:

```text
npm exec --workspace packages/coding-agent -- vitest --run \
  test/initial-message.test.ts --reporter=junit --outputFile=<project-path>
```

Two generations imported from the same fixed report path produced identical
normalized names and `test_ref` values. SDD Yo emitted
`SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE` because this producer encoded the
`buildInitialMessage` suite in each testcase name rather than as retained
nested JUnit suites. The full names remain unambiguous, so the authoring leaf
must place every applicable Requirement ID directly in each normalized leaf
name and must retain the warning rather than infer hierarchy.

Node.js 22.22.3 produced the six-test focused Editor JUnit report with its
built-in reporter and a test-name pattern selecting the two mapped surfaces.
Two generations at the same path imported with identical normalized names and
`test_ref` values, retained the nested Editor suite hierarchy, and emitted no
diagnostic. The later project configuration used separate required JUnit
adapters named `vitest` and `node-test`, with distinct project-relative report
paths.

An initial direct Vitest invocation assumed a root-hoisted
`node_modules/vitest/dist/cli.js` and failed because this lockfile layout keeps
Vitest package-local. The workspace-native `npm exec` command above recovered
without a dependency or product change. Record this as provisional
project-specific adapter-invocation friction, not as permission to add
package-manager logic to SDD Yo.

All reports and import configurations used for clarification were temporary.
They are not TestExecutionEvidence and are not retained as dogfood artifacts.

### Approval and evidence inputs

The authoring leaf may configure these issuer names without creating evidence:

- `local-product-review` for an actual Spec Approver decision;
- `local-test-run` for later current full-suite TestExecutionEvidence;
- `local-qa` for an actual QA decision over the Capability.

The first approval subject must use `spec` mode and bind project
`SDD-B6FCE07B`, the committed base above, the later unchanged candidate commit,
and the exact semantic and structural delta fingerprints for only these three
Requirements. It must also present the trimming, backslash-newline, generic
Input, streaming, compaction, command, and provider exclusions. This
clarification, repository ownership, passing focused tests, or authorship is
not ApprovalEvidence.

### Baseline QA boundary

All three candidate Requirements are automated and require current mapped
passing tests at the later candidate head. Baseline QA independently reviews
the same Capability at that head and its resolved integration commit through
three deterministic scenarios:

1. piped standard input, processed file text, a first positional message, and
   at least one later message preserve the defined composition and order;
2. an ordinary interactive Editor prompt containing internal whitespace and a
   non-terminal backslash reaches a stubbed or faux-provider input path with
   the documented outer trimming;
3. empty input is ignored and a terminal backslash plus Enter follows the
   newline exception without being misreported as lost ordinary input.

The full safe non-e2e project suite, formatting boundary, SDD graph validation,
and imported two-adapter TestIndex must also be current before later evidence.
No live provider, credential, network request, paid request, release action, or
e2e test is required. This clarification creates no ApprovalEvidence,
TestExecutionEvidence, QAEvidence, ProposalPackage, or gate result.

## Observation boundary

Record the same measurements as the `yo` study, separated by test framework
where that distinction matters:

- elapsed time to initialize the SDD Project and define its first governed
  Capability;
- adapter effort and import diagnostics for Vitest and `node:test`;
- the count and percentage of existing executable tests whose normalized names
  need exact Requirement IDs;
- friction caused by Git history, the workspace layout, and the single-project
  boundary;
- useful, false-positive, and missed semantic review candidates;
- time and clarification needed for author, developer, and QA understanding of
  affected scope;
- diagnostics without a clear recovery action;
- output that could confuse the first governed Capability with whole-repository
  completeness.

Explicitly compare whether `OBS-YO-001`, `OBS-YO-004`, `OBS-YO-005`, and
`OBS-YO-006` recur. Do not fix a repeated issue during this study; Milestones
7.3 and 7.4 own cross-study synthesis and separately bounded fixes.

For each observation, retain the command or workflow step, expected and actual
result, stable diagnostic or artifact identity, measured effort, framework if
applicable, and provisional project-specific or recurring classification. Do
not store secrets, provider credentials, unrestricted environment output, or
fabricated human evidence.

## Baseline authoring and traceability result

Milestone 7.2d authored Capability `CAP-DE55E840` and three automated
Requirements:

- `REQ-654553C6` — compose the initial prompt from CLI sources;
- `REQ-EAFBC76A` — preserve later positional messages as later prompts;
- `REQ-3E851E79` — submit an ordinary interactive Editor prompt.

The resulting `pi` candidate commit is
`f0a93d155edf214cb020acdbe63319a08f597fa7`.

The `vitest` JUnit adapter reads `.artifacts/sdd/vitest.xml`; the `node-test`
adapter reads `.artifacts/sdd/node-test.xml`. The selected issuer names are
`local-product-review`, `local-test-run`, and `local-qa`. These configuration
entries create no evidence and grant no actor authority.

Traceability changed only the nine selected existing source-name anchors: all
three `buildInitialMessage` leaves received `REQ-654553C6`; the retained
`Backslash+Enter newline workaround` ancestor and the directly mapped submit
leaf received `REQ-3E851E79`. The two new deterministic Vitest leaves verify
ordered print-mode delivery for `REQ-EAFBC76A` and same-value ordinary idle
Editor delivery for `REQ-3E851E79`. No production source changed.

The focused Vitest run passed 10 tests across the three affected coding-agent
files, and the focused Node run passed the six selected Editor tests. The two
JUnit reports imported in an isolated candidate repository as 16 executable
TestIndex entries, 11 of them Requirement-mapped: three for `REQ-654553C6`, one
for `REQ-EAFBC76A`, and seven for `REQ-3E851E79`. Node retained the selected
suite hierarchy; Vitest produced stable full names but retained the expected
`SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE` warning, so every applicable Vitest
leaf carries its Requirement ID directly.

Candidate graph validation returned one Capability, three Requirements, no
Concepts, complete configured history at
`8ce561aacd3ea0c7a098b923dad07faec3a0db09`, and no diagnostics. Biome checked
808 files without changing any file, root TypeScript no-emit and browser smoke
checks passed, and the candidate diff contains no runtime, dependency,
lockfile, evidence, or gate change. Temporary model-data import stubs, JUnit
reports, the isolated candidate repository, and its TestIndex are not retained
as dogfood evidence.

### OBS-PI-002 — Generated coding-agent lock checks are stale at the clean baseline

The required root `npm run check` passed Biome, pinned-dependency, and relative
TypeScript-import checks, then stopped because the checked-in coding-agent
shrinkwrap is out of date. Running the later install-lock check independently
reported the same pre-existing drift for `packages/coding-agent/install-lock`;
TypeScript no-emit and browser smoke then passed independently. Milestone 7.2d
did not change dependencies or either lock surface, so it did not regenerate or
adopt unrelated generated output. Treat this as provisional project-specific
validation friction, not a passing full root check or a product defect in SDD
Yo.

## Proposal validation and approval subject result

Milestone 7.2e built the current local SDD Yo CLI and mechanically validated
the committed `pi` baseline candidate with:

```text
node /Users/dev.briginas/dev/sdd-yo/dist/bin/sdd.js proposal validate \
  --cwd /Users/dev.briginas/dev/pi \
  --mode spec \
  --base 8ce561aacd3ea0c7a098b923dad07faec3a0db09 \
  --candidate /Users/dev.briginas/dev/pi \
  --format json
```

The base is the committed initialized empty SDD Project. The candidate is the
clean `pi` worktree at `f0a93d155edf214cb020acdbe63319a08f597fa7`. Two
independent stdout runs each exited 0 and produced byte-identical 1,079-byte
JSON responses with status `ok`, no diagnostics, and this exact
ProposalPackage subject:

- project: `SDD-B6FCE07B`;
- mode: `spec`;
- base tree:
  `sha256:22ff30b4513d4da0b097391190f2cb5ba38f71377d7f08fe067fff9cd951f9a4`;
- candidate tree:
  `sha256:44be0ea579242e3e3398d0232f222afe0d30922b819f1756004cc40b3d3eec99`;
- semantic delta:
  `sha256:b3a4a7a47b4bae0fd14aad446add628b11d9e0bd7a4d01a74c76c3ddb6203791`;
- structural delta:
  `sha256:cbec60eefc33a8e5080b843fa815d2d0fc97823e527633b152cde61a017248a8`;
- affected scope:
  `sha256:fe13afd5d31e3f1759fa1d3c4f4c3cf675bfe690c3d410bbaf422a6d4b673317`.

The object delta adds exactly `CAP-DE55E840` and `REQ-3E851E79`,
`REQ-654553C6`, and `REQ-EAFBC76A`; there are no modified or deleted SDD
objects. The affected scope contains that Capability and the same three
Requirements. `code_targets` and deterministic `semantic_candidates` are
empty, as expected for this baseline package.

The successful validation used stdout only and modified neither `pi` nor its
Git state. Mechanical validity did not establish that the described existing
behavior was accepted; the separate human decision is recorded below.

## External specification approval result

Milestone 7.2f presented the exact 7.2e ProposalPackage subject to the actual
Spec Approver. `ivan-briginas` decided `approved` through the configured
`local-product-review` issuer because the three Requirements accurately describe
the accepted existing behavior in their agreed boundary. The decision is
recorded inside the `pi` project as
`evidence/approvals/7.2e-baseline-spec.json`.

After recording the evidence, two proposal validations from the SDD Yo root
again exited 0 and produced byte-identical 1,079-byte JSON responses. They
retained the exact `SDD-B6FCE07B` project, `spec` mode, base commit
`8ce561aacd3ea0c7a098b923dad07faec3a0db09`, and semantic and structural delta
fingerprints recorded in 7.2e. Strict project-scoped import and approval
assessment returned `current` with no issues for the issuer provenance and the
exact project, mode, base commit, and delta subjects.

This decision approves only the baseline specification of existing behavior. It
is not TestExecutionEvidence, QAEvidence, a Verification or Merge Gate result,
permission to merge, or approval of a later `pi` milestone.

## Current test execution evidence result

Milestone 7.2g generated fresh safe JUnit reports at the unchanged candidate
head `7125d8b6293bdec2bd8d1c2b232cc2730e93d8ec`. Vitest passed 10 selected
coding-agent tests and `node:test` passed six selected Editor tests. The latter
retained hierarchy; Vitest retained the known
`SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE` warning without guessed suites.

The configured `vitest` and `node-test` adapters imported one 16-entry
TestIndex at `evidence/test-indexes/7.2g-current.json`. It maps 11 executable
tests: three to `REQ-654553C6`, one to `REQ-EAFBC76A`, and seven to
`REQ-3E851E79`. Project-scoped TestExecutionEvidence from `local-test-run` at
`evidence/test-executions/7.2g-current.json` supplies exactly one `passed`
result for each TestIndex reference. Its validated subject is project
`SDD-B6FCE07B`, that head, configuration fingerprint
`sha256:c469e8113d2a59258baedc3981aa68a707da49385938b594077d512c1da58673`, and
TestIndex fingerprint
`sha256:186a6447be97f6dd9c77c28f31403c08c3958c0c145aa2b35ea4552036f28d28`.

The test run temporarily materialized ignored generated model-data files solely
to satisfy static imports in the selected non-provider Vitest test. They were
removed before recording evidence and are not part of the candidate, evidence,
or Git state. No QA decision or Verification or Merge gate was run.

## Baseline QA evidence result

The actual local QA tester `ivan-briginas` reviewed the three deterministic
baseline scenarios and decided `passed` for `CAP-DE55E840`. Project-scoped
QAEvidence from the configured `local-qa` issuer is recorded as
`evidence/qa/7.2h-baseline.json`, binding candidate head
`7125d8b6293bdec2bd8d1c2b232cc2730e93d8ec`, resolved integration commit
`4381d809b2d61ea2cfdbf8f5c7f9327b2bf9101a`, and affected-scope fingerprint
`sha256:fe13afd5d31e3f1759fa1d3c4f4c3cf675bfe690c3d410bbaf422a6d4b673317`.

The reviewer exercised the defined ordered CLI-source composition, ordinary
Editor prompt with internal whitespace and a non-terminal backslash, and empty
input/backslash-newline scenarios without a live provider, credential, network
request, paid request, release action, or e2e test. The focused reproduction
passed the initial-message and print-mode files; the interactive-mode file could
not load because ignored generated provider model data is absent at the clean
baseline. The earlier current 7.2g TestExecutionEvidence remains the recorded
passing execution evidence for that selected test surface.

This QA decision is independent of automated test execution. It is not a
Verification or Merge Gate result, permission to merge, or approval of later
`pi` work.

## Cross-study handoff

Milestone 7.2 is complete, and its results are classified in the completed
cross-study synthesis at [`../README.md`](../README.md). The existing-monorepo
and project-isolation study remains deferred and is not implied by this
single-project workspace.
