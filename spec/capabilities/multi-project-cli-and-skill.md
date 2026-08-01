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

<a id="req-24073d4f"></a>

## REQ-24073D4F — Query the active specification graph

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-2C550D5B — Capability](../concepts/capability.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

The CLI shall query one validated active specification graph by stable object
identity and report deterministic forward and reverse graph relationships
without executing tests.

### Acceptance criteria <!-- sdd:acceptance -->

- `inspect` reports direct inbound active relations with relation type and
  source object ID.
- `trace` reports a selected Requirement's owning Capability, the transitive
  closure of its outgoing and incoming `depends-on` relations, and direct
  objects that refer to the selected object.
- Capability and Domain Concept ancestry and dependency closures are empty.
- The selected object is excluded from dependency closures, and every set-like
  result is sorted by canonical object ID.
- Graph-only `trace` succeeds without a TestIndex and reports neither mapped
  tests nor test-coverage conclusions.
- Unknown or inactive object IDs produce a stable non-passing diagnostic.
