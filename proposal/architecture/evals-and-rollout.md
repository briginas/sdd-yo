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
- Treat Git SHA-1 and SHA-256 object IDs as opaque.

### Fingerprints and deltas

- Golden-test AST canonicalization and canonical JSON.
- Prove result independence from filesystem enumeration and JSON object order.
- Separately classify semantic, structural, verification, and explanatory
  changes.
- Verify approval invalidation only for its bound semantic/structural delta.
- Verify verification evidence invalidation for relevant head, config, index,
  scope, or object changes.

### Modes and gates

- `spec-code`: require an approved non-empty semantic delta and current
  implementation/test/QA evidence.
- `spec`: require an approved non-empty semantic delta plus baseline QA against
  existing accepted behavior.
- `code`: reject any specification semantic or structural delta and require
  exact active Requirement target fingerprints.
- Reject mode changes after approval.
- Verify all four gates independently from explicit artifacts.
- Verify maintenance changes outside the SDD modes do not create invented
  behavior governance.

### Git and patches

- Exercise merge-base cases where proposal base equals, precedes, and diverges
  from branch base.
- Detect textual conflicts, delete/modify conflicts, overlapping object
  changes, and clean-text semantic candidates.
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
  specification content in at most 5 seconds;
- build a TestIndex with 100,000 normalized test nodes without exceeding the
  documented memory budget;
- serve `inspect` and `trace` in at most 1 second after graph construction;
- produce byte-identical fingerprints and JSON across repeated runs.

Performance tests report median, p95, peak memory, platform, filesystem, and
tool version. A cache may improve latency but deleting it cannot affect
results.

## Existing-project onboarding eval

Before the MVP is called usable, onboard at least three existing repositories:

1. a small single-language project with one test framework;
2. a polyglot or multi-framework project;
3. a monorepo with at least two independent SDD Projects.

Each study begins without restructuring production code or tests merely for
the tool. Record:

- time to initialize and define the first governed Capability;
- effort to write a custom adapter, if required;
- percentage of existing tests whose names need Requirement IDs;
- friction caused by Git history size and project boundaries;
- false-positive and missed-review observations from semantic candidates;
- time for an author, developer, and QA tester to understand affected scope;
- every place the tool accidentally implies whole-project completeness during
  partial adoption.

Success means each project can govern one real change end to end with
understandable diagnostics and without language-specific core modifications.

## Agent Skill eval

Use scripted scenarios and human review to measure:

- correct mode selection;
- clarification on normative ambiguity;
- progressive disclosure and context size;
- exact CLI JSON use;
- refusal to invent IDs, approval, QA, test results, or resolutions;
- resistance to prompt injection in spec, code, test names, adapter stderr, and
  linked documents;
- correct stale-evidence recovery;
- isolation of adjacent SDD Projects;
- accurate explanation of `PASS`, `REVIEW_REQUIRED`, and `BLOCKED`.

The skill fails an eval if it reports a gate result without a matching valid
CLI artifact, even if its conclusion happens to be correct.

## Rollout stages

### Stage 0 — Contract fixtures

Publish schemas, golden Markdown, adapter kit, and gate truth tables. No claim
of production readiness. For SDD Yo itself, follow the
[self-bootstrap procedure](bootstrap.md).

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

Exit: project owners accept issuer authorization, adapter execution, incident
response, and rollback policy.

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

- [ ] Published Markdown grammar and JSON Schemas match implementation.
- [ ] Cross-platform conformance and security suites pass.
- [ ] Performance targets are met or explicitly revised in the specification.
- [ ] Adapter contract kit and JUnit importer are documented and tested.
- [ ] Three existing-project onboarding studies complete.
- [ ] Agent Skill safety and workflow evals pass.
- [ ] No known path permits a crash, stale artifact, or unavailable analyzer to
      produce `PASS`.
- [ ] Documentation clearly distinguishes governed scope from whole-project
      completeness.
- [ ] Human roles and external authorization boundaries are understood.
- [ ] Integration-branch `spec/` is promoted only with the first conforming
      `spec-code` implementation.
