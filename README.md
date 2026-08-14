# SDD Yo

SDD Yo helps people and AI agents understand a software project through a
clear, connected specification. The specification is a graph: it shows what
the project does and how its parts relate. This makes it easier to find
information and quickly see the whole picture.

You can add SDD Yo to an existing project and build the specification step by
step. Every change to the specification or code carries its own context, so
several changes can be developed at the same time without confusion.

Exact version `0.5.4` is public on npm and requires Node.js `22.18.0` or newer.
Public availability is established only by the npm registry, not by source or
README state. The project is pre-1.0, and installing the package does not
install or publish a Codex plugin.

## Quick start

Requires Node.js `22.18.0` or newer.

For a new SDD Project, first initialize its specification and then validate it.
Use `incremental` adoption unless the specification will govern the entire
repository. Initialization creates `.sdd/config.yaml`, `spec/README.md`,
`spec/capabilities/`, and `spec/concepts/`; it does not create a branch or
commit. The first validation should return `status: "ok"` and
`result.valid: true`.

Choose how you want to run SDD Yo:

- use one Codex Skill across repositories on macOS;
- install the Skill in one repository;
- use the npm CLI without a Skill.

### Use one Codex Skill across repositories on macOS

Install the Skill once for your macOS user. This does not add `sdd-yo` to a
project or create a global `sdd` command.

```text
npm exec --package=sdd-yo@0.5.4 -- sdd skill install --scope user --format json
```

In Codex, use `$sdd-yo` to initialize and validate the selected repository.
Always provide its absolute path.

To perform the same first steps directly from the terminal:

```text
node ~/.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root /absolute/path/to/repository --adoption incremental
node ~/.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd /absolute/path/to/repository
```

The install creates `~/.agents/skills/sdd-yo` and a private CLI under
`~/Library/Application Support/sdd-yo/cli/<package-version>`. The Skill uses
only that verified CLI. It does not use `PATH`, a repository CLI, a package
manager, or the network after installation. User mode rejects `--cli`.

### Use the Skill in one repository

Install SDD Yo and its Skill in the selected Git repository:

```text
cd /absolute/path/to/repository
npm install --save-dev --save-exact sdd-yo@0.5.4
npm exec -- sdd --version --format json
node ./node_modules/sdd-yo/dist/bin/sdd.js skill install --root /absolute/path/to/repository --format json
```

This creates `/absolute/path/to/repository/.agents/skills/sdd-yo` without
initializing the project or modifying Git. In Codex, use `$sdd-yo` to initialize
and validate this repository.

To perform the same first steps directly from the terminal:

```text
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root /absolute/path/to/repository --adoption incremental
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd /absolute/path/to/repository
```

### Use the npm CLI without a Skill

Validate an existing SDD Project from the terminal without adding the package
or Skill to its repository:

```text
npm exec --package=sdd-yo@0.5.4 -- sdd --version --format json
npm exec --package=sdd-yo@0.5.4 -- sdd validate --cwd /absolute/path/to/repository --format json
```

After installing the package in a repository, use `npm exec -- sdd ...` to run
its local CLI.

The version check should return exit code `0`, `status: "ok"`, package and CLI
version `0.5.4`, and compatible JSON-schema and Skill protocol major `1`. Do
not rely on a global `sdd` executable or Skill. User-scoped installation and
its public consumer proof are macOS-only.

## View workflow progress

The observer turns a workflow-event journal into a temporary local web page.
It is useful when you want to see the current run, its steps, and its separate
approval, readiness, freshness, and integration states without reading logs.

Use this guide after installing an npm package version that includes the
observer in the selected repository. The public `sdd-yo@0.5.4` package
includes it.

Create a JSONL file inside the selected SDD Project. Each line is one event.
The `project_id` must match `.sdd/config.yaml`, and every event in one run must
use the same `change_id`, `run_id`, and `producer_id`:

```jsonl
{"schema_version":"1.0","artifact_type":"workflow_event","project_id":"SDD-17EF8B29","change_id":"demo","run_id":"run-1","producer_id":"manual","sequence":0,"event_type":"run_started"}
{"schema_version":"1.0","artifact_type":"workflow_event","project_id":"SDD-17EF8B29","change_id":"demo","run_id":"run-1","producer_id":"manual","sequence":1,"event_type":"step_started","step_id":"validate","label":"Validate project"}
{"schema_version":"1.0","artifact_type":"workflow_event","project_id":"SDD-17EF8B29","change_id":"demo","run_id":"run-1","producer_id":"manual","sequence":2,"event_type":"step_completed","step_id":"validate"}
{"schema_version":"1.0","artifact_type":"workflow_event","project_id":"SDD-17EF8B29","change_id":"demo","run_id":"run-1","producer_id":"manual","sequence":3,"event_type":"run_completed"}
```

Save it, for example, as `.sdd/staging/workflow-events.jsonl`. From the selected
repository, start its installed SDD Yo CLI with:

```text
npm exec -- sdd observe --cwd /absolute/path/to/repository --journal .sdd/staging/workflow-events.jsonl
```

You do not need to choose a port. SDD Yo asks the operating system for an
available local port and prints the complete `http://127.0.0.1:...` URL. Keep
the command running while the page is open, and press `Ctrl-C` when you are
done. The URL contains a private session capability; do not share it.

The CLI reads the journal once when it starts. After changing the file, restart
the command to see the new snapshot. Applications that need one-way live
updates can use `replayWorkflowEvents`, `startWorkflowObserver`, and the
session's `publish` method from the library.

The observer is read-only. It cannot approve a proposal, run a gate, change
Git, publish, or release. Its journal and snapshot are removable display data,
not approval or merge evidence.

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

## Planning broad work with the Skill

Ask `$sdd-yo` to plan an initiative when the desired outcome spans several
Capabilities or needs multiple independently deliverable Changes. The expected
result is an advisory ID-free map with proportionate design depth, explicit
boundaries and risks, and an ordered set of independently valuable vertical
slices.

No project is required for generic planning, and that path invokes no SDD CLI
operation. When you explicitly select an SDD Project, the Skill validates it
and inspects only the smallest relevant active specification slice. The map
stays conversational unless you explicitly request a project-local planning
file. Select one slice to enter the existing governed `spec-code`, `spec`, or
`code` workflow; planning itself creates no specification object, approval,
evidence, patch, or Git authority.

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
