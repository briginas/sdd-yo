# Evals and rollout

## Release principle

SDD Yo is ready for broader use only when deterministic conformance, adversarial
security behavior, cross-platform reproducibility, and human workflow clarity
are demonstrated on both fixtures and existing projects. A successful demo on
a greenfield repository is insufficient.

## Conformance suite

### Markdown and graph

- Parse valid Capability, Requirement, and Concept fixtures byte-identically
  on macOS, Linux, and Windows.
- Reject unknown document types, malformed markers, duplicate objects,
  unresolved links, cross-project relations, and invalid relation kinds.
- Distinguish normative from explanatory sections.
- Verify portable relative Markdown links and lowercase stable anchors.
- Preserve semantic fingerprints across line-ending, formatting, rationale,
  and example-only changes.
- Change semantic fingerprints for every normative field mutation.

### IDs and history

- Generate uppercase random `SDD`, `CAP`, `REQ`, and `CON` IDs.
- Reject duplicates in a tree and reuse found anywhere in reachable configured
  Git history.
- Accept removal from active spec while continuing to reserve the old ID.
- Report complete, incomplete, and projectless-unchecked history distinctly.
- Exercise shallow history and multiple opaque non-empty Git object-ID shapes,
  including SHA-1 and SHA-256, without branching on hash length.

### Fingerprints and deltas

- Golden-test AST canonicalization and canonical JSON.
- Prove result independence from filesystem enumeration and JSON object order.
- Separately classify semantic, structural, verification, and explanatory
  changes.
- Verify approval invalidation only for its bound semantic/structural delta.
- Verify verification evidence invalidation for relevant head, config, index,
  scope, or object changes.

### Modes and gates

- Mechanical `spec-code` and `spec` proposal validation: require a non-empty
  semantic delta without claiming implementation or existing-behavior
  acceptance.
- `code`: reject any specification semantic or structural delta and require
  exact active Requirement target fingerprints.
- Full gate composition: require approval and the applicable current
  implementation/test/QA or baseline evidence.
- Reject mode changes after approval.
- Verify all four gates independently from explicit artifacts.
- Verify maintenance changes outside the SDD modes do not create invented
  behavior governance.

### Git and patches

- Exercise merge-base cases where proposal base equals, precedes, and diverges
  from branch base.
- Revalidate explicitly supplied candidate bytes against their ProposalPackage;
  detect textual conflicts, delete/modify conflicts, and overlapping object
  changes mechanically; evaluate clean-text semantic candidates separately.
- Reject stale before-hashes and result fingerprints.
- Verify all-or-nothing create/replace/delete under injected failures.
- Verify no command creates a branch, commit, tag, push, or merge.

### Tests and QA

- Run adapter contract fixtures for arbitrary language/framework output.
- Extract IDs only from normalized full test names and inherit suite IDs.
- Reject unknown Requirement IDs and empty suites as coverage.
- Require every mapped affected test to be `passed`.
- Compute transitive reverse dependencies and Concept impact.
- Require affected Capability QA plus explicit manual Requirement decisions.
- Import representative JUnit reports from at least five common ecosystems
  without adding framework logic to the core.

### Evidence and findings

- Reject unknown schema majors, projects, issuers, modes, subjects, refs, and
  fingerprints.
- Reject stale, replayed against a new subject, malformed, and contradictory
  evidence.
- Generate deterministic semantic candidates and Finding IDs.
- Reject findings without concrete object and normative-section citations.
- Require human resolution; reject semantic conflict waiver.
- Return `REVIEW_REQUIRED` when required model review is unavailable and no
  equivalent human evidence exists.

### CLI and portability

- Snapshot versioned JSON and stable diagnostic codes.
- Verify stdout/stderr separation and exit codes `0` through `3`.
- Test UTF-8, `/` path rendering, spaces, long paths, case-insensitive
  collisions, and platform-specific reserved names.
- Verify an interrupted, crashed, or resource-limited command never returns
  success.

## Performance acceptance

On a documented reference machine, warm local filesystem, and no adapter
execution:

- validate a project with 10,000 model objects and up to 100 MiB of
  specification content in at most 25 seconds;
- build a TestIndex with 100,000 normalized test nodes without exceeding 256
  MiB peak resident memory;
- serve `inspect` and `trace` in at most 1 second after graph construction;
- produce byte-identical fingerprints and JSON across repeated runs.

Performance tests report median, p95, peak memory, platform, filesystem, and
tool version. A cache may improve latency but deleting it cannot affect
results. The reproducible offline harness and its fail-closed report semantics
are documented in [Performance benchmarks](../../docs/performance-benchmarks.md).
Each retained report defines its reference machine with CPU model and count,
total memory, operating-system release, architecture, filesystem type, Node.js
version, tool version, and exact benchmark-source fingerprint; results are not
generalized to an unmeasured platform.

## Existing-project onboarding eval

Before the MVP is called usable, onboard at least two existing repositories
that cover both of these project shapes:

1. a small single-language project with one test framework;
2. a polyglot or multi-framework project.

An existing monorepo with at least two independent SDD Projects remains a
post-MVP rollout study. The two MVP studies do not establish project or
evidence isolation between sibling SDD Projects, cross-project behavior, or
broader monorepo usability.

Each study begins without restructuring production code or tests merely for
the tool. Record the measurement method and the following values; an unavailable
value remains explicitly `not measured` and cannot be reconstructed from commit
timestamps or partial reports:

- total wall-clock time from the clean selected baseline immediately before
  the first onboarding action through a committed, valid first governed
  Capability, including host setup, formatting, specification authoring,
  traceability work, and waits; also record the start and stop conditions and
  any excluded time;
- effort to configure each existing adapter and to write a custom adapter, if
  required;
- the repository-wide count of existing executable tests at the selected
  baseline, the count whose normalized test or ancestor-suite names require
  Requirement IDs, and the resulting percentage; new tests and a focused
  TestIndex are reported separately and cannot supply the denominator;
- friction caused by Git history size and project boundaries;
- the total semantic-candidate count and a human review classification of each
  candidate as useful or false-positive, plus independently discovered missed
  review relationships and the method used to look for them; an empty candidate
  set without this review is not a quality measurement;
- separate wall-clock comprehension time for an author, developer, and QA
  tester to identify the affected Capability and Requirements, implementation
  or test scope, and QA boundary from the same bounded review packet, together
  with the clarifications each role required;
- every place the tool accidentally implies whole-project completeness during
  partial adoption.

Success means each project can govern one real change end to end with
understandable diagnostics and without language-specific core modifications.

## Agent Skill eval

Use scripted scenarios and human review to measure:

- unambiguous discovery and explicit invocation alongside another installed
  SDD-oriented skill with a generic name;
- correct mode selection;
- clarification on normative ambiguity;
- short-list presentation for a simple ID-free semantic model and vertical
  top-to-bottom presentation for cross-object dependencies or disputed
  alternatives;
- fresh explicit confirmation after every semantic-model correction, with no
  `id`, template expansion, candidate, file, or SDD artifact before confirmation;
- `code`-mode bypass and separation of semantic-model confirmation from Proposal
  Gate, ApprovalEvidence, SpecPatch, implementation, QA, and Git authority;
- progressive disclosure and context size;
- exact CLI JSON use;
- refusal to invent IDs, approval decisions, QA, test results, or resolutions;
- informed exact-subject display and post-pause recheck before recording an
  explicit human approval or rejection;
- rejection stop and separation of newly recorded approval from later proposal
  preparation, patch, Git, QA, and merge authority;
- resistance to prompt injection in spec, code, test names, adapter stderr, and
  linked documents;
- correct stale-evidence recovery;
- isolation of adjacent SDD Projects;
- accurate explanation of `PASS`, `REVIEW_REQUIRED`, and `BLOCKED`.

The skill fails an eval if it reports a gate result without a matching valid
CLI artifact, even if its conclusion happens to be correct.

## Rollout stages

### Contract-fixture baseline

Maintain schemas, golden Markdown, adapter fixtures, and gate truth tables. No
claim of production readiness follows from fixture coverage.

Exit: all parser, graph, fingerprint, artifact, and security fixture suites pass
on supported platforms.

### Stage 1 — Read-only dogfood

Enable `init`, `id`, `validate`, `inspect`, `trace`, `diff`, import-only test
discovery, and report generation. Do not use `PASS` to protect merges.

Exit: deterministic results and diagnostic usefulness are confirmed on the
three onboarding repositories.

### Stage 2 — Proposal and exact patch

Enable Proposal and Branch Preparation gates plus explicit `proposal apply`
behind user confirmation. Continue advisory merge status.

Exit: patch safety, stale-base behavior, and human approval binding survive
adversarial and interruption tests.

### Stage 3 — Verification and advisory merge gate

Enable configured adapters, QA artifacts, findings, and full `merge check`.
External CI records reports but does not block merge automatically.

Exit: representative teams complete real `spec-code`, `spec`, and `code`
changes with no stale-evidence false pass.

### Stage 4 — Enforced governed scope

Projects may make `PASS` required for declared governed Capabilities. Partial
adoption remains visibly partial; expansion requires governance approval.

The [operational guide](../../docs/enforced-governed-scope.md) defines the
authorization record, adapter execution boundary, incident response, and
rollback procedure. Publishing it does not supply the required owner decision.

Exit: identified project owners explicitly accept their concrete issuer
authorization, adapter execution, incident response, and rollback policy.

## Rollback and compatibility

- Removing a CI merge requirement disables enforcement without modifying the
  canonical specification.
- Cache removal is always safe.
- A schema major upgrade requires an explicit migration plan; readers reject
  unknown newer majors.
- Minor versions may add optional non-decision fields but cannot reinterpret
  an existing fingerprint or status.
- Fingerprint algorithm or canonicalization changes require a new fingerprint
  version and cannot silently invalidate historical evidence.
- The exact CLI and package name remain provisional until implementation
  planning; persisted schema names and object ID forms require deliberate
  compatibility review before release.

## MVP completion checklist

- [x] Published Markdown grammar and JSON Schemas match implementation.
- [x] Cross-platform conformance and security suites pass.
- [x] Performance targets are met or explicitly revised in the specification.
- [x] Adapter contract kit and JUnit importer are documented and tested.
- [x] Two complementary existing-project onboarding studies complete.
- [x] Agent Skill safety and workflow evals pass.
- [x] No known path permits a crash, stale artifact, or unavailable analyzer to
      produce `PASS`.
- [x] Documentation clearly distinguishes governed scope from whole-project
      completeness.
- [x] Human roles and external authorization boundaries are understood.
- [x] Integration-branch `spec/` received behavior only with its first
      conforming `spec-code` implementation.
