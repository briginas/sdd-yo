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

- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)

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

<a id="req-dd91ad0f"></a>

## REQ-DD91AD0F — Use one complete specification entrypoint

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)
- refers-to: [CON-2C550D5B — Capability](../concepts/capability.md)
- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

Every SDD Project shall have one configured index Document that lists every
active Capability and Domain Concept exactly once.

### Acceptance criteria <!-- sdd:acceptance -->

- The index uses the `sdd:capabilities` and `sdd:concepts` section markers.
- Empty lists are permitted during incremental initialization.
- Requirements are reached through their owning Capabilities rather than
  listed globally.

<a id="req-8602bf02"></a>

## REQ-8602BF02 — Type every specification document

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)

### Statement <!-- sdd:statement -->

Every Markdown file inside the configured specification root shall declare one
supported document type in YAML frontmatter.

### Acceptance criteria <!-- sdd:acceptance -->

- Supported types are `index`, `capability`, `capability-fragment`, and
  `concept`.
- Unknown types block validation.
- A Document path is not treated as stable semantic identity.

<a id="req-0ef66b28"></a>

## REQ-0EF66B28 — Compose Capabilities from Requirements

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-2C550D5B — Capability](../concepts/capability.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)

### Statement <!-- sdd:statement -->

A Capability shall be identified by one `CAP-XXXXXXXX` object and composed of
Requirements contained in its root Document or reachable fragments.

### Acceptance criteria <!-- sdd:acceptance -->

- One Requirement has exactly one owning Capability.
- A fragment belongs to exactly one Capability.
- Moving a Requirement between fragments of the same Capability is
  presentational.
- Moving a Requirement between Capabilities is structural.

<a id="req-eac56cb1"></a>

## REQ-EAC56CB1 — Represent Requirements as addressable blocks

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- refers-to: [CON-77D857DB — Document](../concepts/document.md)

### Statement <!-- sdd:statement -->

Each Requirement shall be an independently addressable second-level Markdown
block with a stable ID, stable anchor, metadata, normative sections, and
optional explanatory sections.

### Acceptance criteria <!-- sdd:acceptance -->

- `kind` and `verification` metadata are present.
- `sdd:statement` and `sdd:acceptance` sections are present.
- A lowercase anchor derived from the Requirement ID immediately precedes the
  heading.
- Nested Requirements are rejected.

<a id="req-065a9911"></a>

## REQ-065A9911 — Classify normative obligations

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)

### Statement <!-- sdd:statement -->

Every Requirement shall declare exactly one kind from `behavior`, `invariant`,
`constraint`, or `quality`.

### Acceptance criteria <!-- sdd:acceptance -->

- Unknown kinds block validation.
- Kind remains one classification field rather than separate Requirement
  object types.
- Changing kind changes the structural fingerprint.

<a id="req-40a38ba1"></a>

## REQ-40A38BA1 — Define reusable domain vocabulary

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)

### Statement <!-- sdd:statement -->

The specification shall represent significant reusable domain vocabulary as
stable Domain Concepts with definitions and optional identity, state, and
relation sections.

### Acceptance criteria <!-- sdd:acceptance -->

- One Concept Document defines one `CON-XXXXXXXX`.
- Verifiable rules about a Concept remain Requirements.
- A Requirement may omit `refers-to` when no meaningful reusable Concept
  exists.

<a id="req-8d157ebe"></a>

## REQ-8D157EBE — Use active graph relations only

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

The permanent specification graph shall contain only active ownership,
`refers-to`, `depends-on`, and Concept `relates-to` relations.

### Acceptance criteria <!-- sdd:acceptance -->

- `conflicts-with`, `supersedes`, split history, implementation links, and test
  links are not persisted as canonical graph edges.
- Every active relation resolves to an active object of the required type.
- Deleting a Requirement with active dependents is blocked.

<a id="req-99605fab"></a>

## REQ-99605FAB — Use portable Markdown links

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)

### Statement <!-- sdd:statement -->

Specification navigation and graph relations shall use ordinary relative
Markdown links whose labels include the target stable ID.

### Acceptance criteria <!-- sdd:acceptance -->

- Capability and Concept links resolve to files whose frontmatter contains the
  labeled ID.
- Requirement links resolve to the stable lowercase anchor derived from the
  labeled ID.
- A stale display title is a warning; an ID or target mismatch is an error.
