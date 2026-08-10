---
sdd:
  type: capability
  id: CAP-45C2C93F
---

# Repository-scoped Agent Skill installation

## Purpose <!-- sdd:purpose -->

Let a developer explicitly install the exact packaged `sdd-yo` Agent Skill in
one selected Git repository and complete the first compatible CLI-backed use
without a global Skill or an accidental global executable.

<a id="req-3f19778b"></a>

## REQ-3F19778B — Install the packaged Skill in one selected repository

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-B0B35D6D — Produce installable public and offline package artifacts](public-npm-package-distribution.md#req-b0b35d6d)
- depends-on: [REQ-A2199BC2 — Bind every public and offline packaged surface to the compatibility identity](public-npm-package-distribution.md#req-a2199bc2)
- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)

### Statement <!-- sdd:statement -->

The `sdd` CLI shall install the exact `sdd-yo` Skill payload from the same
package as the executing CLI under `.agents/skills/sdd-yo` only when a
developer explicitly selects one existing Git repository root.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd skill install --root <repository-root>` requires an explicit root and
  does not infer a repository from the process working directory, an SDD
  configuration, or a global installation location.
- Repository scope remains selected only by `--root`; `--scope user` selects a
  separate lifecycle and is mutually exclusive with the repository root.
- The selected root is an existing Git repository root, and the destination is
  exactly `<repository-root>/.agents/skills/sdd-yo`.
- The installer reads the Skill payload from the same package as the executing
  `sdd` CLI and copies every packaged Skill file with identical bytes.
- The installed directory also contains a deterministic binding manifest that
  identifies the package, CLI, JSON-schema protocol, Skill protocol, packaged
  payload fingerprint, and repository-relative packaged CLI path.
- The version 1 JSON response reports the sorted installed paths and exact
  compatibility identity; human output remains a view over that response.
- Installation succeeds before the repository contains an SDD Project and
  does not initialize, select, or validate one implicitly.

<a id="req-cf3a1070"></a>

## REQ-CF3A1070 — Bind first Skill use to a compatible packaged CLI

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-3F19778B — Install the packaged Skill in one selected repository](repository-scoped-agent-skill-installation.md#req-3f19778b)
- depends-on: [REQ-97D96950 — Expose machine-readable compatibility identity](cli-discoverability-and-compatibility-identity.md#req-97d96950)
- depends-on: [REQ-382BBBD6 — Initialize an SDD Project](project-initialization-and-adoption.md#req-382bbbd6)

### Statement <!-- sdd:statement -->

The installed Skill compatibility wrapper shall invoke only the packaged CLI
bound by its installation manifest or an explicitly selected compatible CLI,
and shall support explicit initialization followed by the first validation in
the selected repository.

### Acceptance criteria <!-- sdd:acceptance -->

- Without `--cli`, the wrapper resolves the repository-relative CLI path from
  its installation binding manifest and never searches `PATH` for `sdd`.
- The repository wrapper never falls back to a user-scoped Skill or private
  user CLI store, and the user wrapper never adopts this repository binding.
- With `--cli <path>`, the wrapper uses only that explicit path and does not
  fall back to the bound or global executable when it is missing or invalid.
- Before forwarding a product command, the wrapper reads
  `sdd --version --format json` and requires the exact bound package and CLI
  versions plus compatible version 1 JSON-schema and Skill protocols.
- Missing, malformed, interrupted, or incompatible identity output stops the
  workflow before the requested product command runs.
- In a clean consumer repository installed from the exact public registry
  artifact or retained offline tarball, the installed wrapper can explicitly
  run `init --root` with an adoption mode and then `validate --cwd` through the
  bound packaged CLI.
- The wrapper verifies the versioned JSON result and filesystem claims from
  both commands and never turns a successful validation into approval or QA
  evidence.

<a id="req-a0456614"></a>

## REQ-A0456614 — Refuse unsafe or implicit Skill installation

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-3F19778B — Install the packaged Skill in one selected repository](repository-scoped-agent-skill-installation.md#req-3f19778b)
- depends-on: [REQ-43B4311E — Keep public and offline package installation lifecycle inert](public-npm-package-distribution.md#req-43b4311e)
- depends-on: [REQ-1DD46CA9 — Treat repository content as untrusted data](multi-project-cli-and-skill.md#req-1dd46ca9)

### Statement <!-- sdd:statement -->

Repository-scoped Skill installation shall fail closed rather than traverse a
symbolic link, escape the selected repository, overwrite an existing
destination, accept incompatible packaged surfaces, or cause an implicit
global or package-manager mutation.

### Acceptance criteria <!-- sdd:acceptance -->

- The installer rejects a missing or non-repository root, path traversal, a
  symbolic-link component in the destination chain, a non-directory component,
  and any resolved source or target outside the selected package or repository.
- Any existing `.agents/skills/sdd-yo` entry, including a file, directory, or
  symbolic link, is rejected without changing its bytes; update and removal
  remain separate explicit lifecycle operations.
- A user-scoped installation is neither an existing repository destination nor
  overwrite authority for one; repository and user lifecycle targets remain
  independent.
- A missing, incomplete, byte-modified, or compatibility-mismatched packaged
  Skill payload is rejected before destination publication.
- On every refusal, no partial Skill destination remains and sentinels inside
  and outside the repository remain byte-for-byte unchanged.
- Installation does not invoke a package manager, change package manifests or
  lockfiles, install globally, write outside `.agents/skills/sdd-yo`, or modify
  `.sdd`, `spec`, Git state, branches, commits, approvals, or QA evidence.
- The command performs no network request, telemetry, registry publication, or
  marketplace operation.
