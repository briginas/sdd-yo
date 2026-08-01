# Project configuration

## Location and discovery

One `.sdd/config.yaml` defines one SDD Project. The CLI accepts an explicit
`--config` path or searches upward from the current directory for the nearest
configuration.

All configured relative paths resolve against the SDD Project root selected by
the config. Git operations use the enclosing repository.

## Initial schema

```yaml
schema_version: 1
project_id: SDD-17EF8B29

spec:
  root: spec
  entrypoint: spec/README.md

adoption:
  mode: incremental

git:
  default_target_ref: main

ids:
  suffix_length: 8
  alphabet: hex-uppercase

tests:
  adapters:
    - id: unit
      type: junit
      discover:
        reports:
          - artifacts/junit/**/*.xml

    - id: custom
      type: command
      protocol: jsonl-v1
      discover:
        argv: ["node", "tools/sdd-tests.mjs", "discover"]
      execute:
        argv: ["node", "tools/sdd-tests.mjs", "execute"]
      timeout_ms: 120000
      max_output_bytes: 16777216
  import_limits:
    max_jsonl_bytes: 16777216
    max_report_bytes: 16777216
    max_xml_depth: 64
    max_suite_count: 100000
    max_test_count: 100000

evidence:
  allowed_issuers:
    - local-human
    - github-review
    - ci
```

`git.default_target_ref` is a convenience default only. Strict gate artifacts
always record resolved commit IDs.

`tests.import_limits` bounds explicit JSONL and JUnit file imports. Version 1
uses the values shown above when this optional mapping is absent, preserving
existing project configuration while keeping every import bounded. An explicit
JUnit import is bound to exactly one configured JUnit adapter selected with
`--adapter <id>`; the CLI never infers an adapter namespace from a report path.

## Schema behavior

- Duplicate YAML keys, custom YAML tags, and unsupported fields are rejected
  unless a future schema explicitly permits extension fields.
- Unknown newer major schema versions are incompatible.
- The CLI never performs an implicit write migration.
- A future explicit migration command must preview and validate changes before
  applying them.
- Config changes contribute to a config fingerprint.

## Trust-sensitive changes

Changes to adapter type, command, protocol, environment allowlist, report path,
evidence issuer, spec root, or entrypoint produce a structural and trust
finding. An external permission system authorizes command execution; config
text alone never grants authority.

## Monorepos

Multiple `.sdd/config.yaml` files may exist under one Git repository. Project
IDs must remain unique inside the repository. Each project graph, ID
namespace, test configuration, and gate result is isolated.

An external workflow determines which SDD Projects a repository diff affects
and requires each affected project gate to pass. Version 1 has no cross-project
object links.
