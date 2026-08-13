# Virtual candidate authoring

Load this reference only after `modes.md` has produced one explicitly confirmed
mode for an existing, validated SDD Project.

## Retrieve the bounded source

1. Read the configured specification entrypoint and use `inspect` or `trace`
   only for the objects directly relevant to the requested outcome.
2. Preserve the exact current bytes of every specification file that is not
   intentionally changed. Do not omit an unchanged file from the logical
   candidate tree.
3. Separate normative Statement, Acceptance criteria, constraints, Concept
   definition, identity, states, and permanent relations from explanatory
   purpose, rationale, examples, and implementation guidance.

## Confirm the semantic model before identities

For `spec-code` and `spec`, present one complete human-readable model of the
future specification before generating any new object identity:

1. Name every proposed Capability without a new ID. Under each Capability, name
   its proposed Requirements and give one short normative meaning for each.
2. Show dependencies, boundaries, exclusions, and disputed decisions. An
   unresolved disputed decision keeps the checkpoint unconfirmed.
3. Use a short nested list only for one Capability without inter-object
   dependencies or disputed alternatives. Otherwise use a vertical top-to-bottom
   diagram; use Mermaid `flowchart TD` when the host renders Mermaid and a
   vertical text diagram otherwise.
4. Existing active object IDs may appear only as context. Do not assign an ID to
   any proposed Capability, Requirement, or Concept in this model.
5. Ask for explicit confirmation of the complete displayed model and stop. Do
   not call `id`, read or expand a Markdown template, draft or materialize a
   candidate, write a file, or create any SDD artifact before confirmation.
6. Treat every correction or other model change as invalidating the prior
   confirmation. Present the complete updated model and require fresh explicit
   confirmation before continuing.

This confirmation is an authoring checkpoint only. It is not ApprovalEvidence
and grants no Proposal Gate, SpecPatch, implementation, QA, or Git authority.
For `code`, skip this section and proceed with the exact active Requirement IDs
selected in `modes.md` without drafting a normative specification change.

## Generate confirmed identities

Only after explicit confirmation of the unchanged `spec-code` or `spec` model,
generate all new object IDs before drafting and only through the compatibility
wrapper with the selected project:

```text
node scripts/check-cli-compatibility -- id capability --count <n> --cwd <directory>
node scripts/check-cli-compatibility -- id requirement --count <n> --cwd <directory>
node scripts/check-cli-compatibility -- id concept --count <n> --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never use both. Accept IDs
only when the unchanged version 1 response has `status: ok`, the selected
project ID, unique correctly prefixed candidates, and `history.status:
unchecked` with `resolved_ref: null`. Never invent or repair an ID. `code` generates no specification object IDs.

## Draft by mode

For `spec-code` and `spec`:

- start from the complete current specification tree;
- use `templates/capability.md` for a new Capability with its first Requirement
  and `templates/concept.md` for a new Domain Concept;
- replace every template token with confirmed content and CLI-generated IDs;
- remove unused optional sections together with their template tokens;
- update the index, fragment lists, relative links, lowercase Requirement
  anchors, metadata, relations, and owning Capability as required;
- include complete exact content for every added or changed file and explicit
  deletion paths; retain every other file byte-for-byte;
- ensure each Requirement has one Statement and at least one testable
  Acceptance criterion. Put prohibitions in a constraint Requirement or a
  normative Constraints section, not only in explanatory prose.

For `code`:

- identify the exact active Requirement targets through `inspect`;
- preserve the complete specification tree byte-for-byte;
- draft no normative specification edits, even if a code change seems easier
  after changing the contract;
- if the active contract is wrong or incomplete, stop and return to mode
  selection for an explicitly confirmed `spec-code` change.

## Candidate preview

Present one unapplied preview containing:

1. selected mode and observable outcome;
2. active object targets and every CLI-generated ID;
3. added, changed, deleted, and unchanged specification paths;
4. full exact proposed content for each added or changed file;
5. `code` Requirement targets when applicable;
6. unresolved human decisions, or an explicit statement that none remain.

This preview is a logical complete virtual candidate, not a ProposalPackage or
gate result. Do not write it into the active specification or implementation,
materialize a candidate directory or manifest, run proposal validation, compute
object deltas, perform semantic review, prepare or apply a SpecPatch, or create
evidence. Those actions belong to later routes.
