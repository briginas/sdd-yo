---
sdd:
  type: capability
  id: CAP-15DBC157
---

# Test traceability and QA evidence

## Purpose <!-- sdd:purpose -->

Make Requirement coverage legible across languages and test frameworks while
retaining human QA as the final verifier of product behavior.

<a id="req-12e19d70"></a>

## REQ-12E19D70 — Discover tests through language-independent adapters

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-90AFB19E — Test Adapter](../concepts/test-adapter.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)

### Statement <!-- sdd:statement -->

The CLI shall build test traceability from normalized Test Adapter output
rather than embedding language- or framework-specific test parsing in the
core.

### Acceptance criteria <!-- sdd:acceptance -->

- Adapter output distinguishes suites and executable tests.
- Output includes adapter-local test IDs, names, hierarchy, and source
  locations when available.
- Requirement IDs are extracted only from normalized full test names.
- Comments and unrelated source strings do not create coverage.

<a id="req-f7cee6d0"></a>

## REQ-F7CEE6D0 — Inherit Requirement IDs from test suites

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-90AFB19E — Test Adapter](../concepts/test-adapter.md)

### Statement <!-- sdd:statement -->

An executable test shall inherit every Requirement ID present in the full name
of its ancestor suites.

### Acceptance criteria <!-- sdd:acceptance -->

- A suite with no executable descendants creates no coverage.
- A test may inherit multiple Requirement IDs.
- A test may also declare Requirement IDs in its own name.

<a id="req-6d8dddf7"></a>

## REQ-6D8DDDF7 — Import JUnit-compatible reports

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-90AFB19E — Test Adapter](../concepts/test-adapter.md)

### Statement <!-- sdd:statement -->

The MVP shall include a built-in importer for JUnit-compatible XML reports.

### Acceptance criteria <!-- sdd:acceptance -->

- Suite and test names are preserved in normalized hierarchy where the report
  provides them.
- Pass, fail, and skip states are imported.
- Source file and line are retained when present.
- Runner-specific loss of hierarchy is reported rather than guessed.

<a id="req-72ba737c"></a>

## REQ-72BA737C — Support multiple test adapters per project

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)
- refers-to: [CON-90AFB19E — Test Adapter](../concepts/test-adapter.md)

### Statement <!-- sdd:statement -->

One SDD Project shall support multiple independently namespaced Test Adapters.

### Acceptance criteria <!-- sdd:acceptance -->

- A test reference is namespaced by adapter ID.
- Failure of one required adapter is not hidden by success of another.
- Duplicate adapter IDs block configuration validation.

<a id="req-e451458e"></a>

## REQ-E451458E — Require traceability for automated Requirements

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- depends-on: [REQ-12E19D70 — Discover tests through language-independent adapters](test-traceability-and-qa.md#req-12e19d70)

### Statement <!-- sdd:statement -->

Every affected active Requirement with `verification: automated` shall map to
at least one executable test discovered by a configured adapter.

### Acceptance criteria <!-- sdd:acceptance -->

- Unknown Requirement IDs in test names block validation.
- Removed Requirement IDs must disappear from TestIndex.
- A Requirement with no discovered executable test blocks Verification Gate.

<a id="req-5a832396"></a>

## REQ-5A832396 — Require all mapped affected tests to pass

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)
- depends-on: [REQ-E451458E — Require traceability for automated Requirements](test-traceability-and-qa.md#req-e451458e)

### Statement <!-- sdd:statement -->

Every discovered executable test mapped to an affected automated Requirement
shall have current successful TestExecutionEvidence.

### Acceptance criteria <!-- sdd:acceptance -->

- `failed`, `skipped`, `todo`, `disabled`, `xfailed`, and missing results do
  not satisfy the gate.
- One failing test blocks every Requirement to which it maps.
- Results outside the referenced TestIndex are rejected.

<a id="req-cde94d0b"></a>

## REQ-CDE94D0B — Verify manual Requirements explicitly

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

Every affected Requirement with `verification: manual` shall be explicitly
listed as passed in current QA evidence.

### Acceptance criteria <!-- sdd:acceptance -->

- General Capability approval does not replace per-ID manual confirmation.
- Missing manual confirmation returns `REVIEW_REQUIRED`.
- A failed manual result blocks the Change.

<a id="req-89afb91e"></a>

## REQ-89AFB91E — Compute affected Requirements transitively

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

The Verification Gate shall compute affected active Requirements from direct
changes, `code` targets, semantic Concept impact, and transitive reverse
`depends-on` relations.

### Acceptance criteria <!-- sdd:acceptance -->

- Added and semantically modified Requirements enter the initial set.
- Requirements referring to a semantically changed Concept enter the initial
  set.
- Every active dependent of an affected Requirement is added transitively.
- Deleted Requirements are excluded from test execution but their former
  Capability enters QA scope.

<a id="req-c11acc55"></a>

## REQ-C11ACC55 — Require QA for affected Capabilities

```sdd
kind: invariant
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-2C550D5B — Capability](../concepts/capability.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)
- depends-on: [REQ-89AFB91E — Compute affected Requirements transitively](test-traceability-and-qa.md#req-89afb91e)

### Statement <!-- sdd:statement -->

Current QA evidence shall cover every Capability containing an added, changed,
deleted, or transitively affected Requirement.

### Acceptance criteria <!-- sdd:acceptance -->

- QA scope may be split across multiple evidence records.
- Extra Capability coverage is permitted.
- Contradictory evidence is not automatically collapsed into a pass.
- QA does not replace automated test evidence.
