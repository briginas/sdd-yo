# Self-bootstrap and incremental promotion

## Problem

SDD Yo defines canonical `spec/` as implemented, verified behavior. The
repository currently has no implementation and therefore keeps the complete
target model under `proposal/spec/`.

This creates two temporary bootstrap constraints:

1. the tool cannot validate its own first implementation before a validator
   exists;
2. promoting the complete target model at once would falsely make all target
   Requirements canonical.

Bootstrap is a bounded repository procedure, not a permanent SDD workflow mode.
The product modes remain exactly `spec-code`, `spec`, and `code`.

## Invariants preserved during bootstrap

- Root `spec/` never claims unimplemented behavior.
- Stable IDs are not assigned to two different model objects.
- A target Requirement is promoted with the same ID and intended identity.
- One Requirement has only one editable normative copy after promotion.
- Human review does not masquerade as CLI-generated evidence.
- A missing, incomplete, or crashed bootstrap check is never called a pass.
- Bootstrap grants no branch, commit, push, merge, approval, or QA authority to
  the future CLI.

## Pre-canonical ID reservation

IDs in `proposal/spec/` are manually reserved for this repository before an
SDD Project or canonical specification exists. They are checked for uniqueness
inside the target package.

Historical non-reuse applies to model objects previously defined in the
reachable canonical specification history of the same SDD Project. An
arbitrary prose or fixture occurrence of an ID is not a prior object
definition.

The first promotion of a reserved proposal object into this project's
canonical `spec/` is its canonical introduction, not reuse. After that merge,
normal historical non-reuse applies permanently.

If a reserved ID is assigned to a different type or intended object before
promotion, the replacement receives a new random ID. Bootstrap must never
reinterpret an ID already promoted to canonical history.

## Incremental promotion

Promotion happens per bounded implementation leaf:

1. choose the exact target Requirements implemented by the leaf;
2. include the smallest required Capability and Concept context;
3. create or update root canonical `spec/` in the same `spec-code` branch;
4. implement the behavior and Requirement-named tests;
5. validate all currently available deterministic checks;
6. obtain human product and QA review for checks the tool cannot yet perform;
7. merge only the coherent implemented subset;
8. remove the promoted Requirement from the remaining proposal model so its
   normative content has one editable home.

A proposed Capability container may remain outside canonical scope while some
of its Requirements are unimplemented. The canonical Capability with the same
reserved identity owns only the Requirements already implemented. The
proposal copy is planning material outside `spec.root` and is not parsed into
the active graph.

When the last proposed Requirement for a Capability is promoted, remove the
remaining proposal Capability document. Concepts follow the same rule: once
promoted, canonical `spec/` is their only normative home.

## Bootstrap validation levels

### Level B0 — Target package

Available now:

- human review;
- Markdown link, ID, anchor, section, and example checks;
- Git review of the exact documentation diff.

No SDD gate artifact exists and no readiness claim is made.

### Level B1 — Contract fixtures

Stage 0 provides machine-readable schemas, fixtures, truth tables, and a
repository verifier. These checks validate contracts but are not the product
CLI.

### Level B2 — Read-only core

The first `validate` and `inspect` implementation promotes only the
Requirements it satisfies. Independent tests run against Stage 0 fixtures.
Human review confirms the initial canonical subset.

### Level B3 — Self-validation

After config discovery, Markdown parsing, graph validation, canonicalization,
and deterministic JSON are stable, SDD Yo validates its own canonical
specification in CI. Bootstrap scripts remain as independent regression
oracles until equivalent product coverage is demonstrated.

### Level B4 — Advisory full gate

After proposal, adapter, evidence, finding, and merge modules exist, SDD Yo
produces advisory MergeReports for itself. The report is not branch protection
until existing-project dogfood and security evals pass.

### Level B5 — Normal operation

External policy may require `PASS` for governed scope. Bootstrap exceptions are
closed; all subsequent behavior changes use the normal modes and gates.

## Evidence language

Bootstrap records may say:

```text
reviewed manually
validated by bootstrap verifier
validated by partial read-only core
validated by advisory merge gate
```

They must not say:

```text
SDD PASS
full merge gate passed
complete project governed
```

until the named implementation exists and produced the matching current
artifact.

## Exit criteria

Bootstrap completes when:

- canonical `spec/` is validated by the released deterministic core;
- historical ID checks include all canonical project history;
- every active automated Requirement has discovered executable tests;
- affected manual Requirements and Capabilities have current QA evidence;
- proposal, conflict, evidence, and merge checks can produce a current advisory
  MergeReport;
- remaining target behavior is handled through ordinary incremental Changes,
  not bootstrap exceptions.
