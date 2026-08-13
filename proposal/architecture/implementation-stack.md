# Implementation stack

## Decision

The version 1 reference implementation uses:

```text
Language          TypeScript
Runtime           Node.js 22 or newer
Module system     ESM
Package manager   npm
Executable        sdd
Distribution      npm package first
Architecture      modular monolith with a provider-neutral core library
```

Exact compiler, test runner, formatter, schema, Markdown, YAML, and XML library
versions are locked in the package manifest and lockfile. A dependency is not
part of the product contract unless a Requirement explicitly makes it
observable.

The source `package.json` is the primary current package identity. CLI identity,
release automation, package checks, and current-product tests derive its name
and version from that manifest. The root lockfile and packaged Skill payload
manifest remain explicit materialized copies because their consumers cannot
derive the source value at runtime; package verification checks both copies
against the source manifest. Protocol and schema versions remain separate
compatibility dimensions.

## Why this preserves language independence

Language independence belongs at the project boundary:

- the core parses SDD Markdown and versioned artifacts;
- tests enter through JUnit-compatible XML or the generic JSONL adapter
  protocol;
- adapter commands are argv arrays and may be implemented in any language;
- no JavaScript or TypeScript source parser is built into the core;
- project-relative paths and Git object IDs use platform-neutral normalized
  forms.

The implementation language therefore does not restrict the languages of
projects governed by SDD Yo.

## Package boundary

The package exposes:

```text
core library export
  Pure typed operations and injected platform interfaces.

sdd
  Thin CLI argument, rendering, process, and exit-code adapter.

published schema files
  Versioned JSON Schemas and JSONL protocol definitions.
```

These ship from one npm package and one repository. Separate published packages
require demonstrated consumer need, not speculative modularity.

## Compiler and runtime policy

- TypeScript strict mode is mandatory.
- Source is ESM and compiled output contains no TypeScript runtime dependency.
- Public input begins as `unknown` and is validated before typed model use.
- Domain IDs and fingerprints use branded or opaque types.
- Exhaustive discriminated unions represent artifact kinds, gate statuses,
  operations, diagnostics, and test states.
- Core functions receive explicit configuration and injected boundaries rather
  than reading `process.cwd`, environment, clock, randomness, filesystem, or
  Git implicitly.
- Platform-specific behavior is isolated behind narrow interfaces and tested
  on macOS.

## Dependency policy

Prefer small, maintained libraries for standards-heavy parsing and validation,
but keep SDD semantics in local code.

Expected dependency categories:

- CommonMark/GFM AST parsing with source positions;
- strict YAML parsing without custom tags;
- runtime schema validation and JSON Schema generation;
- bounded XML parsing with DTD and external entities disabled;
- CLI argument parsing;
- Git read access, using a narrow adapter around either the Git executable or a
  library selected by a focused spike.

Selection criteria:

- ESM and Node 22 support;
- deterministic behavior;
- source position preservation;
- bounded input handling;
- safe handling of foreign path forms;
- no required network or telemetry;
- active maintenance and acceptable transitive dependency surface;
- ability to inject I/O for tests.

Do not implement a Markdown, YAML, XML, cryptographic, or CLI parser from
scratch merely to avoid a dependency.

## Testing stack

The test suite supports:

- unit tests for pure canonicalization and graph operations;
- fixture/golden tests for schemas and Markdown;
- property tests where they materially strengthen ordering, path, or
  fingerprint invariants;
- integration tests using temporary Git repositories and filesystems;
- process tests for JSONL adapters, timeouts, and output limits;
- macOS CI;
- packaged CLI smoke tests.

Every test or ancestor suite verifying an active Requirement contains the exact
Requirement ID in its normalized name.

## Distribution stages

1. local source execution during contract and scaffold work;
2. packed npm artifact tested in temporary projects;
3. public unscoped `sdd-yo` package with the `sdd` executable, plus the retained
   exact offline tarball route;
4. optional standalone binaries only after installation friction is measured.

Standalone packaging must not change fingerprints, schemas, exit codes, or
path behavior.

## Deferred implementation choices

- standalone binary packager;
- optional model provider integration;
- hosting or CI-provider integrations.

Each choice is resolved by the smallest focused spike before its first
production use.
