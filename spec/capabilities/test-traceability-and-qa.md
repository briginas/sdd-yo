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
