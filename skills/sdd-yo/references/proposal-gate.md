# Proposal review

Load this reference only when the user asks to validate or review one proposal.
It does not authorize preparation, approval, semantic analysis, or application.

## Required inputs

Require the selected SDD Project plus:

- exactly one confirmed mode: `spec-code`, `spec`, or `code`;
- an explicit base Git ref;
- one new caller-selected ignored bundle path;
- a complete authored candidate for `spec-code` or `spec`, either supplied as
  an exact caller-owned directory or materialized by the Skill from the
  confirmed complete virtual candidate;
- one or more active Requirement IDs and no authored candidate for `code`.

The earlier authoring preview is not CLI input and is not a ProposalPackage.
Do not synthesize deltas, fingerprints, affected scope, or semantic candidates
from prose. If the exact candidate has not been supplied and the confirmed
virtual candidate is unavailable, stop and request that input.

## External temporary candidate lifecycle

For `spec-code` and `spec`, when the Skill materializes the candidate itself:

1. Create one fresh directory with a secure host temporary-directory primitive.
   On macOS use a randomized directory below `/private/tmp`; on another
   supported host use its system temporary root. Never create the owned source
   candidate inside the selected repository.
2. Record the exact directory and that the Skill owns it in the active
   workflow. This ownership marker is conversational orchestration state, not a
   file, artifact, or hidden workflow database.
3. Copy the selected project's exact `.sdd/config.yaml` and complete current
   `spec/**` tree into that directory, then apply only the confirmed authored
   changes. Reject a symbolic-link or path escape. Supply the exact directory
   only as `--candidate`; the bundle and every retained artifact remain new,
   ignored, project-relative paths.
4. After the unchanged wrapper response is compatible and `status: ok`, and it
   identifies the fixed `<bundle>/candidate-tree.json` member, remove the
   Skill-owned source directory. The retained bundle becomes the only candidate
   input for every downstream operation.
5. On `blocked`, `error`, malformed, incompatible, or interrupted
   materialization, preserve the Skill-owned directory, report its exact path,
   and stop before approval or any downstream gate.
6. When the user explicitly cancels this candidate or confirms a replacement
   semantic model, remove the obsolete Skill-owned directory. If cleanup fails,
   report its exact remaining path. A cleanup failure after successful bundle
   publication does not invalidate that retained bundle.

Never remove a caller-supplied candidate or any directory whose Skill ownership
is not established by this active workflow. `code` mode creates no authored
candidate and no external candidate directory.

## Deterministic validation

Invoke only through the compatibility wrapper:

```text
node scripts/check-cli-compatibility -- proposal materialize --mode spec-code|spec --base <git-ref> --candidate <path> --bundle <path> --cwd <directory>
node scripts/check-cli-compatibility -- proposal materialize --mode code --base <git-ref> --code-target <REQ-ID> ... --bundle <path> --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never use both. Keep JSON on
stdout and do not add `--format` or `--output`.

On `status: ok`, retain the exact returned package path and the candidate path
when present. Present without reinterpretation:

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
human approver. State that branch preparation requires configured
ApprovalEvidence bound to this exact project, mode, base object, and semantic
and structural delta fingerprints. Stop here unless the human separately asks
to record an explicit decision. That route loads `approval.md`; it must display
and recheck the subject and may invoke the recorder only with the supplied
issuer, actor, decision, and exact human message.
