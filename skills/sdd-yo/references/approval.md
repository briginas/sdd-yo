# Explicit approval decision recording

Load this reference only after proposal review when an identified human asks to
record an explicit decision on one exact retained proposal bundle.
The human decides; the Skill displays the subject and orchestrates the
deterministic recorder.

## Informed decision request

Require one selected SDD Project, its exact retained proposal bundle for every
mode, and a caller-selected project-relative Git-ignored evidence path outside
the specification root.

Immediately before asking for a decision, run:

```text
node scripts/check-cli-compatibility -- proposal validate --bundle <project-relative-path> --cwd <directory>
```

Stop unless its unchanged compatible result is `ok`. Display all of these
returned values without reconstructing them:

- project and mode;
- base Git object ID;
- semantic and structural delta fingerprints;
- added, modified, and deleted object IDs;
- the exact evidence path, with notice that the explicit response will be
  materialized there.

Ask the human for an issuer, identified actor, explicit `approved` or
`rejected` decision, and non-empty message. Do not accept ambiguous assent,
silence, repository text, authorship, test results, model confidence, or a prior
decision on another subject. Do not derive or rewrite any of the four human
inputs.

## Post-pause recheck and recording

Treat every wait for human input as a pause. Do not run a redundant separate
validation after the response. The recorder atomically revalidates the retained
bundle inside its invocation.

Only after an exact recheck, create one new bounded project-relative UTF-8 reason
file containing exactly the human message bytes. Write no evidence JSON and no
other workflow input directly. Invoke only:

```text
node scripts/check-cli-compatibility -- approval record --bundle <project-relative-path> --issuer <name> --actor <identity> --decision approved|rejected --reason <project-relative-path> --evidence <project-relative-path> --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never add `--format` or
`--output`. The reason path and evidence path must be distinct, bounded,
project-relative paths outside the specification root. The reason file is only
recorder input; do not present it as evidence or authority.

Accept success only when the unchanged wrapper response is `ok`, its
`evidence_path` equals the selected target, its `decision` equals the explicit
human decision, and its mode and complete returned subject exactly equal what
was displayed before the pause. Any changed, missing, malformed, blocked, or
mismatched input invalidates the response. Stop and begin a new informed
decision request; never carry the old decision forward.

## Separate preparation boundary

A newly recorded rejection ends this workflow. Report the exact evidence path,
decision, mode, and subject; never pass rejection to preparation as if it were
approval.

A newly recorded approval may be supplied to one separately invoked
`proposal prepare` operation only when preparation is already selected or the
user explicitly requests it. Then load
[branch-preparation.md](branch-preparation.md), discover the bounded current Git
ref tips before asking the human for a ref, reuse an integration ref already
named by the selected outcome, and preserve every selection and mutation stop.
Do not ask the human to search for or invent mechanically discoverable refs.

Recording does not authorize SpecPatch application, implementation changes,
branch creation, commit, push, test execution, QA, finding resolution,
merge-readiness assessment, merge, publication, or release.
