---
sdd:
  type: capability
  id: CAP-6AD33965
---

# Public npm package distribution

## Purpose <!-- sdd:purpose -->

Let a developer install exact compatible SDD Yo package bytes from the public
npm registry or a retained local npm artifact without cloning its source
repository.

<a id="req-b0b35d6d"></a>

## REQ-B0B35D6D — Produce installable public and offline package artifacts

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-D9CF3A46 — Report the CLI version](cli-discoverability-and-compatibility-identity.md#req-d9cf3a46)
- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)

### Statement <!-- sdd:statement -->

The `sdd-yo` package shall publish an exact public npm registry artifact and
retain one local offline tarball route, each installing its complete runtime,
built public surfaces, versioned schemas, and exact `sdd-yo` Agent Skill
payload into a clean consumer project without a source checkout or manual
dependency wiring.

### Acceptance criteria <!-- sdd:acceptance -->

- The source and packed manifests retain package name `sdd-yo`, package version
  `0.3.0`, explicit public access, ESM module type, the `sdd` executable
  mapping, library export and declaration mappings, and Node.js engine baseline
  `>=22.18.0`.
- The public registry artifact installs by the exact `sdd-yo@0.3.0` package
  identity, and `npm exec --package=sdd-yo@0.3.0 -- sdd ...` invokes its exact
  executable without a global installation or PATH fallback.
- `npm pack` creates exactly one retained local tarball without registry
  publication; the tarball remains installable in npm offline mode.
- Each public and offline artifact contains the built `sdd` CLI, importable
  library JavaScript and declarations, every exported version 1 JSON Schema,
  all locked runtime dependencies needed for its supported installation route,
  and every regular file in the repository's `skills/sdd-yo` payload with
  identical bytes.
- The packed inventory is checked exactly and contains no product source,
  tests, development-only tooling, repository configuration, proposal
  candidate, workflow evidence, or unrelated file.
- Installing the exact registry package or only the exact offline tarball into
  a fresh temporary consumer project succeeds without a source-repository
  dependency, manual extraction, or manual symlink.
- The installed `sdd` executable, library export and declarations, versioned
  schemas, and packaged Skill files are regular files at their declared package
  paths.

<a id="req-a2199bc2"></a>

## REQ-A2199BC2 — Bind every public and offline packaged surface to the compatibility identity

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-97D96950 — Expose machine-readable compatibility identity](cli-discoverability-and-compatibility-identity.md#req-97d96950)
- depends-on: [REQ-B0B35D6D — Produce an installable private tarball](private-npm-package-distribution.md#req-b0b35d6d)

### Statement <!-- sdd:statement -->

Every CLI, library, JSON Schema, and `sdd-yo` Skill surface installed from the
public registry artifact or retained offline tarball shall match the package,
CLI, JSON-schema, and Skill protocol versions declared by the packaged CLI
compatibility identity.

### Acceptance criteria <!-- sdd:acceptance -->

- The installed manifest name and version from each supported artifact exactly match
  `result.package.name` and `result.package.version` from the installed
  `sdd --version --format json` response.
- The installed executable name and reported version exactly match
  `result.cli.name` and `result.cli.version`, and the CLI version equals the
  package version.
- The installed schema export paths and exact schema bytes are version 1 and
  match `result.json_schema.version` and its compatible major.
- The installed Skill is named `sdd-yo`, its complete payload bytes match the
  corresponding packed source payload, and the packaged compatibility wrapper accepts the
  installed `sdd` executable's version 1 JSON for an explicitly selected
  project.
- The accepted Skill protocol version and compatible major match
  `result.skill.protocol_version` and `result.skill.compatible_major`.
- Package verification fails on a missing or extra packed file, a changed Skill
  byte, a mismatched package or CLI version, an incompatible JSON-schema or
  Skill protocol, or an executable that is not the packaged `sdd` target.

<a id="req-43b4311e"></a>

## REQ-43B4311E — Keep public and offline package installation lifecycle inert

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-B0B35D6D — Produce an installable private tarball](private-npm-package-distribution.md#req-b0b35d6d)

### Statement <!-- sdd:statement -->

The public package and retained offline tarball shall declare no install
lifecycle hook and shall cause no package-controlled mutation beyond npm's
explicit installation state in the selected consumer project.

### Acceptance criteria <!-- sdd:acceptance -->

- The source and packed manifests declare no `preinstall`, `install`,
  `postinstall`, `prepare`, or other install-time lifecycle hook.
- Clean registry-package and tarball installations are exercised with npm
  lifecycle execution enabled rather than bypassed with `--ignore-scripts`.
- Each installation changes only the explicitly selected consumer project's npm
  installation state and an explicitly isolated npm cache; an external sentinel
  remains byte-for-byte unchanged.
- Installation does not initialize or select an SDD Project, write under
  `.agents/skills`, modify specification or Git state, or choose a global
  executable.
- Creating and installing the offline tarball performs no network request,
  telemetry, registry publication, branch, commit, tag, push, merge, approval,
  or QA side effect. Installing the public registry package does not itself
  perform a package-controlled publication or any Git, approval, QA, or SDD
  project side effect.

<a id="req-abffeaf2"></a>

## REQ-ABFFEAF2 — Publish only from an immutable trusted release subject

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-B0B35D6D — Produce installable public and offline package artifacts](private-npm-package-distribution.md#req-b0b35d6d)

### Statement <!-- sdd:statement -->

Public publication shall run only from one immutable release Git subject through
the configured GitHub Actions trusted publisher for `briginas/sdd-yo`, using
the `publish.yml` workflow, protected `release` environment, and OIDC; ordinary
CI and local commands shall not be publish-capable and no long-lived npm token
shall be required by the workflow.

### Acceptance criteria <!-- sdd:acceptance -->

- The release workflow is separate from ordinary CI, requires an immutable
  release subject, and has only the repository-read and OIDC permissions needed
  to publish.
- The workflow runs on a GitHub-hosted runner and authenticates npm through its
  configured trusted publisher rather than a stored npm write token.
- The workflow configuration binds the `briginas/sdd-yo` repository,
  `publish.yml` filename, and protected `release` environment to the public
  package release route.
- Local developer commands and ordinary CI cannot publish a package merely by
  running build, test, package-smoke, or validation commands.

<a id="req-0163273a"></a>

## REQ-0163273A — Make each public package release independently verifiable

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-B0B35D6D — Produce installable public and offline package artifacts](private-npm-package-distribution.md#req-b0b35d6d)
- depends-on: [REQ-ABFFEAF2 — Publish only from an immutable trusted release subject](private-npm-package-distribution.md#req-abffeaf2)

### Statement <!-- sdd:statement -->

Each public `sdd-yo` package release shall expose a registry identity, integrity
record, and provenance attestation that bind its immutable versioned artifact to
the authorized release workflow and public source repository.

### Acceptance criteria <!-- sdd:acceptance -->

- The public registry package name is `sdd-yo`, its first public version is
  `0.3.0`, and its access is public.
- The release records the exact immutable Git subject, package inventory,
  package integrity hash, and npm registry response for review before public
  publication is authorized.
- The published package exposes npm integrity metadata and provenance that link
  it to the configured GitHub Actions release workflow and the public
  `briginas/sdd-yo` repository.
- A release refuses a package version that already exists or whose selected Git
  subject, package identity, inventory, integrity hash, access mode, publisher,
  or provenance configuration differs from the reviewed release subject.
