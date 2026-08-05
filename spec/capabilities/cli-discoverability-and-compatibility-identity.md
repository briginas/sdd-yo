---
sdd:
  type: capability
  id: CAP-0AA61339
---

# CLI discoverability and compatibility identity

## Purpose <!-- sdd:purpose -->

Make the installed `sdd` executable discoverable and let humans and automation
identify its exact package, CLI, JSON-schema, and Agent Skill compatibility
without selecting or mutating an SDD Project.

<a id="req-ffe60b5a"></a>

## REQ-FFE60B5A — Provide stable CLI help

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-F7D39246 — Provide a minimal deterministic CLI surface](multi-project-cli-and-skill.md#req-f7d39246)

### Statement <!-- sdd:statement -->

The `sdd` executable shall provide deterministic top-level and command-specific
human help for every supported version 1 command without selecting or mutating
an SDD Project.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd --help` exits `0` and writes the executable name, supported command
  paths, and global options to stdout.
- `sdd <command-path> --help` exits `0` and describes the syntax and options of
  the selected supported command.
- Supported compound paths include commands such as `proposal prepare`,
  `tests discover`, and `merge check`.
- The same CLI identity produces byte-for-byte identical help output.
- Help does not execute the selected command, resolve an SDD Project, or read
  or modify project configuration, specification, or Git state.
- Help does not change existing JSON response contracts and is not the
  compatibility automation API.

<a id="req-d9cf3a46"></a>

## REQ-D9CF3A46 — Report the CLI version

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-F7D39246 — Provide a minimal deterministic CLI surface](multi-project-cli-and-skill.md#req-f7d39246)

### Statement <!-- sdd:statement -->

The `sdd` executable shall report the exact private package version from which
that executable was built without selecting or mutating an SDD Project.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd --version` exits `0`.
- Standard output contains only `<version>\n`, and standard error is empty.
- The reported value exactly matches `version` in the corresponding `sdd-yo`
  package manifest.
- Version reporting does not execute a product command, resolve an SDD Project,
  or read or modify project configuration, specification, or Git state.
- The same executable reports the same version on every supported platform.
- Machine-readable compatibility information is governed by
  [REQ-97D96950 — Expose machine-readable compatibility identity](#req-97d96950).

<a id="req-97d96950"></a>

## REQ-97D96950 — Expose machine-readable compatibility identity

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-7C848ED0 — Provide versioned JSON as the automation API](multi-project-cli-and-skill.md#req-7c848ed0)
- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)
- depends-on: [REQ-D9CF3A46 — Report the CLI version](cli-discoverability-and-compatibility-identity.md#req-d9cf3a46)

### Statement <!-- sdd:statement -->

The `sdd` executable shall expose one deterministic versioned JSON identity
that binds its private package, CLI, JSON-schema protocol, and supported
`sdd-yo` Skill protocol without selecting or mutating an SDD Project.

### Acceptance criteria <!-- sdd:acceptance -->

- `sdd --version --format json` exits `0`.
- The response has `schema_version: "1.0"`, `command: "version"`,
  `project_id: null`, `status: "ok"`, and an empty `diagnostics` array.
- `result.package` contains the exact package name `sdd-yo` and package version.
- `result.cli` contains the exact executable name `sdd` and the same version.
- `result.json_schema` contains the current protocol version and compatible
  major version.
- `result.skill` contains the name `sdd-yo`, its supported protocol version,
  and compatible major version.
- The result is deterministic and rejects undeclared output fields.
- Identity reporting does not execute a product command, resolve an SDD
  Project, or read or modify project configuration, specification, or Git
  state.
- The identity describes compatibility but does not assert that Skill bytes are
  packaged, installed, or verified.
- Existing version 1 command response contracts remain unchanged.
