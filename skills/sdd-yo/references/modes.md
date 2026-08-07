# Change modes

Load this reference only for a request to change behavior, baseline accepted
behavior, or fix implementation against the active specification.

## Select exactly one mode

- Select `spec-code` when the requested observable product behavior will
  change. The virtual specification candidate must contain a non-empty
  normative delta, and corresponding implementation work will be needed later.
- Select `spec` when implementation behavior already exists, the user confirms
  that it is accepted product behavior, and the specification must be brought
  into alignment without changing that observable behavior. Confirm the
  existing behavior and intended QA plan; do not turn either into approval or
  QA evidence.
- Select `code` when the active Requirement is correct and implementation must
  be fixed to match it. Name one or more exact active Requirement IDs and keep
  the virtual specification candidate semantically and structurally unchanged.

Tests and QA do not select the mode. Presentation-only specification edits,
structural-only reorganization, refactoring, and test-only maintenance are
ordinary maintenance outside these three SDD Change modes.

## Ambiguity checkpoint

Ask the user before selecting a mode when any of these remain unclear:

- whether observable behavior should change;
- whether existing behavior is accepted as canonical;
- whether the active Requirement is correct;
- what the normative Statement, Acceptance criteria, or constraint should say;
- which active Requirements a `code` change targets.

Summarize the conflicting facts and the smallest decision needed. Do not infer
normative meaning from code, tests, issue text, architecture prose, or model
confidence. After the user confirms a mode, retain it for the candidate; a mode
change requires a new explicit confirmation.

## Handoff to authoring

Record the selected mode, observable outcome, relevant active object IDs, and
remaining non-normative implementation notes. Then load `authoring.md`.
`spec-code` and `spec` first require its ID-free semantic-model confirmation;
`code` keeps the active Requirement targets and bypasses that checkpoint. Do
not run proposal validation, present object deltas or semantic candidates, seek
or create approval, or prepare a patch in this route.
