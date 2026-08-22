# Automatic Change workflow observation

Load this reference only after one existing SDD Project and either `spec-code`
or `code` mode have been selected. Observation is an inseparable producer
sidecar for that route, but it grants no authority and never replaces an owning
workflow result. `spec` and non-Change routes remain unobserved.

## Initialize or resume exactly one run

For a newly selected `spec-code` workflow, before the first project validation
invoke `journal create` through the compatibility wrapper with the selected
project, mode `spec-code`, and producer `sdd-yo-skill`.

For a newly selected `code` workflow, first validate the project and resolve
the selected base Git object and every exact active Requirement target. Bind
each target as the canonical CodeTarget returned for that base: Requirement ID,
semantic fingerprint, and structural fingerprint. Then invoke `journal create`
with mode `code`, producer `sdd-yo-skill`, that resolved base object, and the
complete ordered CodeTarget set. Do not initialize from unvalidated IDs, an
unresolved ref name, or targets reconstructed from chat.

Retain only the exact returned tuple:

- project selector, journal path, run, producer, mode, and pre-Change identity;
- for `code`, the resolved base object and complete canonical CodeTarget set;
- next sequence and journal fingerprint; and
- current deterministic snapshot and partial-start checkpoint when present.

Display the journal path and run identity. Do not ask for observation opt-in or
create another journal for the retained run. Across a human pause, retry, or
agent turn, invoke `journal resume` with that exact tuple and current explicit
workflow subject. For `code`, resume must supply the unchanged resolved base
and canonical CodeTarget set; any base, target, or fingerprint drift is a
subject mismatch, not a request to repair the retained journal. Never
reconstruct the tuple from chat, logs, file names, prompts, reasoning, elapsed
time, or repository searches.

For a previously started unobserved workflow, create one new run with the exact
current stage as its partial checkpoint. Earlier stages remain explicitly
unobserved; never backfill them.

## Publish typed boundaries

Invoke `journal publish` with the exact retained tuple, expected sequence,
expected journal fingerprint, and typed allowlisted event fields. Accept only
the unchanged compatible response for the same project, journal, run,
producer, and subject. Replace the retained cursor only from that response.
An exact duplicate response is idempotent.

The stable `spec-code` stage order is:

1. `workflow-initialization`
2. `semantic-model`
3. `specification-candidate`
4. `proposal-decision`
5. `exact-specification-patch`
6. `implementation`
7. `verification-and-review`
8. `local-integration`
9. `terminal-outcome`

The stable `code` stage order is:

1. `workflow-initialization`
2. `code-proposal`
3. `proposal-decision`
4. `implementation`
5. `verification-and-review`
6. `local-integration`
7. `terminal-outcome`

Publish only at actual boundaries shared by the selected mode:

- validation belongs to workflow initialization; for `code`, exact resolved
  base and CodeTarget binding completes that stage;
- exact proposal display, decision wait, and recorder response belong to
  proposal decision;
- scoped implementation start, interruption, failure, and completion belong to
  implementation;
- test discovery, retained execution or QA evidence, invalidated-evidence
  refresh, review waits, findings validation, and merge check belong to
  verification and review;
- local integration is not requested unless that route was selected, and only
  checked Git results may change it; and
- terminal completion means the selected bounded outcome completed, never only
  that a proposal was approved, tests passed, or merge readiness is `PASS`.

For `spec-code`, model presentation and confirmation wait belong to semantic
model; IDs, candidate authoring, and successful candidate-and-package
materialization belong to specification candidate; and preparation,
application wait, and exact apply response belong to exact specification patch.

For `code`, successful package-only ProposalPackage materialization belongs to
code proposal. The specification remains unchanged: do not publish or invent a
semantic-model, object-ID generation, authored-candidate,
specification-candidate, branch-preparation, exact-specification-patch,
SpecPatch preparation, or SpecPatch application stage.

Use waiting events only for real human boundaries. Both modes may wait for the
proposal decision, semantic review, adapter trust review, or local Git
authority; `spec-code` may additionally wait for semantic confirmation and
patch application. Waiting reports the boundary without supplying the
decision. Optional branches remain visible as skipped or not requested.

Update CLI, approval, readiness, freshness, artifact, and integration axes only
from their owning compatible deterministic result. One axis never completes a
stage or implies another axis. In particular, implementation changes
invalidate dependent evidence without changing proposal approval, and refreshed
evidence does not imply merge readiness or local integration.

## Failure isolation

A journal operation that is missing, incompatible, malformed, stale,
conflicting, or unsuccessful is an observation failure. Report it and preserve
the last retained tuple, but continue or stop solely according to the owning
workflow operation and its existing authority boundary. Never retry by
renumbering, merging, repairing, or rewriting journal events.

Automatic production applies only to `spec-code` and `code`. `spec`,
onboarding, initiative planning, understand, diagnose, release, and
repository-maintenance routes create no automatic journal.
