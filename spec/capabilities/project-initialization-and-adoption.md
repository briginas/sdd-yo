---
sdd:
  type: capability
  id: CAP-0B417FC4
---

# Project initialization and adoption

## Purpose <!-- sdd:purpose -->

Initialize SDD Yo in new or existing repositories without overwriting project
content.

<a id="req-382bbbd6"></a>

## REQ-382BBBD6 — Initialize an SDD Project

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)
- refers-to: [CON-77D857DB — Document](../concepts/document.md)

### Statement <!-- sdd:statement -->

The CLI shall initialize an SDD Project by creating a configuration file,
specification entrypoint, capability directory, and concept directory without
creating a Git branch or commit.

### Acceptance criteria <!-- sdd:acceptance -->

- Initialization creates `.sdd/config.yaml`.
- Initialization creates `spec/README.md`, `spec/capabilities/`, and
  `spec/concepts/`.
- Existing unrelated files are preserved.
- An existing conflicting SDD Project is not overwritten.
