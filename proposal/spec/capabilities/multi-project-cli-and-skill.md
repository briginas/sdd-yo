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

<a id="req-fbb24d6c"></a>

## REQ-FBB24D6C — Isolate project graphs

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The first version shall treat every SDD Project graph, identifier namespace,
configuration, adapters, and merge result as independent.

### Acceptance criteria <!-- sdd:acceptance -->

- Cross-project `CAP`, `REQ`, and `CON` relations are rejected.
- A repository-wide external workflow runs the gate for each affected SDD
  Project.
- Cross-project orchestration is not hidden inside one project result.

<a id="req-f91f7d11"></a>

## REQ-F91F7D11 — Operate offline and reproducibly by default

```sdd
kind: quality
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../../../spec/concepts/sdd-project.md)

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
