# Branch preparation and exact patch application

Load this reference only after proposal review when the user asks to prepare an
approved proposal or explicitly apply the resulting exact SpecPatch.

## Prepare without writing

Require these retained inputs for `spec-code` or `spec`:

- the exact retained proposal bundle;
- current project-relative ApprovalEvidence when approval is expected; and
- any integration ref already explicitly selected by the bounded outcome.

Before Git discovery, run `proposal validate` through the compatibility wrapper
against the exact retained bundle and stop unless its unchanged response is
`ok`. Require the current ApprovalEvidence to name the same project, mode, base
object, candidate tree, object-ID delta, code targets, and semantic and
structural delta fingerprints returned by that validation. Do not reconstruct
or repair either subject. The later `proposal prepare` invocation remains the
authority that atomically revalidates the approval and current refs together.

Before asking the human for a ref, inspect only the selected repository's
current local and remote-tracking ref tips without changing the index,
worktree, refs, or retained artifacts. Resolve each discovered tip to one exact
commit and compare that commit's configured specification tree with the exact
approved candidate retained in the bundle. Do not perform an unbounded history
search or delegate this mechanically discoverable Git inspection to the human.

Reuse an integration ref already explicitly named by the selected outcome and
resolve it to its exact current commit instead of asking for its name again. If
the outcome did not select one, present the bounded discovered refs and retain
the human's explicit integration-ref selection. When exactly one suitable
candidate ref remains, retain it as the proposed branch head. When more than
one suitable candidate ref remains, present their exact ref names and resolved
commits and require explicit selection; never choose a replacement ref
silently.

When no current ref resolves to a commit whose configured specification tree
equals the exact approved candidate, state that exact outcome. Propose one
concrete local branch name and one candidate commit, then request authorization
for that exact branch and commit only when it was not already supplied in
advance. Approval, preparation, and read-only inspection do not authorize this
mutation. Advance authority for a bounded named outcome may cover only its
listed Git mutations; it never implies push. Never create a branch or commit as
an implicit preparation side effect.

Immediately before preparation, re-resolve the selected branch-head and
integration refs to exact commits and verify again that the branch-head's
configured specification tree contains the exact approved candidate. A
dedicated feature branch is the normal development arrangement, but it is not
a protocol requirement: commit identity, not the branch name, is authoritative.

Never infer a human decision, synthesize ApprovalEvidence, change the approved
mode, choose replacement refs, or broaden Git authority. ApprovalEvidence
recorded by the separate explicit decision route is acceptable only when it is
current for this exact bundle. Invoke preparation only through:

```text
node scripts/check-cli-compatibility -- proposal prepare --bundle <project-relative-path> --branch-head <git-ref> --integration-ref <git-ref> [--approval <project-relative-path> ...] --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never add `--format` or
`--output`.

For `code`, do not prepare a patch: the approved bundle proceeds directly to
separately authorized implementation verification. A preparation request for a
`code` bundle is rejected; it must never produce an empty SpecPatch.

Retain the exact status, diagnostics, ConflictReport, and SpecPatch internally.
Preserve the CLI's distinction, while presenting it by default as follows:

- for `ok` with a non-null SpecPatch, derive one to three short points from the
  confirmed semantic model and validated normative base-to-candidate delta;
  state the behavior that changes and its user-visible or governance
  consequence, then ask whether to apply the prepared change;
- for `review_required` or a null patch, state that review or recomputation is
  required and name the next decision concisely;
- for `blocked`, state the blocking outcome and required replacement or
  regeneration decision concisely;
- for `error`, state that preparation could not complete and name the bounded
  corrective decision without treating it as a gate conclusion.

If the semantic model and validated delta do not support one clear description,
ask for clarification rather than inventing intent. The default presentation
does not expose patch content, paths, operations, diffs, hashes, fingerprints,
conflicts, diagnostics, or unchanged-scope lists. On explicit request, present
the retained technical details. Viewing them does not authorize application.

Do not rewrite a ConflictReport candidate as a Finding or claim that
preparation completed semantic review. Never offer a patch copied from prose,
human output, an earlier response, or a response whose current status is not
`ok`.

## Explicit application stop

Before any write, present only the prepared semantic behavior-and-consequence
summary. Ask the user to select this exact patch for application without
displaying its technical details by default. Preparation approval and viewing
technical details do not authorize application.
If the user explicitly asks for technical details, present the retained exact
SpecPatch project, base and result tree fingerprints, and path-sorted create,
replace, and delete operations, then repeat the separate application question.

Only after that explicit selection, invoke the unchanged retained patch file:

```text
node scripts/check-cli-compatibility -- proposal apply --patch <path> [--worktree <path>] --cwd <directory>
```

Do not edit, combine, partially apply, fuzz, force, or retry the patch against
changed inputs. On success, report only the concise behavior-and-consequence
result by default. Give the exact `applied_paths` and `result_tree_fingerprint`
only on explicit request. On any other status, preserve user work and stop.

Application creates no authority for a branch, commit, push, ApprovalEvidence,
test execution, QA decision, verification result, or merge-readiness check.
