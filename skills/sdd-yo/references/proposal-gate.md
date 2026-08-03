# Proposal review

Load this reference only when the user asks to validate or review one proposal.
It does not authorize preparation, approval, semantic analysis, or application.

## Required inputs

Require the selected SDD Project plus:

- exactly one confirmed mode: `spec-code`, `spec`, or `code`;
- an explicit base Git ref;
- an exact candidate directory or CandidateTreeManifest;
- one or more active Requirement IDs for `code`, and no code targets for the
  other modes.

The earlier authoring preview is not CLI input and is not a ProposalPackage.
Do not synthesize deltas, fingerprints, affected scope, or semantic candidates
from prose. If the exact candidate has not been materialized by the authorized
workflow, stop and request that input.

## Deterministic validation

Invoke only through the compatibility wrapper:

```text
node scripts/check-cli-compatibility -- proposal validate --mode <mode> --base <git-ref> --candidate <path> [--code-target <REQ-ID> ...] --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never use both. Keep JSON on
stdout and do not add `--format` or `--output`.

On `status: ok`, present without reinterpretation:

1. project, mode, base ref, base tree, candidate source, and candidate tree;
2. semantic and structural delta fingerprints plus added, modified, and
   deleted object IDs;
3. code targets and affected Requirement and Capability scope;
4. every stable diagnostic;
5. every deterministic semantic candidate with its reason and object IDs.

Describe semantic candidates as relationships requiring review. They are not
Findings, proof of conflict, approval, rejection, or model conclusions. A clean
mechanical ProposalPackage does not prove implementation behavior, accepted
existing behavior, semantic completeness, verification, or merge readiness.

On any other status, preserve the exact diagnostics and stop. Do not repair the
candidate, change mode, create evidence, or continue to preparation.

## Human handoff

Hand the exact retained ProposalPackage and candidate subject to the authorized
human approver. State that branch preparation requires separately supplied,
configured ApprovalEvidence bound to this exact project, mode, base object, and
semantic and structural delta fingerprints. Never format or create that
evidence unless a later authorized workflow supplies both the human decision
and issuer identity.
