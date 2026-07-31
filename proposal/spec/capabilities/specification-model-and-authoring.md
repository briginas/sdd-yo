---
sdd:
  type: capability
  id: CAP-79E22870
---

# Specification model and authoring

## Purpose <!-- sdd:purpose -->

Represent implemented product behavior as a human-readable, machine-validatable
graph of Documents, Capabilities, Requirements, and Domain Concepts.

<a id="req-8acbc52d"></a>

## REQ-8ACBC52D — Separate normative and explanatory content

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../../../spec/concepts/requirement.md)

### Statement <!-- sdd:statement -->

Requirement statement, acceptance criteria, and constraints shall be
normative, while title, rationale, examples, purpose, and general introduction
shall be explanatory.

### Acceptance criteria <!-- sdd:acceptance -->

- Explanatory changes do not alter the Requirement semantic fingerprint.
- A prohibition or unsupported behavior is expressed as a constraint
  Requirement rather than only as a non-goal.
- Human-visible headings may use any language while machine markers remain
  fixed.

<a id="req-a44eb430"></a>

## REQ-A44EB430 — Keep normative behavior repository-local

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../../../spec/concepts/requirement.md)

### Statement <!-- sdd:statement -->

A Requirement shall not delegate its only normative definition to an
unversioned external resource.

### Acceptance criteria <!-- sdd:acceptance -->

- Supporting external links are permitted.
- Versioned standards may be cited.
- An external URL in a normative section creates a quality finding.
- Local structural validation does not require network access.

<a id="req-24c14972"></a>

## REQ-24C14972 — Remove inactive objects from canonical content

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-2C550D5B — Capability](../../../spec/concepts/capability.md)
- refers-to: [CON-9F69CC0E — Requirement](../../../spec/concepts/requirement.md)
- refers-to: [CON-88F1C731 — Domain Concept](../../../spec/concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

Canonical specification content shall contain only active Capabilities,
Requirements, and Domain Concepts; removed objects shall remain discoverable
only through Git history.

### Acceptance criteria <!-- sdd:acceptance -->

- Removed objects are absent from the entrypoint and active graph.
- Removed IDs remain reserved permanently.
- Deletion validates dependents, inbound Concept relations, test references,
  and approved semantic scope.

