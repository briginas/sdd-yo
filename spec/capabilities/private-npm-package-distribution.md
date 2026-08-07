---
sdd:
  type: capability
  id: CAP-6AD33965
---

# Private npm package distribution

## Purpose <!-- sdd:purpose -->

Let a developer install exact compatible SDD Yo package bytes from a private
local npm artifact without publishing the package or cloning its source
repository.

<a id="req-b0b35d6d"></a>

## REQ-B0B35D6D — Produce an installable private tarball

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-D9CF3A46 — Report the CLI version](cli-discoverability-and-compatibility-identity.md#req-d9cf3a46)
- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)

### Statement <!-- sdd:statement -->

The private `sdd-yo` package shall produce one local npm tarball that installs
its complete runtime, built public surfaces, versioned schemas, and exact
`sdd-yo` Agent Skill payload into a clean consumer project without registry
publication, a source checkout, or manual dependency wiring.

### Acceptance criteria <!-- sdd:acceptance -->

- The source and packed manifests retain package name `sdd-yo`, package version
  `0.1.1`, `"private": true`, ESM module type, the `sdd` executable mapping,
  library export and declaration mappings, and Node.js engine baseline
  `>=22.18.0`.
- `npm pack` creates exactly one local tarball and performs no npm registry
  publication.
- The tarball contains the built `sdd` CLI, importable library JavaScript and
  declarations, every exported version 1 JSON Schema, all locked runtime
  dependencies needed for offline installation, and every regular file in the
  repository's `skills/sdd-yo` payload with identical bytes.
- The packed inventory is checked exactly and contains no product source,
  tests, development-only tooling, repository configuration, proposal
  candidate, workflow evidence, or unrelated file.
- Installing only the exact tarball with npm offline mode into a fresh temporary
  consumer project succeeds without a source-repository dependency, manual
  extraction, manual symlink, or network access.
- The installed `sdd` executable, library export and declarations, versioned
  schemas, and packaged Skill files are regular files at their declared package
  paths.

<a id="req-a2199bc2"></a>

## REQ-A2199BC2 — Bind every packaged surface to the compatibility identity

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-97D96950 — Expose machine-readable compatibility identity](cli-discoverability-and-compatibility-identity.md#req-97d96950)
- depends-on: [REQ-B0B35D6D — Produce an installable private tarball](private-npm-package-distribution.md#req-b0b35d6d)

### Statement <!-- sdd:statement -->

Every CLI, library, JSON Schema, and `sdd-yo` Skill surface installed from the
private tarball shall match the package, CLI, JSON-schema, and Skill protocol
versions declared by the packaged CLI compatibility identity.

### Acceptance criteria <!-- sdd:acceptance -->

- The installed manifest name and version exactly match
  `result.package.name` and `result.package.version` from the installed
  `sdd --version --format json` response.
- The installed executable name and reported version exactly match
  `result.cli.name` and `result.cli.version`, and the CLI version equals the
  package version.
- The installed schema export paths and exact schema bytes are version 1 and
  match `result.json_schema.version` and its compatible major.
- The installed Skill is named `sdd-yo`, its complete payload bytes match the
  packed source payload, and the packaged compatibility wrapper accepts the
  installed `sdd` executable's version 1 JSON for an explicitly selected
  project.
- The accepted Skill protocol version and compatible major match
  `result.skill.protocol_version` and `result.skill.compatible_major`.
- Package verification fails on a missing or extra packed file, a changed Skill
  byte, a mismatched package or CLI version, an incompatible JSON-schema or
  Skill protocol, or an executable that is not the packaged `sdd` target.

<a id="req-43b4311e"></a>

## REQ-43B4311E — Keep package installation lifecycle inert

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-B0B35D6D — Produce an installable private tarball](private-npm-package-distribution.md#req-b0b35d6d)

### Statement <!-- sdd:statement -->

The private package shall declare no install lifecycle hook and shall cause no
package-controlled mutation beyond npm's explicit installation state in the
selected consumer project.

### Acceptance criteria <!-- sdd:acceptance -->

- The source and packed manifests declare no `preinstall`, `install`,
  `postinstall`, `prepare`, or other install-time lifecycle hook.
- A clean tarball installation is exercised with npm lifecycle execution
  enabled rather than bypassed with `--ignore-scripts`.
- Installation changes only the explicitly selected consumer project's npm
  installation state and an explicitly isolated npm cache; an external
  sentinel remains byte-for-byte unchanged.
- Installation does not initialize or select an SDD Project, write under
  `.agents/skills`, modify specification or Git state, or choose a global
  executable.
- Creating and installing the private tarball performs no network request,
  telemetry, registry publication, branch, commit, tag, push, merge, approval,
  or QA side effect.
