---
sdd:
  type: capability
  id: CAP-404305F6
---

# Multi-project CLI and skill integration

## Purpose <!-- sdd:purpose -->

Expose one local, provider-neutral deterministic interface that works in
single projects and monorepos and can be orchestrated safely by an optional
agent skill.

<a id="req-0361538d"></a>

## REQ-0361538D — Scope projects by nearest configuration

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The CLI shall resolve an SDD Project from an explicit `--config` path or the
nearest `.sdd/config.yaml` found upward from the working directory.

### Acceptance criteria <!-- sdd:acceptance -->

- One Git repository may contain multiple SDD Projects.
- Paths in one config resolve relative to that project's configured scope.
- Failure to resolve exactly one project is reported explicitly.

<a id="req-7c848ed0"></a>

## REQ-7C848ED0 — Provide versioned JSON as the automation API

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

Every read operation shall support versioned deterministic JSON, with human
output rendered as a replaceable view over the same result.

### Acceptance criteria <!-- sdd:acceptance -->

- Structured stdout is not mixed with ordinary logs.
- Paths are project-relative and use `/`.
- Stable diagnostic codes are available to automation.
- Unknown newer major schemas are rejected.
