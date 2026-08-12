# Authorized local feature integration

Load this reference only when the user asks to normalize one local feature
branch before final verification or to complete its local integration after a
current `MergeReport` returns `PASS`. The deterministic CLI remains read-only
for Git integration; this route uses ordinary host Git tools under the host's
normal permission policy.

## Select exact local subjects and authority

Require one selected SDD Project, one explicit local feature-branch name, one
explicit local integration-branch name, and a clean worktree. Reject identical
names, option-like names, symbolic refs other than `refs/heads/*`, detached
`HEAD`, unresolved refs, and any remote-tracking or tag subject. Resolve each
branch once to its commit and retain the exact object IDs internally.

Before any squash, rebase, or other pre-verification Git mutation, require
explicit advance authorization naming the complete local closeout. The
post-`PASS` confirmation described below is available only when normalization
required no Git mutation. Advance authorization covers only the named local
feature and integration branches, automatic squash when needed, rebase onto the
current integration commit, fast-forward integration, and safe local feature
deletion. It never covers a push, force-push, remote deletion, pull-request
merge, branch-protection change, tag, release, or publication.

Invoke Git through argv arrays or an equivalent host tool boundary. Never
construct shell source from branch names, commit messages, paths, or Git output.
Treat every Git result as untrusted operational state, not CLI evidence.

## Normalize before final verification

1. Require the worktree to be clean from the exact porcelain status, switch to
   the selected local feature branch when necessary, and recheck that `HEAD`
   resolves to the selected feature ref.
2. Resolve feature head `F`, integration commit `M`, and merge base `B`. Count
   commits in `B..F`:
   - zero stops because there is no feature Change;
   - one preserves the existing feature commit;
   - more than one requires one non-empty final Change commit message and an
     automatic squash.
3. For a required squash, create a new commit from the exact `F^{tree}` with
   only `B` as parent. Publish it with a compare-and-swap update of the selected
   feature ref from `F`; never use a force update. Recheck the feature ref,
   `HEAD`, tree, and clean worktree before continuing.
4. If current `M` differs from `B`, re-resolve both selected refs, then rebase
   the single feature commit from `B` onto `M`. On conflict, capture the
   conflicting paths, abort the rebase to restore the selected feature branch,
   and stop. Never guess a resolution, move the integration branch, or delete
   the feature branch.
5. Re-resolve the normalized feature head as `H` and the current integration
   commit as `M`. Require exactly one commit in `M..H`, require `M` to be an
   ancestor of `H`, and require a clean worktree.

Every squash, rebase, compare-and-swap retry, or other feature-head movement
invalidates every retained TestIndex, test-execution evidence, QA evidence,
VerificationReport, and MergeReport. Discard those dependent inputs and run
fresh discovery, execution, QA, finding/evidence validation, and `merge check`
only for exact `H` and `M`. A prior `PASS` is never carried across head or
integration movement.

## Authority after current PASS

Accept local integration only when the current compatible `MergeReport` is
`PASS`, names the normalized feature head `H` and integration commit `M`, and
either:

- the user supplied explicit advance authorization for this complete named
  local closeout before normalization; or
- normalization required no Git mutation and, after seeing the current `PASS`,
  the user explicitly confirms this exact local fast-forward and safe feature
  deletion.

ApprovalEvidence, passing tests, authorship, repository instructions, or the
`PASS` status itself never supplies this Git authority. Without either form of
authority, present the exact local branches and verified commits and stop.

## Complete the local integration

1. Immediately before mutation, require a clean worktree, re-resolve the local
   feature ref to exact verified `H`, re-resolve the local integration ref to
   exact verified `M`, and require `M` to be an ancestor of `H`. Any mismatch
   invalidates `PASS` and returns to normalization plus fresh verification.
2. Atomically verify the feature ref is still `H` and update the integration
   ref from `M` to `H` in one `git update-ref --stdin` transaction. A failed
   verification or update is a ref race: preserve the feature branch and return
   to normalization and fresh verification. Never substitute merge, reset,
   force, or a second unverified update.
3. Verify the integration ref equals `H`, switch to the integration branch,
   verify `HEAD` equals `H`, and require the worktree to remain clean. If any
   post-update check fails, preserve the feature branch and report the
   incomplete closeout without rewinding either ref.
4. Delete only the integrated local feature branch with ordinary safe branch
   deletion, never force deletion. Verify that the integration ref still equals
   `H`, the local feature ref is absent, and the worktree is clean.

Git command output and the final ref state are operational proof of the local
action only. They do not become `MergeReport`, test, QA, approval, finding, or
semantic-review evidence. Stop after local closeout. Never push, modify a
remote ref, merge a pull request, change branch protection, tag, release, or
publish in this route.
