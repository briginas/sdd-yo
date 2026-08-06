# Branch preparation and exact patch application

Load this reference only after proposal review when the user asks to prepare an
approved proposal or explicitly apply the resulting exact SpecPatch.

## Prepare without writing

Require all of these explicit retained inputs:

- the ProposalPackage file;
- the exact candidate directory or CandidateTreeManifest bound by the package;
- branch-head and integration Git refs;
- current project-relative ApprovalEvidence when approval is expected.

Before preparation, verify that the explicit branch-head ref resolves to a
commit whose configured specification tree contains the exact approved
candidate. A dedicated feature branch is the normal development arrangement,
but it is not a protocol requirement: commit identity, not the branch name, is
authoritative. If no suitable branch or commit exists, stop and request
separate user authorization to create the branch or commit. Never create either
as an implied preparation side effect.

Never infer a human decision, synthesize ApprovalEvidence, change the approved
mode, or choose replacement refs. ApprovalEvidence recorded by the separate
explicit decision route is acceptable only when it is current for these exact
inputs. Invoke preparation only through:

```text
node scripts/check-cli-compatibility -- proposal prepare --package <path> --candidate <path> --branch-head <git-ref> --integration-ref <git-ref> [--approval <project-relative-path> ...] --cwd <directory>
```

`--config <path>` may replace `--cwd <directory>`. Never add `--format` or
`--output`.

Present the exact status, diagnostics, ConflictReport refs, mechanical
conflicts, semantic candidates, and input fingerprint. Preserve the CLI's
distinction:

- `ok` with a non-null SpecPatch permits an application offer;
- `review_required` or a null patch requires human resolution and recomputation;
- `blocked` requires replacement or regenerated explicit inputs;
- `error` is a technical failure, not a gate conclusion.

Do not rewrite a ConflictReport candidate as a Finding or claim that
preparation completed semantic review. Never offer a patch copied from prose,
human output, an earlier response, or a response whose current status is not
`ok`.

## Explicit application stop

Before any write, show the exact SpecPatch project, base and result tree
fingerprints, and path-sorted create, replace, and delete operations. Ask the
user to select this exact patch for application. Preparation approval alone is
not patch-application authorization.

Only after that explicit selection, invoke the unchanged retained patch file:

```text
node scripts/check-cli-compatibility -- proposal apply --patch <path> [--worktree <path>] --cwd <directory>
```

Do not edit, combine, partially apply, fuzz, force, or retry the patch against
changed inputs. On success, report only the exact `applied_paths` and
`result_tree_fingerprint` returned by compatible JSON. On any other status,
preserve user work and stop.

Application creates no authority for a branch, commit, push, ApprovalEvidence,
test execution, QA decision, verification result, or merge-readiness check.
