---
sdd:
  type: capability
  id: CAP-F6FE3755
---

# macOS user-scoped Agent Skill installation and lifecycle

## Purpose <!-- sdd:purpose -->

Let one macOS developer install one exact `sdd-yo` Agent Skill and private CLI
for use across explicitly selected repositories, then update or remove only
that owned installation without a global executable or per-repository package.

<a id="req-778099c0"></a>

## REQ-778099C0 — Install one exact user-scoped Skill and private CLI

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-B0B35D6D — Produce installable public and offline package artifacts](public-npm-package-distribution.md#req-b0b35d6d)
- depends-on: [REQ-A2199BC2 — Bind every public and offline packaged surface to the compatibility identity](public-npm-package-distribution.md#req-a2199bc2)
- depends-on: [REQ-3F19778B — Install the packaged Skill in one selected repository](repository-scoped-agent-skill-installation.md#req-3f19778b)

### Statement <!-- sdd:statement -->

On macOS, the `sdd` CLI shall install one exact user-scoped `sdd-yo` Skill and
one private versioned CLI package only when a developer invokes the explicit
user-scope installation command from the exact source package.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd skill install --scope user` is the user lifecycle command;
  `--scope user` is mutually exclusive with `--root`, `--cwd`, and `--config`.
- The destination is exactly `~/.agents/skills/sdd-yo`, and the private package
  destination is exactly
  `~/Library/Application Support/sdd-yo/cli/<package-version>` after the home
  directory and macOS Application Support root are resolved through injected
  platform boundaries.
- The installer accepts source bytes only from the same exact package as the
  executing CLI, verifies its packed inventory, Skill payload, compatibility
  identity, regular-file types, and fingerprints, and copies the complete
  runtime including its required bundled production dependencies.
- The canonical installed executable is the private package's
  `dist/bin/sdd.js`; installation creates no global executable or PATH entry.
- A successful version 1 result reports the scope, canonical destinations,
  sorted owned paths, package and Skill fingerprints, and compatibility
  identity. Human output remains a view over that result.
- Installation creates or changes no SDD Project, target repository, package
  manager state, Git state, approval, QA, or publication state.

<a id="req-c975ae17"></a>

## REQ-C975AE17 — Bind every user Skill operation to the installed private CLI

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-778099C0 — Install one exact user-scoped Skill and private CLI](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-778099c0)
- depends-on: [REQ-CF3A1070 — Bind first Skill use to a compatible packaged CLI](repository-scoped-agent-skill-installation.md#req-cf3a1070)
- depends-on: [REQ-97D96950 — Expose machine-readable compatibility identity](cli-discoverability-and-compatibility-identity.md#req-97d96950)

### Statement <!-- sdd:statement -->

The user-scoped Skill compatibility wrapper shall invoke only the verified
private CLI named by its exact user installation binding.

### Acceptance criteria <!-- sdd:acceptance -->

- The binding identifies user scope, package and CLI identity, JSON-schema and
  Skill protocol compatibility, the canonical absolute CLI path, package and
  Skill fingerprints, and sorted owned regular-file inventories with exact
  SHA-256 values.
- Before running the bound CLI, the wrapper verifies its own declared payload,
  the private package inventory and fingerprints, canonical paths, and absence
  of symbolic links or undeclared entries.
- The wrapper then preflights the bound CLI through
  `sdd --version --format json` and requires exact binding identity before
  forwarding the selected product command.
- User scope rejects `--cli`; it never searches `PATH`, invokes a global
  executable, selects a repository CLI, downloads a package, or repairs an
  installation at first use.
- Missing, malformed, modified, moved, interrupted, or incompatible binding or
  store state stops before a product command executes.

<a id="req-05cabe17"></a>

## REQ-05CABE17 — Require an explicit repository for user Skill operations

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-C975AE17 — Bind every user Skill operation to the installed private CLI](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-c975ae17)
- depends-on: [REQ-0361538D — Scope projects by nearest configuration](multi-project-cli-and-skill.md#req-0361538d)
- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The user-scoped Skill shall require one explicit target repository or SDD
Project for every forwarded operation rather than deriving authority from the
Skill installation or process working directory.

### Acceptance criteria <!-- sdd:acceptance -->

- Initialization requires an explicit `--root` and adoption mode.
- Every other project operation requires exactly one explicit `--cwd` or
  `--config`; projectless authoring and process-cwd discovery are rejected by
  the user-scoped wrapper.
- The wrapper verifies that the selected command's version 1 result names the
  expected project and that every reported filesystem path stays within its
  selected authority.
- Selecting a project performs no initialization, Skill lifecycle, approval,
  QA, Git, package-manager, or network operation implicitly.

<a id="req-2b49d454"></a>

## REQ-2B49D454 — Update only an owned user-scoped installation

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-778099C0 — Install one exact user-scoped Skill and private CLI](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-778099c0)
- depends-on: [REQ-C975AE17 — Bind every user Skill operation to the installed private CLI](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-c975ae17)
- depends-on: [REQ-DAF21960 — Explicitly update an owned repository Skill installation](repository-scoped-agent-skill-lifecycle.md#req-daf21960)

### Statement <!-- sdd:statement -->

The `sdd` CLI shall update the active user-scoped installation only after an
explicit user-scope update verifies both the existing owned installation and
the executing package's complete replacement payload.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd skill update --scope user` is distinct from install and removal and
  accepts replacement bytes only from the same exact package as the executing
  CLI.
- The updater verifies every existing binding, manifest, inventory, regular
  file, fingerprint, compatibility field, and canonical path before treating
  either user destination as owned.
- An exact existing installation reports `unchanged` without rewriting bytes;
  the same package version with different bytes is a collision and is refused.
- A replacement is staged privately, the active binding is published only for
  a complete verified replacement, and the prior version remains recoverable
  until publication succeeds.
- After successful publication, only the previously bound owned version is
  removed; unrelated Application Support and user Skill content is preserved.
- The version 1 response reports `updated` or `unchanged`, both destinations,
  sorted owned paths, fingerprints, and replacement compatibility identity.

<a id="req-deb23207"></a>

## REQ-DEB23207 — Remove only an owned user-scoped installation

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-778099C0 — Install one exact user-scoped Skill and private CLI](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-778099c0)
- depends-on: [REQ-2B49D454 — Update only an owned user-scoped installation](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-2b49d454)
- depends-on: [REQ-8DC50806 — Explicitly remove only an owned repository Skill installation](repository-scoped-agent-skill-lifecycle.md#req-8dc50806)

### Statement <!-- sdd:statement -->

The `sdd` CLI shall remove a user-scoped installation only after an explicit
user-scope removal verifies every byte owned by its active Skill and private
CLI bindings.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd skill remove --scope user` requires one compatible active installation;
  a missing destination is an error rather than implicit success.
- Before deletion, the command verifies both bindings, exact inventories,
  fingerprints, every regular file byte, canonical paths, and absence of
  undeclared or symbolic-link entries.
- Removal deletes only `~/.agents/skills/sdd-yo` and its bound private CLI
  version directory; no parent is removed merely because it becomes empty.
- Modified, missing, foreign, or ambiguous content causes refusal without
  deletion.
- The version 1 response reports user scope, both destinations, and the sorted
  removed paths from the verified ownership inventories.

<a id="req-c18aee90"></a>

## REQ-C18AEE90 — Fail closed across the user-scoped lifecycle

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-778099C0 — Install one exact user-scoped Skill and private CLI](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-778099c0)
- depends-on: [REQ-2B49D454 — Update only an owned user-scoped installation](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-2b49d454)
- depends-on: [REQ-DEB23207 — Remove only an owned user-scoped installation](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-deb23207)
- depends-on: [REQ-AA165BDE — Fail closed across Skill lifecycle operations](repository-scoped-agent-skill-lifecycle.md#req-aa165bde)
- depends-on: [REQ-1DD46CA9 — Treat repository content as untrusted data](multi-project-cli-and-skill.md#req-1dd46ca9)

### Statement <!-- sdd:statement -->

User-scoped lifecycle operations shall fail closed on unsupported platform,
unsafe paths, foreign ownership, incompatible identity, concurrent change, or
interruption without extending lifecycle authority beyond the two selected
user installation roots.

### Acceptance criteria <!-- sdd:acceptance -->

- Non-macOS execution, unavailable or unsafe user roots, traversal, a symlink
  or non-directory path component, and any resolved source or destination
  outside the exact package, user Skill root, or private CLI root are rejected
  before mutation.
- Existing install destinations, undeclared version entries, incomplete or
  changed bytes, stale bindings, incompatible protocols, and replacement
  mismatches are not treated as overwrite or removal authority.
- Ownership is rechecked immediately before publication or removal; concurrent
  destination changes are preserved and produce stable diagnostics.
- A handled I/O failure or interruption preserves the prior active installation
  byte-for-byte or leaves only private verified recovery state. A later
  explicit lifecycle operation reconciles that state before proceeding.
- Ordinary product commands refuse incomplete recovery state and never trigger
  install, update, removal, repair, or recovery implicitly.
- Every refusal preserves repositories, adjacent user files, package-manager
  state, Git state, specifications, approvals, QA evidence, and publication
  state and makes no network or telemetry request.

<a id="req-50351033"></a>

## REQ-50351033 — Keep user and repository Skill installations independent

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-C975AE17 — Bind every user Skill operation to the installed private CLI](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-c975ae17)
- depends-on: [REQ-05CABE17 — Require an explicit repository for user Skill operations](macos-user-scoped-agent-skill-installation-and-lifecycle.md#req-05cabe17)
- depends-on: [REQ-3F19778B — Install the packaged Skill in one selected repository](repository-scoped-agent-skill-installation.md#req-3f19778b)
- depends-on: [REQ-CF3A1070 — Bind first Skill use to a compatible packaged CLI](repository-scoped-agent-skill-installation.md#req-cf3a1070)

### Statement <!-- sdd:statement -->

User-scoped and repository-scoped `sdd-yo` installations shall remain
independently selectable and shall never merge bindings, infer precedence, or
use one installation as fallback authority for the other.

### Acceptance criteria <!-- sdd:acceptance -->

- Existing `sdd skill install|update|remove --root <repository-root>` behavior
  and `.agents/skills/sdd-yo` repository destinations remain supported without
  `--scope user`.
- The user wrapper resolves only its private binding; the repository wrapper
  resolves only its repository binding or its already-supported explicit
  compatible CLI override.
- Each lifecycle command modifies only its selected scope and neither discovers,
  updates, removes, or repairs the other installation.
- When Codex exposes same-name user and repository Skills together, SDD Yo
  promises no automatic host precedence; the developer explicitly selects the
  intended Skill entry and that entry follows only its own binding.
- A selected user wrapper may operate on a repository containing a separate
  repository-scoped installation without reading or changing that installation.
- Coexisting or dynamically selected user versions remain unsupported; exactly
  one user installation is active.
