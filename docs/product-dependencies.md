# Product dependency selection

Milestone 1.3 locked the standards-heavy libraries needed by the first product
leaves. The tests in `test/dependency-contracts.test.ts` remain dependency
contract probes and claim no Requirement coverage.

## Selected packages

| Package                                                                                 | Kind        | First use and reason Node.js is insufficient                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ajv@8.20.0`                                                                            | runtime     | Draft 2020-12 validation, local `$ref`, `unevaluatedProperties`, and strict unknown-keyword handling. Node.js parses JSON but does not validate JSON Schema.                                                                                  |
| `ajv-formats@3.0.1`                                                                     | runtime     | Standards-aware `date-time` validation used by `common.schema.json`; Ajv intentionally keeps formats separate.                                                                                                                                |
| `yaml@2.9.0`                                                                            | runtime     | YAML 1.2 parsing with duplicate-key diagnostics, unresolved custom-tag diagnostics, and bounded aliases. Node.js has no YAML parser.                                                                                                          |
| `unified@11.0.5`, `remark-parse@11.0.0`, `remark-gfm@4.0.1`, `remark-frontmatter@5.0.0` | runtime     | CommonMark/GFM Markdown ASTs with source positions and YAML-frontmatter nodes. Node.js has no Markdown parser. All four packages expose native ESM entry points.                                                                              |
| `saxes@6.0.0`                                                                           | runtime     | Streaming XML events let the JUnit importer reject `DOCTYPE` before processing an entity and enforce depth/count/input limits in local code. Node.js has no XML parser.                                                                       |
| `json-schema-to-typescript@15.0.4`                                                      | development | Milestone 1.5 must derive TypeScript declarations from the checked-in JSON Schema source, including local references. Node.js and TypeScript do not provide that generator. It is build-time only and is not shipped as product runtime code. |

Ajv and YAML expose CommonJS implementations that Node.js ESM imports through
their supported package entry points. `saxes` is also CommonJS-compatible from
ESM. The committed test imports every selected API under the repository's ESM
and Node.js 22.18+ baseline, rather than treating a package's `type` field as
the compatibility test.

`esModuleInterop` enables TypeScript's declared CommonJS default-import shape.
`skipLibCheck` is enabled because the pinned `saxes` and schema generator
dependency declarations are not internally compatible with the repository's
`exactOptionalPropertyTypes` setting under TypeScript 7. It skips checking
third-party declaration implementations only; strict checking, including
`exactOptionalPropertyTypes`, remains enabled for repository code.

Ajv is configured with `strictSchema: true`, the checked-in annotation keyword
`x-sdd-ordering`, and `strictTypes: false`. The last setting disables Ajv's
optional schema-style lint because valid conditional subschemas in the
versioned contracts apply `minItems` or `maxItems` to properties typed by their
parent.
It does not relax runtime instance validation. YAML callers must reject both
parse errors and warnings, use `uniqueKeys: true`, provide no custom tags, and
apply a configured alias limit when converting a document to values.

The lockfile currently contains 82 production package entries: 8 direct
runtime packages and 74 transitive entries, chiefly the standards-focused GFM
AST stack. Including the existing scaffold tools and the development-only
schema generator, it contains 120 package entries in total. Exact direct pins
plus `package-lock.json` make the transitive resolution reproducible.

## No-package selections

- CLI argument parsing uses `node:util` `parseArgs`; it provides the strict,
  typed option parsing used by the CLI.
- Git access uses the Git executable behind an injected adapter and
  `node:child_process` direct spawning with argv arrays and `shell: false`.
  This preserves native Git behavior without an embedded implementation.
- SHA-256 and canonical byte hashing use `node:crypto`; filesystem and path
  boundaries use `node:fs`, `node:path`, and `node:url`.
- JSON/JSONL framing uses `JSON.parse` plus local byte, line, record, and depth
  limits. A streaming helper is selected only if the adapter implementation
  demonstrates that built-ins cannot enforce the contract safely.

The direct-spawn probe passes shell metacharacters as one literal argv value.
Git integration tests use temporary repositories through the injected adapter.

## Rejected or deferred alternatives

- Zod, TypeBox, and schema-first TypeScript DSLs were rejected because the
  checked-in Draft 2020-12 schemas are the single typed source.
  Adding another authoring model would create two normative representations.
- `js-yaml` was rejected in favor of `yaml`'s YAML 1.2 document diagnostics and
  alias controls. A hand-written configuration parser would be a standards and
  security liability.
- Lower-level `micromark`/`mdast-util-*` composition was rejected. It exposes
  more coupled extension plumbing without reducing the required GFM grammar;
  the remark stack provides the stable AST plugin boundary needed by 2.2.
- `fast-xml-parser` was rejected for this boundary. A materialized object tree
  is less suitable than `saxes` events for fail-fast `DOCTYPE` rejection and
  caller-enforced depth and element-count limits.
- A Git library and CLI framework were rejected because the platform and
  injected Git adapter provide the required behavior. The JUnit importer uses
  the locked `saxes` parser.
- `ajv-cli`, package bundlers, standalone binary tools, property-test
  libraries, and model/provider SDKs remain unselected until a bounded first
  use demonstrates need.

## Durable evidence

`npm test` verifies exact pins, ESM loading, Draft 2020-12 local references and
formats, YAML rejection signals and alias limits, Markdown extension nodes and
positions, XML `DOCTYPE` fail-fast behavior, schema-to-TypeScript generation,
strict `parseArgs`, and literal argv direct spawning. The normal full validation
remains authoritative for build, type safety, formatting, contract fixtures,
and whitespace.
