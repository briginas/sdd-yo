# Markdown dialect

## Base syntax

Files are UTF-8 CommonMark/GFM-compatible Markdown with YAML frontmatter,
fenced `sdd` metadata blocks, and HTML comment markers. Visible headings and
content may use any natural language. Machine keys, object kinds, modes, and
markers remain stable English tokens.

## Index document

```markdown
---
sdd:
  type: index
---

# Product specification

## Capabilities <!-- sdd:capabilities -->

- [CAP-1234ABCD — Archiving](capabilities/archiving.md)

## Concepts <!-- sdd:concepts -->

- [CON-1234ABCD — Project](concepts/project.md)
```

The configured entrypoint is the only `index` document. Both marked sections
are required and may be empty.

## Capability and fragment documents

Capability root:

```markdown
---
sdd:
  type: capability
  id: CAP-1234ABCD
---
```

Fragment:

```markdown
---
sdd:
  type: capability-fragment
  capability: CAP-1234ABCD
---
```

When fragments exist, the capability root contains:

```markdown
## Documents <!-- sdd:fragments -->

- [Archiving](archiving.md)
- [Restoration](restoration.md)
```

The root and every fragment may contain Requirement blocks. A fragment must be
reachable from its capability root.

## Requirement block

````markdown
<a id="req-1234abcd"></a>

## REQ-1234ABCD — Project can be archived

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-1234ABCD — Project](../concepts/project.md)
- depends-on: [REQ-5678EFAB — User is authorized](authorization.md#req-5678efab)

### Statement <!-- sdd:statement -->

An authorized user shall be able to archive an active project.

### Acceptance criteria <!-- sdd:acceptance -->

- The project leaves the active list.
- Project data remains available.

### Constraints <!-- sdd:constraints -->

- The operation requires archive permission.

### Rationale <!-- sdd:rationale -->

Archiving hides inactive work without deleting it.

### Examples <!-- sdd:examples -->

Archiving a completed internal project.
````

Required:

- stable anchor;
- H2 Requirement heading;
- immediately following `sdd` metadata fence;
- `kind`;
- `verification`;
- `statement`;
- at least one acceptance criterion.

Optional:

- relations;
- constraints;
- rationale;
- examples.

The Requirement block ends at the next H2 heading or end of file. Requirements
cannot nest.

## Concept document

```markdown
---
sdd:
  type: concept
  id: CON-1234ABCD
---

# Project

## Definition <!-- sdd:definition -->

...

## Identity <!-- sdd:identity -->

...

## States <!-- sdd:states -->

...

## Relations <!-- sdd:relations -->

- relates-to: [CON-5678EFAB — User](user.md)

## Rationale <!-- sdd:rationale -->

...

## Examples <!-- sdd:examples -->

...
```

`definition` is required. Identity, states, and relations are optional semantic
or structural inputs. Rationale and examples are explanatory.

## Link rules

- Graph links are relative Markdown links.
- A graph-link label contains the target full ID.
- Capability and Concept targets match file frontmatter.
- Requirement targets use the exact lowercase anchor derived from ID.
- Display-title mismatch is a warning.
- ID, type, path, or anchor mismatch is an error.
- Supporting links outside `spec/` do not become graph edges.

## Reserved metadata

Requirement kinds:

```text
behavior
invariant
constraint
quality
```

Verification modes:

```text
automated
manual
```

Permanent Requirement relations:

```text
refers-to
depends-on
```

The directed Requirement `depends-on` graph must be acyclic.

Permanent Concept relation:

```text
relates-to
```

Transient relations such as conflicts, replacement, implementation, test
coverage, and workflow state are not serialized into canonical Markdown.
