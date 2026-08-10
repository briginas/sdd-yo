---
sdd:
  type: capability
  id: CAP-6C317966
---

# Repository-scoped Agent Skill lifecycle

## Purpose <!-- sdd:purpose -->

Let a developer explicitly update or remove one selected repository-scoped
`sdd-yo` Agent Skill installation without treating an existing destination as
implicit overwrite permission or changing an adjacent repository.

<a id="req-daf21960"></a>

## REQ-DAF21960 — Explicitly update an owned repository Skill installation

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-3F19778B — Install the packaged Skill in one selected repository](repository-scoped-agent-skill-installation.md#req-3f19778b)
- depends-on: [REQ-CF3A1070 — Bind first Skill use to a compatible packaged CLI](repository-scoped-agent-skill-installation.md#req-cf3a1070)
- depends-on: [REQ-A2199BC2 — Bind every public and offline packaged surface to the compatibility identity](public-npm-package-distribution.md#req-a2199bc2)

### Statement <!-- sdd:statement -->

The `sdd` CLI shall update one existing repository-scoped `sdd-yo` Skill only
when a developer invokes an explicit update command for the selected Git
repository root and both the installed and replacement payloads pass their
applicable ownership and compatibility checks.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd skill update --root <repository-root>` requires an explicit existing Git
  repository root and selects only `.agents/skills/sdd-yo` beneath that root.
- The updater verifies the existing installation binding, its declared payload
  fingerprint, exact file inventory, and every declared file fingerprint before
  treating the installation as owned; an older package version is eligible only
  when its package and Skill names and protocol compatibility remain valid.
- The updater independently verifies the executing package's replacement
  payload and compatibility identity before changing the installed destination.
- A valid replacement is copied to private staging state under the selected
  repository, then published as one complete installation with a binding to the
  replacement package and CLI; partially copied replacement bytes are never
  exposed at `.agents/skills/sdd-yo`.
- When the installed and replacement payloads and bindings are already exact,
  the command reports an unchanged result without rewriting them.
- The version 1 response reports whether the installation was updated or
  unchanged, the selected destination, sorted owned paths, payload fingerprint,
  and replacement compatibility identity.

<a id="req-8dc50806"></a>

## REQ-8DC50806 — Explicitly remove only an owned repository Skill installation

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-3F19778B — Install the packaged Skill in one selected repository](repository-scoped-agent-skill-installation.md#req-3f19778b)
- depends-on: [REQ-DAF21960 — Explicitly update an owned repository Skill installation](repository-scoped-agent-skill-lifecycle.md#req-daf21960)

### Statement <!-- sdd:statement -->

The `sdd` CLI shall remove a repository-scoped `sdd-yo` Skill only when a
developer invokes an explicit removal command for the selected Git repository
root and every removed byte belongs to the verified compatible installation.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd skill remove --root <repository-root>` requires an explicit existing Git
  repository root and selects only `.agents/skills/sdd-yo` beneath that root.
- Before removal, the command verifies the installation binding, compatibility,
  exact declared inventory, payload fingerprint, and every regular file byte;
  missing, modified, symbolic-link, or undeclared entries cause refusal without
  deletion.
- A successful command removes the verified installation directory and no
  parent, sibling, SDD Project, package-manager, or Git content.
- A missing destination is an error rather than implicit success, and install,
  update, and removal remain distinct commands with distinct authority.
- The version 1 response reports the selected destination and sorted removed
  paths from the verified ownership inventory.

<a id="req-aa165bde"></a>

## REQ-AA165BDE — Fail closed across Skill lifecycle operations

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-A0456614 — Refuse unsafe or implicit Skill installation](repository-scoped-agent-skill-installation.md#req-a0456614)
- depends-on: [REQ-DAF21960 — Explicitly update an owned repository Skill installation](repository-scoped-agent-skill-lifecycle.md#req-daf21960)
- depends-on: [REQ-8DC50806 — Explicitly remove only an owned repository Skill installation](repository-scoped-agent-skill-lifecycle.md#req-8dc50806)
- depends-on: [REQ-1DD46CA9 — Treat repository content as untrusted data](multi-project-cli-and-skill.md#req-1dd46ca9)

### Statement <!-- sdd:statement -->

Skill lifecycle operations shall fail closed on stale ownership, unsafe paths,
incompatible identities, concurrent destination changes, or interruption, and
shall not use lifecycle authority outside the explicitly selected repository.

### Acceptance criteria <!-- sdd:acceptance -->

- Update and removal reject a missing or non-root selection, path traversal, a
  symbolic-link or non-directory destination component, and any resolved path
  outside the selected repository.
- A missing, malformed, incompatible, or stale installation binding; changed
  payload byte; undeclared entry; or replacement-package mismatch is rejected
  without treating the destination as overwrite or removal authority.
- The operation rechecks ownership immediately before publication or removal;
  a concurrently changed destination is preserved and produces a stable
  diagnostic rather than being overwritten or deleted.
- A handled I/O failure or interruption preserves the previously published
  installation byte-for-byte. Any private staging or recovery entry contains
  only verified lifecycle bytes and is reconciled before a later explicit
  lifecycle operation proceeds.
- Refusal and recovery preserve sentinels inside the selected repository but
  outside the owned lifecycle entries, and preserve every byte in adjacent
  repositories.
- Lifecycle commands do not invoke product commands or a package manager, make
  a network request, install globally, mutate `.sdd` or `spec`, change package
  manifests or lockfiles, or create Git, approval, QA, or marketplace effects.
- Ordinary product commands remain offline and never trigger Skill installation,
  update, removal, or lifecycle recovery implicitly.
