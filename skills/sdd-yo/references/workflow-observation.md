# Automatic spec-code workflow observation

Load this reference only after one existing SDD Project and `spec-code` mode
have been selected. Observation is an inseparable producer sidecar for that
route, but it grants no authority and never replaces an owning workflow result.

## Initialize or resume exactly one run

Before the first project validation for a newly selected `spec-code` workflow,
invoke `journal create` through the compatibility wrapper with the selected
project, mode `spec-code`, and producer `sdd-yo-skill`. Retain only the exact
returned tuple:

- project selector, journal path, run, producer, and pre-Change identity;
- next sequence and journal fingerprint; and
- current deterministic snapshot and partial-start checkpoint when present.

Display the journal path and run identity. Do not ask for observation opt-in or
create another journal for the retained run. Across a human pause, retry, or
agent turn, invoke `journal resume` with that exact tuple and current explicit
workflow subject. Never reconstruct it from chat, logs, file names, prompts,
reasoning, elapsed time, or repository searches.

For a previously started unobserved workflow, create one new run with the exact
current stage as its partial checkpoint. Earlier stages remain explicitly
unobserved; never backfill them.

## Publish typed boundaries

Invoke `journal publish` with the exact retained tuple, expected sequence,
expected journal fingerprint, and typed allowlisted event fields. Accept only
the unchanged compatible response for the same project, journal, run,
producer, and subject. Replace the retained cursor only from that response.
An exact duplicate response is idempotent.

The stable stage order is:

1. `workflow-initialization`
2. `semantic-model`
3. `specification-candidate`
4. `proposal-decision`
5. `exact-specification-patch`
6. `implementation`
7. `verification-and-review`
8. `local-integration`
9. `terminal-outcome`

Publish only at actual boundaries:

- validation belongs to workflow initialization;
- model presentation and confirmation wait belong to semantic model;
- IDs, candidate authoring, and successful proposal materialization belong to
  specification candidate;
- exact proposal display, decision wait, and recorder response belong to
  proposal decision;
- preparation, application wait, and exact apply response belong to exact
  specification patch;
- scoped implementation start, interruption, failure, and completion belong to
  implementation;
- test discovery, retained evidence, review waits, findings validation, and
  merge check belong to verification and review;
- local integration is not requested unless that route was selected, and only
  checked Git results may change it; and
- terminal completion means the selected bounded outcome completed, never only
  that a patch applied, tests passed, or merge readiness is `PASS`.

Use waiting events for semantic confirmation, proposal approval or rejection,
patch application, semantic review, adapter trust review, and local Git
authority. Waiting reports the boundary without supplying the decision.
Optional branches remain visible as skipped or not requested.

Update CLI, approval, readiness, freshness, artifact, and integration axes only
from their owning compatible deterministic result. One axis never completes a
stage or implies another axis.

## Failure isolation

A journal operation that is missing, incompatible, malformed, stale,
conflicting, or unsuccessful is an observation failure. Report it and preserve
the last retained tuple, but continue or stop solely according to the owning
workflow operation and its existing authority boundary. Never retry by
renumbering, merging, repairing, or rewriting journal events.

Automatic production applies only to `spec-code`. `spec`, `code`, onboarding,
initiative planning, understand, diagnose, release, and repository-maintenance
routes create no automatic journal.
