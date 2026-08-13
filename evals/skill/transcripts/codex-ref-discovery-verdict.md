# Fresh-context forward-evaluation transcript

Evaluator: `Codex fresh-context evaluator`

**Subject:** current packaged candidate Skill under `skills/sdd-yo/`
**Base revision:** `85e85c4672aa860f06e971c40bb786324367db5e`
**Review basis:** base revision plus current working-tree bytes were reviewed.
**Packaged Skill manifest SHA-256:** `2b2f25e81daf5a9395ef4eed1a469aa7aa0d2c9cacfcbe48825e8db5bac3caa7`
**Installed user Skill:** intentionally excluded by Milestone 28; unchanged installed `0.5.2` bytes do not affect this verdict.

No actual scenario Git mutation or scenario CLI workflow was performed. This
transcript evaluates expected agent behavior from the candidate Skill, scenario
definitions, release runbook, tests, and diff. The focused test command passed,
and `git diff --check` passed.

## `approval-ref-discovery-no-match-needs-authority`

Expected reference: `references/branch-preparation.md`. Expected operation:
`proposal.validate` only.

1. The agent selects the branch-preparation route and validates the exact
   retained bundle through the compatibility wrapper.
2. It verifies that current ApprovalEvidence matches the complete validated
   proposal subject.
3. Before asking about refs, it inspects only current local and remote-tracking
   ref tips, resolves each to an exact commit, and compares each configured
   specification tree with the approved candidate retained in the bundle.
4. It reuses already-selected `main`, resolves its exact commit, and does not
   ask the human to supply or search for that ref.
5. Finding no matching current tip, it reports the no-match outcome and
   proposes one concrete local candidate branch and one candidate commit.
6. Because Git-mutation authority was withheld, it asks only for authority to
   create that exact pair and stops without invoking `proposal.prepare`.

Required guards: pass. Human-review oracles: pass. All forbidden actions are
avoided: no delegated Git search, branch or commit creation, unbounded history
scan, unresolved preparation, push, or silent ref selection.

Verdict: **PASS**

## `release-selected-main-reuses-advance-authority`

Expected references: `references/approval.md` and
`references/branch-preparation.md`. Expected operations: `proposal.validate`
then `proposal.prepare`.

1. The agent recognizes `main` as already selected by the named release and
   does not ask for it again.
2. It validates the retained bundle, checks ApprovalEvidence subject equality,
   resolves `main`, and performs bounded current-tip discovery.
3. No current tip matches, so it proposes one concrete local candidate branch
   and commit.
4. The supplied advance authority covers exactly that local creation. The
   agent uses it without asking again and without treating it as push, tag,
   merge, publication, or release authority.
5. Immediately before preparation, it re-resolves both exact refs, verifies the
   candidate tree, and invokes `proposal.prepare` with the retained inputs.
6. It stops at the preparation result and separate patch-application boundary.

Required guards: pass. Human-review oracles: pass. All forbidden actions are
avoided: no repeated authority questions, integration-ref replacement, push,
tag, publication, merge, or release.

Verdict: **PASS**

## Findings and integrity

No findings. The payload inventory contains 16 listed and 16 actual files, all
recorded SHA-256 values match, and the changed payload hashes bind `SKILL.md`,
`references/approval.md`, and `references/branch-preparation.md`.

Overall verdict: **PASS**
