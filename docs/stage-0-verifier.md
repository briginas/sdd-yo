# Stage 0 bootstrap verifier

The Stage 0 verifier checks the repository-maintenance contracts and fixture
corpus created during Milestone 0. It is not the SDD Yo product CLI, does not
produce an SDD gate result, and does not claim Requirement test coverage.

## Command

Run the verifier with Node.js 22 or newer from any directory inside or outside
the repository:

```text
node scripts/verify-stage-0.mjs
```

The command has no package or third-party dependency. A successful run writes
one line to standard output and exits with status `0`:

```text
Stage 0 verification passed: <N> checks
```

The count is evidence about the current fixture surface, not a stable API. A
failed run writes sorted diagnostics and a summary to standard error, then
exits with status `1`:

```text
fixtures/v1/gates/modes/cases.json [S0_DUPLICATE_FIXTURE_NAME] duplicate case_id "spec-code-valid" at $.cases
Stage 0 verification failed: 1 error
```

Diagnostics are ordered by repository-relative path, diagnostic code, and
message. An incomplete or crashed run is not a pass.

## Checks

The verifier performs these checks:

1. It requires Node.js 22 or newer and discovers the repository relative to
   the verifier file rather than the caller's working directory.
2. It parses every contract and fixture JSON file except artifact fixtures
   explicitly declared with `parse_valid: false`. A fixture declared malformed
   must remain malformed.
3. It verifies the version, status, and collection shape of every Stage 0
   fixture manifest and matrix.
4. It checks `CAP-*`, `CON-*`, `REQ-*`, and `SDD-*` tokens against their exact
   uppercase eight-hex-digit formats, rejects duplicate proposal model
   definitions, and requires every inventory/manifest Requirement reference to
   resolve to a proposal Requirement.
5. It verifies that every proposal Requirement has its `sdd` metadata,
   Statement, and Acceptance criteria sections.
6. It rejects duplicate case, pair, golden, variant, contract, fixture-family,
   artifact-fixture, and truth-table coverage names in their applicable scope.
7. It resolves manifest, schema, case, variant, root, entrypoint, and authority
   targets without allowing a path to escape the repository.
8. It checks local links and heading anchors in the proposal package,
   implementation plan, and verifier documentation. Example links inside
   fenced Markdown blocks remain inert examples.
9. It resolves local and cross-file JSON Schema `$ref` targets and JSON Pointer
   fragments. Stage 0 does not evaluate complete instances against Draft
   2020-12 schemas; that dependency-backed validation belongs to Milestone 1.
10. It verifies that manifest contract and fixture-family identifiers exist in
   `contracts/v1/inventory.json`.
11. It confirms that every artifact JSON fixture and every JSONL fixture is
    declared by a manifest. Declared valid JSONL streams must be UTF-8 and
    contain one parseable JSON value per non-empty line; declared negative
    streams remain negative contract data.
12. It checks inventory-required cases directly or through explicit
    `inventory_required_case_coverage` maps. Split gate tables are aggregated
    by fixture-family identifier, and every coverage target must name a real
    case.
13. It recalculates every declared SHA-256 fingerprint from its exact
    `canonical_json_utf8` bytes.
14. It rejects trailing whitespace and unresolved `TODO` markers in the
    checked contract, fixture, and documentation surface. Prompt-injection
    payload fixtures are excluded from the `TODO` rule because their text is
    intentionally untrusted data.

## Diagnostics

| Code | Failure |
| --- | --- |
| `S0_NODE_VERSION` | The running Node.js major version is older than 22. |
| `S0_MANIFEST_PARSE` | A fixture manifest or matrix is not valid JSON. |
| `S0_MANIFEST_SHAPE` | A manifest has the wrong version, status, or primary collection. |
| `S0_JSON_PARSE` | A contract or non-negative fixture JSON file is malformed. |
| `S0_EXPECTED_MALFORMED_JSON` | A fixture declared with `parse_valid: false` parses successfully. |
| `S0_JSONL_UTF8` | A declared valid JSONL stream is not valid UTF-8. |
| `S0_JSONL_PARSE` | A non-empty line in a declared valid JSONL stream is not valid JSON. |
| `S0_ID_FORMAT` | A model or project identifier has an invalid lexical form. |
| `S0_DUPLICATE_MODEL_ID` | A Capability, Requirement, or Concept is defined more than once. |
| `S0_UNKNOWN_REQUIREMENT` | An inventory or manifest Requirement has no proposal definition. |
| `S0_REQUIREMENT_SHAPE` | A proposal Requirement is missing metadata, Statement, or Acceptance criteria. |
| `S0_DUPLICATE_FIXTURE_NAME` | A fixture name is repeated within its applicable scope. |
| `S0_DUPLICATE_CONTRACT` | `inventory.json` repeats a contract identifier. |
| `S0_DUPLICATE_FIXTURE_FAMILY` | `inventory.json` repeats a fixture-family identifier. |
| `S0_DUPLICATE_COVERAGE_KEY` | Split truth tables define the same inventory coverage key twice. |
| `S0_PATH_ESCAPE` | A repository reference resolves outside the repository root. |
| `S0_MISSING_TARGET` | A manifest, fixture, entrypoint, or authority target is absent. |
| `S0_MARKDOWN_LINK_TARGET` | A checked prose Markdown link has no local target. |
| `S0_MISSING_ANCHOR` | A checked Markdown fragment has no matching heading or explicit anchor. |
| `S0_SCHEMA_REF_TARGET` | A JSON Schema `$ref` file is absent. |
| `S0_SCHEMA_REF_POINTER` | A JSON Schema `$ref` fragment does not resolve. |
| `S0_UNKNOWN_CONTRACT` | A manifest names a contract absent from the inventory. |
| `S0_UNKNOWN_FIXTURE_FAMILY` | A manifest names a fixture family absent from the inventory. |
| `S0_UNDECLARED_FIXTURE` | An artifact JSON or JSONL file is absent from its manifest surface. |
| `S0_TRUTH_TABLE_INCOMPLETE` | An inventory-required case has no direct or mapped coverage. |
| `S0_COVERAGE_TARGET` | A truth-table coverage entry names a nonexistent case. |
| `S0_FINGERPRINT_MISMATCH` | Declared canonical bytes do not produce the expected SHA-256 value. |
| `S0_TRAILING_WHITESPACE` | A checked line ends in spaces or tabs. |
| `S0_UNRESOLVED_TODO` | Checked repository-maintenance content contains a `TODO` marker. |
| `S0_INTERNAL_ERROR` | The verifier itself crashed or encountered an unexpected I/O failure. |

## Platform evidence

Milestone 0.8 is verified locally on macOS with Node.js 22. Linux and Windows
execution is deferred until those environments are available. Their
declarative security and portability fixtures remain in the corpus and are
checked for manifest completeness, but this macOS run is not evidence that
host-specific behavior executed successfully on either platform.
