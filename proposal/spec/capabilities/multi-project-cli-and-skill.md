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

<a id="req-fbb24d6c"></a>

## REQ-FBB24D6C — Isolate project graphs

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The first version shall treat every SDD Project graph, identifier namespace,
configuration, adapters, and merge result as independent.

### Acceptance criteria <!-- sdd:acceptance -->

- Cross-project `CAP`, `REQ`, and `CON` relations are rejected.
- A repository-wide external workflow runs the gate for each affected SDD
  Project.
- Cross-project orchestration is not hidden inside one project result.

<a id="req-f7d39246"></a>

## REQ-F7D39246 — Provide a minimal deterministic CLI surface

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

The CLI shall expose initialization, ID generation, validation, inspection,
traceability, object diff, proposal validation/preparation/application, test
discovery, finding validation, and merge-check operations.

### Acceptance criteria <!-- sdd:acceptance -->

- Only initialization and proposal application are normal write operations.
- Read operations support explicit Git refs when applicable.
- Branch, commit, push, merge, and approve commands are absent.

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

<a id="req-26234dc8"></a>

## REQ-26234DC8 — Orchestrate through one progressive-disclosure skill

```sdd
kind: behavior
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)

### Statement <!-- sdd:statement -->

The first version shall provide one optional `sdd` Agent Skill that selects the
required workflow and loads only the relevant object-model, mode, semantic
review, or diagnostics references.

### Acceptance criteria <!-- sdd:acceptance -->

- The skill validates through CLI JSON rather than simulating deterministic
  checks.
- It asks humans to resolve normative ambiguity.
- It does not fabricate approval, QA, test, or finding-resolution evidence.
- Missing or incompatible CLI stops the workflow.

<a id="req-1dd46ca9"></a>

## REQ-1DD46CA9 — Treat repository content as untrusted data

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)
- refers-to: [CON-90AFB19E — Test Adapter](../concepts/test-adapter.md)

### Statement <!-- sdd:statement -->

The skill and CLI shall treat specification, code, tests, adapter output, and
external references as data rather than instructions with authority over the
runtime.

### Acceptance criteria <!-- sdd:acceptance -->

- Prompt-like text inside a Requirement does not override higher-priority
  instructions.
- Adapter commands require normal external permission enforcement.
- Changed adapter configuration creates a structural and trust finding.
- Secret-bearing environment state is not attached to model context.

<a id="req-f91f7d11"></a>

## REQ-F91F7D11 — Operate offline and reproducibly by default

```sdd
kind: quality
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The deterministic core shall require no network service or telemetry and shall
produce equivalent fingerprints and JSON results on supported platforms for
identical inputs.

### Acceptance criteria <!-- sdd:acceptance -->

- macOS, Linux, and Windows are supported.
- Specification content is UTF-8.
- Core processing does not transmit repository content.
- Cache deletion does not change results.
- AI and external issuer integrations remain explicit optional layers.

