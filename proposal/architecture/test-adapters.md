# Test adapters

## Purpose

Test adapters make traceability language- and framework-independent. The core
understands normalized suites, executable tests, and execution results; it does
not parse Jest, pytest, JUnit source annotations, Go tests, or another runner's
source format.

## Adapter types

The MVP supports:

1. a built-in JUnit-compatible XML importer;
2. versioned JSONL read from a file;
3. a configured command that emits versioned JSONL.

Discovery and execution are separate operations. A project may use a discovery
adapter, execution evidence imported from CI, or a command that supports both.

## Normalized discovery protocol

An adapter emits UTF-8 JSON Lines. The first record is a header:

```jsonl
{"schema_version":"1.0","record_type":"test_stream","operation":"discover","adapter_id":"unit"}
```

It is followed by suite and test records:

```jsonl
{"schema_version":"1.0","record_type":"suite","local_id":"suite-1","parent_id":null,"name":"Export REQ-7F3A2C91"}
{"schema_version":"1.0","record_type":"test","local_id":"test-1","parent_id":"suite-1","name":"writes UTF-8","source":{"path":"test/export.test.ts","line":18}}
```

Rules:

- `local_id` is unique within the adapter stream and stable for one indexed
  head;
- `parent_id` must name a previously or subsequently declared suite;
- the hierarchy must be acyclic;
- suites are not executable and never create coverage by themselves;
- every test is executable;
- names are preserved as emitted except for line-ending normalization;
- source locations are optional project-relative data;
- an adapter must not emit Requirement mappings.

The core constructs `full_name` by joining ancestor suite names and the test
name with one ASCII space. It scans the resulting string for standalone
case-sensitive IDs matching `REQ-[0-9A-F]{8}`. IDs found in ancestors are
therefore inherited. Repeated IDs are deduplicated and sorted.

An ID is standalone when the characters immediately before and after it, if
present, are not ASCII letters, digits, `_`, or `-`. This avoids partial
matches such as `XREQ-7F3A2C91` and `REQ-7F3A2C91-OLD`.

## Normalized execution protocol

Execution starts with:

```jsonl
{"schema_version":"1.0","record_type":"test_stream","operation":"execute","adapter_id":"unit","test_index_fingerprint":"sha256:..."}
```

Result records follow:

```jsonl
{"schema_version":"1.0","record_type":"result","local_id":"test-1","status":"passed","duration_ms":31}
```

Allowed statuses and their merge meaning are defined in
[Workflow artifacts](artifact-schemas.md). Missing, duplicate, or unknown test
results block the affected Requirement. Additional results may be retained as
diagnostics but cannot satisfy the indexed subject.

## Command adapter

Configuration supplies argv arrays, never shell source:

```yaml
tests:
  adapters:
    - id: unit
      type: command
      protocol: jsonl-v1
      discover:
        argv: ["node", "tools/sdd-tests.mjs", "discover"]
      execute:
        argv: ["node", "tools/sdd-tests.mjs", "execute"]
      timeout_ms: 120000
      max_output_bytes: 16777216
```

Invocation contract:

- working directory is the SDD Project root;
- the command receives `SDD_OPERATION`, `SDD_PROJECT_ID`, and
  `SDD_PROJECT_ROOT` environment values;
- `execute` additionally receives the selected test refs via a temporary
  JSON file whose path is passed as `SDD_TEST_SELECTION_FILE`;
- the parent chooses the environment allowlist and execution sandbox;
- stdin is closed unless a future protocol explicitly assigns it;
- stdout is reserved for JSONL;
- stderr is diagnostic only and is bounded;
- non-zero exit, timeout, signal, malformed UTF-8, malformed JSONL, or overflow
  is a blocking adapter failure.

The CLI does not search `PATH` differently from the host process, install
dependencies, start a shell, or retry a failed command silently.

## JUnit-compatible importer

The importer accepts XML files or globs resolved within configured project
scope. It maps:

- `<testsuite>` nesting and names to normalized suites;
- `<testcase>` to executable tests;
- `failure` or `error` to `failed`;
- `skipped` to `skipped`;
- an otherwise completed case to `passed`;
- `file`, `line`, and `time` when present.

JUnit producers vary. If nesting or a stable local ID is absent, the importer
derives a deterministic ID from report path, suite path, testcase classname,
name, and occurrence index. It reports lost or ambiguous hierarchy and never
reconstructs it from framework-specific guesses.

For discovery-only reports that also contain execution status, the importer
may produce both a `TestIndex` and `TestExecutionEvidence`, bound to the same
report fingerprint and declared Git head.

## Multiple adapters

Adapter identity matches `[a-z][a-z0-9-]{0,31}`. A normalized test reference is
`<adapter-id>:<local-id>`. Local IDs are opaque UTF-8 strings subject to size
limits and cannot escape the adapter namespace.

The final project TestIndex is the deterministic sorted union of required
adapter indexes. Every configured required adapter must succeed. Optional
adapters may be reported without contributing required coverage only when the
configuration says so explicitly.

## Trust and invalidation

An adapter fingerprint includes:

- adapter ID, protocol, required/optional policy;
- normalized command argv or importer configuration;
- timeout and output limits;
- relevant environment allowlist names;
- adapter executable file hash when the path resolves inside project scope;
- declared adapter protocol version.

Changing any of these invalidates dependent indexes and execution evidence and
creates a trust-review diagnostic. Adapter output is untrusted: paths,
hierarchy, IDs, sizes, and schema are validated before graph use.

## Contract test kit

The published adapter kit shall verify:

- valid discovery and execution streams;
- suite inheritance and multiple Requirement IDs;
- forward parent references and cycle rejection;
- duplicate and unknown IDs;
- malformed, truncated, oversized, and non-UTF-8 output;
- timeout and non-zero exit;
- deterministic ordering independent of record order;
- Windows and POSIX project path normalization;
- stale index and execution fingerprint rejection.

The kit uses fixtures only and does not assume a programming language.
