# SDD Yo

SDD Yo helps people and AI agents understand a software project through a
clear, connected specification. The specification is a graph: it shows what
the project does and how its parts relate. This makes it easier to find
information and quickly see the whole picture.

You can add SDD Yo to an existing project and build the specification step by
step. Every change to the specification or code carries its own context, so
several changes can be developed at the same time without confusion.

Exact version `0.5.1` is public on npm and requires Node.js `22.18.0` or newer.
Public availability is established only by the npm registry, not by source or
README state. The project is pre-1.0, and installing the package does not
install or publish a Codex plugin.

## Quick start

Requires macOS and Node.js `22.18.0` or newer. Choose one setup.

### Install for your macOS user

Use one SDD Yo Skill across multiple repositories. This does not add `sdd-yo`
to a project or create a global `sdd` command.

```text
npm exec --package=sdd-yo@0.5.1 -- sdd skill install --scope user --format json
```

Then use `$sdd-yo` in Codex. Always select the repository explicitly:

```text
node ~/.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root /absolute/path/to/repository --adoption incremental
node ~/.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd /absolute/path/to/repository
```

The install creates `~/.agents/skills/sdd-yo` and a private CLI under
`~/Library/Application Support/sdd-yo/cli/<package-version>`. The Skill uses
only that verified CLI. It does not use `PATH`, a repository CLI, a package
manager, or the network after installation. User mode rejects `--cli`.

### Install in one repository

Run these commands from the selected Git repository:

```text
cd /absolute/path/to/repository
npm install --save-dev --save-exact sdd-yo@0.5.1
npm exec -- sdd --version --format json
node ./node_modules/sdd-yo/dist/bin/sdd.js skill install --root /absolute/path/to/repository --format json
```

This creates `/absolute/path/to/repository/.agents/skills/sdd-yo` without
initializing the project or modifying Git. In Codex, use `$sdd-yo`. For a
direct first run:

```text
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root /absolute/path/to/repository --adoption incremental
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd /absolute/path/to/repository
```

### Use the npm CLI without a Skill

Run the exact package without adding it to a repository:

```text
npm exec --package=sdd-yo@0.5.1 -- sdd --version --format json
npm exec --package=sdd-yo@0.5.1 -- sdd validate --cwd /absolute/path/to/repository --format json
```

The validation command requires an initialized SDD Project. After installing
the package in a repository, use `npm exec -- sdd ...` to run its local CLI.

For every setup, initialize with `incremental` adoption unless the specification
will govern the entire repository. Initialization creates `.sdd/config.yaml`,
`spec/README.md`, `spec/capabilities/`, and `spec/concepts/`; it does not create
a branch or commit. The first validation should return `status: "ok"` and
`result.valid: true`.

The version check should return exit code `0`, `status: "ok"`, package and CLI
version `0.5.1`, and compatible JSON-schema and Skill protocol major `1`. Do
not rely on a global `sdd` executable or Skill. User-scoped installation and
its public consumer proof are macOS-only.

## Use as a library

The npm package provides an ESM library, TypeScript declarations, the `sdd`
CLI, and versioned JSON Schemas.

```js
import { JSON_SCHEMA_VERSION_V1 } from "sdd-yo";

console.log(JSON_SCHEMA_VERSION_V1); // "1.0"
```

Versioned schemas are available through paths such as
`sdd-yo/schemas/v1/common.schema.json`.

## Offline installation

Install an approved exact tarball without registry fallback:

```text
npm install --offline --no-audit --no-fund --save-exact <tarball-path>
node ./node_modules/sdd-yo/dist/bin/sdd.js --version --format json
```

Require the same version and protocol identity described above.

### Yarn Plug'n'Play

The Skill requires a physical packaged CLI inside the repository. Keep SDD Yo
out of the Yarn dependency graph and place it in an ignored npm consumer:

```text
mkdir .sdd-tooling
mkdir .sdd-tooling/consumer
cd .sdd-tooling/consumer
npm init --yes
npm install --offline --no-audit --no-fund --save-exact <tarball-path>
cd ../..
node ./.sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js --version --format json
node ./.sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js skill install --root <repository-root> --format json
```

Add `.sdd-tooling/` to `.gitignore`. Keep `.agents/`, `.sdd/`, and `spec/` as
reviewable project changes. For direct CLI commands, substitute
`./.sdd-tooling/consumer/node_modules/sdd-yo` for `./node_modules/sdd-yo`.

## Automation

Call the packaged CLI with an explicit project root and JSON output:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js validate --cwd <repository-root> --format json
```

Use `schema_version`, `status`, `diagnostics[].code`, and the typed `result` as
the API; do not parse English output. Exit codes are `0` for a completed
non-blocking result, `1` for blocked, `2` for human review, and `3` for an
invocation, configuration, I/O, protocol, or internal failure.

## Skill lifecycle

After installing the selected exact package, update or remove its verified
repository Skill with:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js skill update --root <repository-root> --format json
node ./node_modules/sdd-yo/dist/bin/sdd.js skill remove --root <repository-root> --format json
```

These commands refuse modified, stale, incompatible, unsafe, or undeclared
installation bytes. Removal leaves the npm package, `.sdd`, `spec`, Git, and
adjacent repositories untouched.

On macOS, update or remove the independently selected user installation with:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js skill update --scope user --format json
node ./node_modules/sdd-yo/dist/bin/sdd.js skill remove --scope user --format json
```

User lifecycle commands verify both the Skill and private CLI inventories.
They refuse modified, missing, foreign, ambiguous, or incomplete recovery
state without falling back to a repository installation.

## Common diagnostics

| Code                                         | Action                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `SDD_CONFIG_NOT_FOUND`                       | Correct the explicit project selector; initialize only when intended.           |
| `SDD_INIT_TARGET_CONFLICT`                   | Preserve existing bytes and resolve the conflicting target.                     |
| `SDD_INIT_ROOT_INVALID`                      | Select an existing directory.                                                   |
| `SDD_INIT_TARGET_UNSAFE`                     | Stop and correct the unsafe target.                                             |
| `SDD_GIT_HISTORY_INCOMPLETE`                 | Fetch complete history before relying on ID-reuse guarantees.                   |
| `SDD_GIT_REF_UNRESOLVED`                     | Fetch or correct the exact requested Git ref.                                   |
| `SDD_USER_SKILL_PLATFORM_UNSUPPORTED`        | Use user scope only on macOS; do not substitute a global install.               |
| `SDD_USER_SKILL_PACKAGE_INVALID`             | Preserve both stores and select the reviewed exact package bytes.               |
| `SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID` | Preserve modified or foreign bytes; do not overwrite or delete.                 |
| `SDD_USER_SKILL_RECOVERY_REQUIRED`           | Retry only the intended explicit lifecycle command to reconcile verified state. |

For Skill lifecycle failures, correct the reported root, compatibility,
binding, or owned-byte mismatch; never bypass verification with a global
installation or silent overwrite. See the
[`diagnostics catalog`](skills/sdd-yo/references/diagnostics.md) for details.

## Authority boundaries

Deterministic CLI results do not create or imply human approval, semantic
review, QA, test execution, finding resolution, patch permission, or merge
permission. A `PASS` applies only to the report's exact governed scope and
evidence; it is not whole-project certification.

Only identified humans can issue approval and QA evidence. SDD Yo never
creates branches, commits, pushes, merges, approvals, or QA decisions
implicitly.

See the [`specification`](spec/README.md) for implemented behavior and the
[`architecture map`](proposal/architecture/README.md) for implementation
contracts.

## Development

Install locked dependencies with `npm ci`. See [`CONTRIBUTING.md`](CONTRIBUTING.md)
for validation and contribution guidance, [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
for community standards, and [`SECURITY.md`](SECURITY.md) for private
vulnerability reporting.

## License

Licensed under the [Apache License 2.0](LICENSE). Copyright 2026 Ivan Briginas.
