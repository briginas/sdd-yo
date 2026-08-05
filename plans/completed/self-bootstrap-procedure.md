# Completed self-bootstrap procedure

## Historical status

This document preserves the temporary target-package route and self-bootstrap
procedure that SDD Yo used through its incremental MVP. Milestone 10 retired
both as active repository authority after the deterministic product workflows
and independent contract-fixture verifier existed.

The names, steps, evidence language, and ID-reservation rules below are
historical rationale only. They do not reserve former proposal IDs, create a
current target specification, or authorize an alternate path around the normal
`spec-code`, `spec`, and `code` workflows.

## Archived target-package route

The former package was named **SDD Yo — Target Specification Package**. It
described SDD Yo as a repository-native specification governance system for
humans and coding agents and used these names:

- Product: **SDD Yo**
- Repository: `sdd-yo`
- Provisional CLI binary: `sdd`
- Agent Skill: `sdd-yo`
- Project configuration: `.sdd/config.yaml`

Its promotion rule was:

1. review the target package against the then-current repository state;
2. materialize contract fixtures without claiming runtime behavior;
3. select one bounded target Requirement set;
4. promote only that set into canonical `spec/` in its `spec-code` branch;
5. implement code and Requirement-named tests in the same branch;
6. use the strongest currently implemented checks without fabricating an SDD
   gate result;
7. transition from manual bootstrap validation to advisory self-validation and
   finally normal SDD gates.

The complete target specification was never copied into canonical `spec/`
before its behavior existed. The fifteen definitions remaining when this route
retired, their implementation evidence, and their executed or scheduled
dispositions are preserved in
[`milestone-10-self-bootstrap-retirement.md`](milestone-10-self-bootstrap-retirement.md).

## Archived self-bootstrap and incremental promotion procedure

### Problem

SDD Yo defined canonical `spec/` as implemented, verified behavior. The
repository initially had no implementation and therefore kept the complete
target model outside canonical `spec/`.

This created two temporary bootstrap constraints:

1. the tool could not validate its own first implementation before a validator
   existed;
2. promoting the complete target model at once would falsely make all target
   Requirements canonical.

Bootstrap was a bounded repository procedure, not a permanent SDD workflow
mode. The product modes remained exactly `spec-code`, `spec`, and `code`.

### Invariants preserved during bootstrap

- Root `spec/` never claimed unimplemented behavior.
- Stable IDs were not assigned to two different model objects.
- A target Requirement was promoted with the same ID and intended identity.
- One Requirement had only one editable normative copy after promotion.
- Human review did not masquerade as CLI-generated evidence.
- A missing, incomplete, or crashed bootstrap check was never called a pass.
- Bootstrap granted no branch, commit, push, merge, approval, or QA authority to
  the future CLI.

### Pre-canonical ID reservation

IDs in the former target specification were manually reserved for this
repository before an SDD Project or canonical specification existed. They were
checked for uniqueness inside the target package.

Historical non-reuse applied to model objects previously defined in the
reachable canonical specification history of the same SDD Project. An
arbitrary prose or fixture occurrence of an ID was not a prior object
definition.

The first promotion of a reserved proposal object into this project's
canonical `spec/` was its canonical introduction, not reuse. After that merge,
normal historical non-reuse applied permanently.

If a reserved ID was assigned to a different type or intended object before
promotion, the replacement received a new random ID. Bootstrap never
reinterpreted an ID already promoted to canonical history.

### Incremental promotion

Promotion happened per bounded implementation leaf:

1. choose the exact target Requirements implemented by the leaf;
2. include the smallest required Capability and Concept context;
3. create or update root canonical `spec/` in the same `spec-code` branch;
4. implement the behavior and Requirement-named tests;
5. validate all currently available deterministic checks;
6. obtain human product and QA review for checks the tool could not yet perform;
7. merge only the coherent implemented subset;
8. remove the promoted Requirement from the remaining proposal model so its
   normative content had one editable home.

A proposed Capability container could remain outside canonical scope while
some of its Requirements were unimplemented. The canonical Capability with the
same reserved identity owned only the Requirements already implemented. The
proposal copy was planning material outside `spec.root` and was not parsed into
the active graph.

When the last proposed Requirement for a Capability was promoted, the remaining
proposal Capability document was removed. Concepts followed the same rule:
once promoted, canonical `spec/` was their only normative home.

### Bootstrap validation levels

#### Level B0 — Target package

Available at the start:

- human review;
- Markdown link, ID, anchor, section, and example checks;
- Git review of the exact documentation diff.

No SDD gate artifact existed and no readiness claim was made.

#### Level B1 — Contract fixtures

Stage 0 provided machine-readable schemas, fixtures, truth tables, and a
repository verifier. These checks validated contracts but were not the product
CLI.

#### Level B2 — Read-only core

The first `validate` and `inspect` implementation promoted only the
Requirements it satisfied. Independent tests ran against Stage 0 fixtures.
Human review confirmed the initial canonical subset.

#### Level B3 — Self-validation

After config discovery, Markdown parsing, graph validation, canonicalization,
and deterministic JSON were stable, SDD Yo validated its own canonical
specification in CI. Bootstrap scripts remained as independent regression
oracles until equivalent product coverage was demonstrated.

#### Level B4 — Advisory full gate

After proposal, adapter, evidence, finding, and merge modules existed, SDD Yo
produced advisory MergeReports for itself. The report was not branch protection
until existing-project dogfood and security evals passed.

#### Level B5 — Normal operation

External policy could require `PASS` for governed scope. Bootstrap exceptions
were closed; all subsequent behavior changes used the normal modes and gates.

### Evidence language

Bootstrap records could say:

```text
reviewed manually
validated by bootstrap verifier
validated by partial read-only core
validated by advisory merge gate
```

They could not say:

```text
SDD PASS
full merge gate passed
complete project governed
```

until the named implementation existed and produced the matching current
artifact.

### Exit criteria

Bootstrap completed when:

- canonical `spec/` was validated by the released deterministic core;
- historical ID checks included all canonical project history;
- every active automated Requirement had discovered executable tests;
- affected manual Requirements and Capabilities had current QA evidence;
- proposal, conflict, evidence, and merge checks could produce a current
  advisory MergeReport;
- remaining behavior was handled through ordinary incremental Changes, not
  bootstrap exceptions.
