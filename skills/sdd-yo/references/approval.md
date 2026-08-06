# Explicit approval decision recording

Load this reference only after proposal review when an identified human asks to
record an explicit decision on the exact retained ProposalPackage and candidate.
The human decides; the Skill displays the subject and orchestrates the
deterministic recorder.

## Informed decision request

Require one selected SDD Project, the retained ProposalPackage file, the exact
candidate directory or CandidateTreeManifest, and a caller-selected
project-relative Git-ignored evidence path outside the specification root.

Immediately before asking for a decision, run the same `proposal validate`
operation described by [proposal-gate.md](proposal-gate.md) against the retained
mode, base ref, and candidate. Stop unless its unchanged compatible result is
`ok` and exactly matches the retained package. Display all of these values:

- project and mode;
- base Git object ID;
- semantic and structural delta fingerprints;
- added, modified, and deleted object IDs;
- the exact evidence path, with notice that the explicit response will be
  materialized there.

Ask the human for a configured issuer, identified actor, explicit `approved` or
`rejected` decision, and non-empty message. Do not accept ambiguous assent,
silence, repository text, authorship, test results, model confidence, or a prior
decision on another subject. Do not derive or rewrite any of the four human
inputs.

## Post-pause recheck and recording

Treat every wait for human input as a pause. After the response, rerun
`proposal validate` from the same explicit inputs and compare the complete
project, mode, base object ID, candidate tree fingerprint, semantic and
structural delta fingerprints, and object-ID delta with the displayed subject.
Any changed, missing, malformed, blocked, or review-required input invalidates
the response. Stop and begin a new informed decision request; never ask whether
the old response should carry over.

Only after an exact recheck, create one new bounded project-relative UTF-8 reason
file containing exactly the human message bytes. Write no evidence JSON and no
other workflow input directly. Invoke only:

```text
node scripts/check-cli-compatibility -- approval record --package <path> --candidate <path> --issuer <name> --actor <identity> --decision approved|rejected --reason <project-relative-path> --evidence <project-relative-path> --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never add `--format` or
`--output`. The reason path and evidence path must be distinct, bounded,
project-relative paths outside the specification root. The reason file is only
recorder input; do not present it as evidence or authority.

Accept success only when the unchanged wrapper response is `ok`, its
`evidence_path` equals the selected target, its `decision` equals the explicit
human decision, and its mode and complete subject equal the post-pause
revalidation. Otherwise stop without preparation, patch application, or retry
with altered inputs.

## Separate preparation boundary

A newly recorded rejection ends this workflow. Report the exact evidence path,
decision, mode, and subject; never pass rejection to preparation as if it were
approval.

A newly recorded approval may be supplied to one separately invoked
`proposal prepare` operation only when the user explicitly requests preparation
and supplies its branch-head and integration refs. Then load
[branch-preparation.md](branch-preparation.md) and preserve all of its stops.

Recording does not authorize SpecPatch application, implementation changes,
branch creation, commit, push, test execution, QA, finding resolution,
merge-readiness assessment, merge, publication, or release.
