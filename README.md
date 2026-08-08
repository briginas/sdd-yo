# SDD Yo

SDD Yo is a repository-native specification governance system with a
deterministic `sdd` CLI, versioned JSON protocols, and an optional
repository-scoped `sdd-yo` Agent Skill.

Version `0.3.0` is public on npm and requires Node.js `22.18.0` or newer. The
project is pre-1.0, and installing the package does not install or publish a
Codex plugin.

## Quick start

From the root of an existing Git repository, install the exact package:

```text
npm install --save-dev --save-exact sdd-yo@0.3.0
npm exec --package=sdd-yo@0.3.0 -- sdd --version --format json
```

The version check must return exit code `0`, `status: "ok"`, package and CLI
version `0.3.0`, and compatible JSON-schema and Skill protocol major `1`.

Install the repository-scoped Skill:

```text
node ./node_modules/sdd-yo/dist/bin/sdd.js skill install --root <repository-root> --format json
```

This creates `<repository-root>/.agents/skills/sdd-yo` without initializing the
project or modifying Git. In Codex, use `$sdd-yo` to initialize that root with
`incremental` or `complete` adoption. The Skill must confirm both choices.

For a direct first run:

```text
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root <repository-root> --adoption incremental
node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd <repository-root>
```

Use `--adoption complete` only when the specification will govern the entire
repository. Initialization creates `.sdd/config.yaml`, `spec/README.md`,
`spec/capabilities/`, and `spec/concepts/`; it does not create a branch or
commit. The first validation should return `status: "ok"` and
`result.valid: true`.

Replace `<repository-root>` with an absolute path. Do not rely on a global
`sdd` executable or Skill. The public package currently has independent
consumer evidence on macOS; Linux and Windows compatibility is not yet
claimed.

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

## Common diagnostics

| Code                         | Action                                                                |
| ---------------------------- | --------------------------------------------------------------------- |
| `SDD_CONFIG_NOT_FOUND`       | Correct the explicit project selector; initialize only when intended. |
| `SDD_INIT_TARGET_CONFLICT`   | Preserve existing bytes and resolve the conflicting target.           |
| `SDD_INIT_ROOT_INVALID`      | Select an existing directory.                                         |
| `SDD_INIT_TARGET_UNSAFE`     | Stop and correct the unsafe target.                                   |
| `SDD_GIT_HISTORY_INCOMPLETE` | Fetch complete history before relying on ID-reuse guarantees.         |
| `SDD_GIT_REF_UNRESOLVED`     | Fetch or correct the exact requested Git ref.                         |

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
