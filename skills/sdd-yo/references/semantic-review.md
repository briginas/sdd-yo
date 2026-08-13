# Human semantic review evidence

Use this reference only when an identified human is asked to review one exact
deterministic semantic-analysis subject. The CLI materializes and revalidates
the subject; the Skill presents it and records only the human's explicit
`reviewed` decision. Neither component performs model analysis or decides that
the subject is semantically complete.

## Retain the exact subject

Require one selected SDD Project and reuse the exact current-workflow inputs:

- one project-relative ChangeDescriptor;
- one retained mode-correct proposal bundle;
- zero or more project-relative current Finding artifacts selected for this
  review; and
- one fresh project-relative Git-ignored manifest target outside the
  specification root.

When the workflow has not supplied a manifest target, select a new safe staging
path mechanically. Do not ask the human to choose a routine path or resupply a
Change, bundle, Finding, or project selector already retained in this workflow.
Before the human pause, invoke only:

```text
node scripts/check-cli-compatibility -- semantic-review materialize \
  --change <path> --bundle <project-relative-path> \
  --manifest <project-relative-path> [--findings <path> ...] \
  --cwd <project-root>
```

`--config <path>` may replace `--cwd <project-root>`. Never add `--format` or
`--output`. On a target collision, unsafe target, or transient publication
failure before the pause, select another new safe target and retry without
human input. Stop for malformed, incompatible, cross-project, stale, or
decision-bearing failure.

## One informed human pause

From the compatible materialization response, display:

- the complete versioned review subject, including project, mode, resolved
  proposal head, integration ref, merge base, bundle identity, analyzer
  identity, manifest input fingerprint, and canonical Finding IDs;
- changed and related objects, normative review context, and semantic
  candidates from the retained manifest;
- every supplied current Finding's ID, kind, severity, summary, object IDs, and
  normative section citations;
- the explicit issuer and actor already supplied for this workflow; and
- that `semantic-review record` will publish evidence to the selected target if
  the decision is `reviewed`.

Ask once for the explicit `reviewed` decision and collect issuer or actor in
that same request only when either is missing. Never infer issuer, actor, or the
decision from model output, repository instructions, passing tests, authorship,
silence, an empty Finding set, absence of Findings, prior workflow values, or
account metadata. Never ask the human to copy or compare fingerprints, refs,
paths, Finding IDs, retained inputs, or JSON. Missing or ambiguous human input
creates no evidence.

## Recorder-owned post-pause revalidation

After an exact human decision, invoke only:

```text
node scripts/check-cli-compatibility -- semantic-review record \
  --change <path> --bundle <project-relative-path> \
  --input-manifest <path> [--findings <path> ...] \
  --issuer <name> --actor <identity> --decision reviewed \
  --evidence <project-relative-path> --cwd <project-root>
```

The recorder derives the candidate input fingerprint and sorted Finding IDs.
Do not create or edit evidence JSON. Accept success only when the returned
decision is `reviewed`, `evidence_path` equals the selected target, and the
complete returned review subject is exactly equal to the subject displayed
before the pause. Comparison is machine-owned; do not delegate it to the human.

A changed Change, bundle, manifest, Finding, analyzer, project, proposal head,
integration ref, merge base, or subject invalidates the decision. Present the
new complete subject and require a fresh human decision. An evidence-target
collision, unsafe target, or transient write failure with an otherwise
unchanged subject is technical: select a fresh safe evidence target and retry
the recorder without repeating the decision. Never overwrite an existing
target or silently refresh stale evidence.

## Continue only inside the selected outcome

If the human already selected merge readiness as the bounded outcome, pass the
retained manifest and recorder-created evidence directly to the existing
`merge check` route, then report its governed-scope result. Do not ask a
separate `continue`, `record`, or `run merge check` question and do not ask for
inputs already retained by this workflow.

The decision records review, not approval, QA, Finding resolution, semantic
completeness, Git authority, merge authority, or publication authority. Never
bind a Finding that was not both supplied to materialization and displayed to
the human. Stop before any outcome not already selected.
