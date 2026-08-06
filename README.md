# SDD Yo

SDD Yo is a repository-native specification governance system. Its private
`sdd-yo` npm package provides the deterministic `sdd` CLI, versioned JSON
protocols, and an optional repository-scoped `sdd-yo` Agent Skill.

The package is currently private. This quickstart installs one exact local
tarball; it does not use or publish to an npm registry or a Codex plugin
marketplace.

## Prerequisites

- Node.js `22.18.0` or newer and npm.
- One existing Git repository and its absolute root path.
- One exact private `sdd-yo-0.1.0.tgz` artifact obtained through your approved
  private distribution channel.
- A choice of adoption mode: `incremental` governs only the specification scope
  you add, while `complete` declares complete adoption of the repository.

The commands below use `<repository-root>` and `<tarball-path>` as placeholders.
Replace them with absolute paths and run the commands from the selected
repository root. Do not rely on a global `sdd` executable or a global Skill.

## Install the exact local package

Install only the selected tarball. `--offline` prevents registry fallback, and
`--save-exact` records the exact private package version in the selected
repository's npm state.

```text
npm install --offline --no-audit --no-fund --save-exact <tarball-path>
```

Check the installed package, CLI, JSON-schema, and Skill protocol identity:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js --version --format json
```

Require exit code `0`, `status: "ok"`, package and CLI version `0.1.0`, and
compatible major `1` for both the JSON-schema and Skill protocols.

### Yarn Plug'n'Play repositories

Do not add `sdd-yo` to the Yarn dependency graph or change the repository's
`nodeLinker`. A Plug'n'Play package may resolve from a zip archive or a global
cache outside the selected Git root, while the repository Skill deliberately
requires a physical packaged CLI inside that root. Keep SDD Yo in an ignored,
isolated npm consumer instead.

Add `.sdd-tooling/` to the selected repository's `.gitignore`, then run these
commands from the repository root. The nested `consumer` name is intentional:
`npm init` cannot derive a valid package name directly from `.sdd-tooling`.

```text
mkdir .sdd-tooling
mkdir .sdd-tooling/consumer
cd .sdd-tooling/consumer
npm init --yes
npm install --offline --no-audit --no-fund --save-exact <tarball-path>
cd ../..
```

Check identity and install the repository Skill from the isolated CLI:

```text
node ./.sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js --version --format json
node ./.sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js skill install --root <repository-root> --format json
```

The installed binding records the repository-relative isolated CLI path. The
compatibility-wrapper `init` and `validate` commands below are unchanged. For
later direct JSON automation or Skill update/removal, replace
`./node_modules/sdd-yo` in the documented command with
`./.sdd-tooling/consumer/node_modules/sdd-yo`. Keep `.sdd-tooling/` ignored;
`.agents/`, `.sdd/`, and `spec/` remain ordinary reviewable project changes.

## Install and invoke the repository Skill

Install the exact Skill payload from that package into the selected repository:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js skill install --root <repository-root> --format json
```

The destination is `<repository-root>/.agents/skills/sdd-yo`. Installation is
explicit: it does not initialize an SDD Project, install globally, or select a
CLI from `PATH`.

In Codex, invoke the Skill by its unambiguous name. For example: use `$sdd-yo`
to initialize the exact `<repository-root>` with incremental adoption and then
perform the first validation. The Skill must confirm the root and adoption mode
before initialization.

For a direct, reproducible first use, call the installed compatibility wrapper.
It resolves only the packaged CLI recorded in its repository binding, checks
compatibility, and adds JSON output itself:

```text
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root <repository-root> --adoption incremental
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd <repository-root>
```

Use `--adoption complete` instead only after deliberately choosing complete
adoption. Initialization creates `.sdd/config.yaml`, `spec/README.md`,
`spec/capabilities/`, and `spec/concepts/`; it does not create a branch or
commit. If the host repository already formats these file types, format only
the paths reported in `result.created_paths`, with normal permission, before
creating fingerprint-bound workflow artifacts.

The first validation must return `status: "ok"`, the same `project_id`, and
`result.valid: true`. That confirms only that the initialized governed graph is
valid.

## JSON automation

Automation calls the packaged CLI directly, requests JSON explicitly, and uses
the selected project root rather than searching adjacent repositories:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js validate --cwd <repository-root> --format json
```

Treat `schema_version`, `status`, `diagnostics[].code`, and the command's typed
`result` as the automation API. Do not parse English human output. General exit
codes are `0` for a completed non-blocking result, `1` for blocked, `2` for
human review required, and `3` for invocation, configuration, I/O, protocol, or
internal failure. A warning is not proof of a guarantee it says is unavailable.

## Update or remove the Skill

To update, first install the newly selected exact private tarball with the same
offline `npm install` command above. Then explicitly replace the owned
repository Skill installation, or receive an `unchanged` result when its bytes
and binding are already exact:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js skill update --root <repository-root> --format json
```

Remove only a verified repository-scoped installation with:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js skill remove --root <repository-root> --format json
```

Removal does not uninstall the npm package or delete `.sdd`, `spec`, Git, or
adjacent repository content. Update and removal refuse modified, stale,
incompatible, unsafe, or undeclared installation bytes instead of treating the
destination as overwrite or deletion authority.

## Recovery by diagnostic code

Keep the exact JSON diagnostic code and remediation. Do not infer recovery from
message wording.

| Diagnostic                   | Recovery boundary                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SDD_CONFIG_NOT_FOUND`       | Correct the explicit `--cwd <repository-root>` or `--config <repository-root>/.sdd/config.yaml` selector. Initialize only when that is the user's intent; never initialize an adjacent project implicitly. |
| `SDD_INIT_TARGET_CONFLICT`   | Preserve existing bytes. Select the correct root or explicitly resolve the conflicting initialization target before retrying.                                                                              |
| `SDD_INIT_ROOT_INVALID`      | Select an existing directory; the CLI does not create an implicit root.                                                                                                                                    |
| `SDD_INIT_TARGET_UNSAFE`     | Stop and correct the unsafe target. Do not inspect or mutate outside the selected root.                                                                                                                    |
| `SDD_GIT_HISTORY_INCOMPLETE` | Fetch complete repository history before relying on identifier-reuse guarantees. Preserve the warning until that history is available.                                                                     |
| `SDD_GIT_REF_UNRESOLVED`     | Fetch or correct the exact requested Git ref; do not silently substitute another ref.                                                                                                                      |

For Skill install, update, or removal failures, preserve the destination and
outside files. Correct the reported root, package compatibility, binding, or
owned-byte mismatch before rerunning the same explicit lifecycle command; do
not bypass verification with a manual global installation or silent overwrite.
The Skill's focused recovery catalog is in
[`skills/sdd-yo/references/diagnostics.md`](skills/sdd-yo/references/diagnostics.md).

## Deterministic results and human authority

CLI validation, proposal, finding, and merge outputs are deterministic results
for their exact inputs. They do not create or imply human approval, semantic
review, QA, test execution, finding resolution, permission to apply a patch, or
permission to merge. A `PASS` applies only to the report's governed affected
scope and exact evidence; it is not whole-project certification.

Only identified humans can issue the applicable approval and QA evidence. Keep
those subject-bound artifacts distinct from CLI output, and stop when a
workflow requires a human decision. SDD Yo never creates branches, commits,
pushes, merges, approvals, or QA decisions implicitly.

For implemented behavior and detailed command contracts, see the
[`spec/`](spec/README.md) and
[`proposal/architecture/`](proposal/architecture/README.md) maps.
