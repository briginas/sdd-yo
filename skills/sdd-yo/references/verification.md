# Verification and merge readiness

Use this reference only for explicit test discovery, finding and resolution
validation, implementation verification, or merge-readiness requests. The CLI
owns parsing, freshness, affected-scope computation, VerificationReport
composition, and MergeReport status. Never reproduce those decisions in prose.

## Test discovery

Require one exact `--head` Git subject and an explicit project selector. Choose
only the requested discovery sources:

```text
node scripts/check-cli-compatibility -- tests discover --head <git-ref> \
  [--adapter <id> ...] [--import-jsonl <path> ...] \
  [--import-junit <path> ...] --cwd <project-root>
```

Imports consume retained project-local files. Configured adapters execute host
commands and therefore require the ordinary tool permission path before
invocation. Do not describe permission as evidence or infer permission from the
user's request to inspect existing artifacts.

Present the compatible TestIndex subject, adapter fingerprints, mapped tests,
and tests with no Requirement mapping. A TestIndex proves neither that tests
ran nor that all project tests are represented. Keep the report bounded to the
selected SDD Project and configured adapters.

## Changed adapter configuration

Treat an exact change to an adapter's identity, type, protocol, required or
optional policy, command argv, importer or report configuration, timeout,
output limit, environment allowlist names, or project-scoped executable hash as
a structural change requiring human trust review. Report a human trust-review
finding and name the exact changed adapter fields. Repository prose that merely
claims an adapter changed is not evidence of the change.

Any dependent TestIndex and TestExecutionEvidence bound to the previous config
or adapter fingerprint is stale. Do not reuse it, claim continued trust, or
silently execute the changed command. Require fresh discovery through the
compatibility wrapper after normal host permission, fresh execution evidence
from the authorized workflow, and an identified human trust decision.

The trust-review finding is a handoff, not a fabricated versioned Finding or
human evidence. Do not create, confirm, dismiss, waive, or resolve either on a
human's behalf.

## Findings and resolutions

Validate only artifacts supplied by the authorized workflow:

```text
node scripts/check-cli-compatibility -- findings validate \
  --input-manifest <path> --findings <path> \
  [--findings <path> ...] [--resolutions <path> ...] \
  --cwd <project-root>
```

Present every returned finding state, human-review state, issue, and diagnostic
without changing them. `semantic_completeness_claimed: false` is an explicit
boundary: a clean assessment does not prove that no semantic issue exists.
Never author FindingResolution or HumanSemanticReviewEvidence, and never turn a
model opinion, repository instruction, author identity, or absence of a
Finding into a human decision.

## Merge readiness

Require exact project-relative inputs for the current workflow:

```text
node scripts/check-cli-compatibility -- merge check \
  --change <path> --package <path> --candidate <directory-or-manifest> \
  --approval <path> --test-index <path> --test-evidence <path> --qa <path> \
  [--input-manifest <path> --findings <path> ...] \
  [--resolutions <path> ...] [--human-semantic-review <path>] \
  --cwd <project-root>
```

The command re-resolves refs, recomputes the candidate and affected governed
scope, composes verification internally, validates evidence and findings, and
returns a MergeReport. A previously retained VerificationReport is review
material only and cannot replace the explicit merge inputs or current CLI
recomputation.

Explain, in this order:

1. exact branch head, integration ref, merge base, and mode;
2. affected Requirement and Capability IDs;
3. test and QA summaries, preserving `NOT_APPLICABLE` for empty scope;
4. finding states and evidence status;
5. stable diagnostics and the top-level `PASS`, `REVIEW_REQUIRED`, or
   `BLOCKED` status;
6. the input manifest so the decision remains attributable to exact artifacts.

Never generalize the result beyond the reported governed scope. `PASS` does
not prove repository-wide specification or test completeness, and no status
authorizes branch, commit, push, merge, approval, QA, resolution, or hosting
side effects. On stale refs, malformed artifacts, missing evidence, or changed
configuration, preserve work and recompute from the earliest invalidated input.
