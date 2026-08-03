# Object model

Load this reference only for understanding an existing SDD Project.

## Normative objects

- A Capability (`CAP-XXXXXXXX`) owns observable product purpose and zero or
  more Requirements.
- A Requirement (`REQ-XXXXXXXX`) carries one normative Statement and testable
  Acceptance criteria. Treat Purpose, Rationale, and Notes as non-normative.
- A Domain Concept (`CON-XXXXXXXX`) defines shared domain vocabulary.
- The active entrypoint is the configured specification index, normally
  `spec/README.md`. Follow only links needed to answer the request.

## Read operations

Use the compatibility wrapper with one explicit selector:

```text
node scripts/check-cli-compatibility -- validate --cwd <directory>
node scripts/check-cli-compatibility -- inspect REQ-XXXXXXXX --cwd <directory>
node scripts/check-cli-compatibility -- trace REQ-XXXXXXXX --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never use both.

- `validate` establishes that the active graph is readable and valid.
- `inspect` returns the selected object's normative fields, owning document,
  direct relations, and fingerprints.
- `trace` returns graph ancestry and dependency relations. Without an explicit
  TestIndex it provides no test mapping or coverage conclusion.

Keep object IDs, paths, relation types, diagnostic codes, and fingerprints
exactly as reported. Do not infer objects or relationships that the CLI did not
return.
