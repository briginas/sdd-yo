# SDD Yo implementation plan

## Status

- Active: Milestone 23 — authorized local feature integration
- Complete: Milestones 0–22 and public `sdd-yo@0.5.1`
- Last updated: 2026-08-12

## Authority and navigation

- Implemented product behavior: [`spec/README.md`](spec/README.md)
- Architecture and implementation boundaries:
  [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Execution-planning and closeout procedure:
  [`plans/README.md`](plans/README.md)
- Repository work discipline and validation: [`AGENTS.md`](AGENTS.md)

## Product baseline

SDD Yo is an offline-first, repository-native specification-governance system:
a deterministic TypeScript library, the `sdd` CLI and versioned JSON protocols,
language-independent test adapters, exact approval-bound workflow artifacts,
and an optional progressive-disclosure `sdd-yo` Agent Skill.

The version 1 library, CLI, schemas, proposal and exact-patch workflow, evidence
composition, findings validation, merge readiness, governed-scope integration,
repository-scoped Skill route, and macOS user-scoped Skill with a bound private
CLI are implemented and verified. Normal `spec-code` and `spec` Changes retain
one candidate-and-package bundle. A Skill-owned authored candidate is created
outside the repository through the host temporary boundary and removed after
successful bundle retention; failures preserve it, caller-owned candidates are
not removed, and `code` creates no candidate directory. `code` retains one
package-only bundle and performs no specification-patch ceremony. Proposal
validation, approval recording, preparation, and merge checks consume the exact
retained bundle; superseded `0.4.x` handoff routes are absent.

Exact `sdd-yo@0.5.1` is public on npm from annotated tag `v0.5.1` at commit
`877c25c5f76cb7002eccb9ebbad7ddecb81d6f45`. Its registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`58d63d00103b06ef70539256bafd18b3faac5fb62dc4ba9d1bc52d9f0141dc8c`,
inventory SHA-256
`db26f2f8520dee2e2717039e771ddd666b11edeaf9814fd77676b4b09c1f646d`,
and 2,138 entries. npm trusted publishing records SLSA provenance for the
GitHub Actions `publish.yml` subject. The public package, CLI identity, library,
schemas, repository Skill, macOS user-scoped private CLI and wrapper, and an
isolated exact consumer installation are verified.

## Milestone 23 — Authorized local feature integration

### Outcome

Extend the shipped `sdd-yo` Agent Skill with an explicitly authorized local
integration phase that completes the lifecycle of a verified feature branch.
Before final evidence is produced, the Skill normalizes multiple feature
commits into one commit, rebases that commit onto the current integration ref
when necessary, and treats every resulting head movement as invalidating
dependent evidence. After a current `MergeReport` returns `PASS`, the Skill may
use host Git tools to fast-forward the integration branch to the exact verified
feature head and safely remove the integrated local feature branch.

The deterministic CLI remains the authority for merge readiness and retains
its prohibition on branch, commit, rebase, push, merge, deletion, and branch
protection side effects. `PASS` never grants Git authority. Local integration
requires either explicit advance authorization for the complete local closeout
or one explicit confirmation after `PASS`; remote operations remain separately
authorized.

### Change mode and affected authority

- Mode: `spec-code`.
- Primary Capability: `CAP-404305F6` — Multi-project CLI and skill integration.
- Related constraint: `REQ-44068C1A` — Never perform merge side effects.
- Exact new Requirement IDs remain ungenerated until the confirmed candidate
  authoring route begins.

### Confirmed semantic model

Under `CAP-404305F6`, add these two normative behaviors:

1. **Normalize a feature branch before final verification.**
   - Require explicitly selected feature and integration refs and a clean
     worktree before mutation.
   - Count feature commits after the merge base: stop for zero, preserve one,
     and automatically squash more than one into one final Change commit.
   - After squash, rebase the final feature commit onto the current integration
     ref when that ref has advanced.
   - Stop on a rebase conflict without guessing a resolution, modifying the
     integration branch, or deleting the feature branch.
   - Treat every squash, rebase, or other feature-head movement as invalidating
     TestIndex, test-execution, QA, and merge-readiness evidence.
   - Produce all final verification evidence only for the resulting exact
     feature head `H` and current integration commit `M`.
2. **Complete an explicitly authorized local integration.**
   - Accept either explicit advance authorization for the complete local
     closeout or one explicit confirmation after a current `PASS`.
   - Immediately before integration, recheck that feature head equals verified
     `H`, integration ref equals verified `M`, and the worktree is clean.
   - If either ref moved, return to normalization and fresh verification rather
     than reusing `PASS`.
   - Integrate only by fast-forwarding the integration branch to verified `H`;
     do not create a merge commit or perform a post-verification squash.
   - Verify the integration ref equals `H` and the worktree remains clean, then
     safely delete the integrated local feature branch without force.
   - Preserve the feature branch on every incomplete or failed closeout.
   - Keep push, force-push, remote branch deletion, pull-request merge, branch
     protection, tag, release, and publication outside local authorization.

Clarify `REQ-44068C1A` without weakening it:

- the deterministic CLI continues to perform no Git integration side effects;
- the Agent Skill may orchestrate ordinary host Git tools only in the separate,
  explicitly authorized integration phase;
- Git operation results do not become `MergeReport` evidence and no readiness
  status implies authorization.

### Boundaries

Milestone 23 does not add an `sdd integrate` command, change the `MergeReport`
schema, infer approval from passing checks, resolve conflicts automatically,
allow fuzzy integration, create merge commits, push refs, delete remote
branches, merge pull requests, modify branch protection, publish a package, or
release a version.

### Leaves

- [x] **23.1 — Activate the milestone and confirm its semantic contract.**
      Record the selected `spec-code` mode, complete ID-free semantic model,
      boundaries, leaves, and validation plan without generating IDs, authoring a
      candidate, creating evidence, or performing Git mutations.
- [ ] **23.2 — Author and review the governed specification proposal.**
      Generate project-aware Requirement IDs only after this confirmed model,
      author the complete virtual candidate, materialize and review one immutable
      proposal bundle, record a separate explicit human decision, prepare the exact
      patch, and apply it only after separate explicit selection.
- [ ] **23.3 — Implement the authorized integration Skill route.**
      Add the progressive-disclosure integration reference and entrypoint routing,
      update architecture guidance, add Requirement-named tests and eval scenarios
      for commit counting, automatic squash, current-main rebase, conflicts, stale
      evidence, ref races, fast-forward integration, safe local deletion, missing
      authority, and remote-operation refusal, and refresh the Skill payload
      manifest.
- [ ] **23.4 — Verify, package-proof, and close the milestone.**
      Run focused Skill and eval checks, the complete repository validation suite,
      package smoke, and a bounded isolated local Git proof. Move every lasting
      behavior and boundary into canonical documents, then compact this plan under
      the normal closeout contract. Publication and release remain separate.

### Immediate leaf

Milestone 23.2 is next. It stops after each existing governed boundary:
candidate authoring, Proposal Gate review, human approval recording, exact
patch preparation, and explicit patch application are separate actions. It
does not begin Skill implementation, create a branch or commit, run final QA,
merge, push, publish, or release.

### Validation

For 23.1:

- inspect the exact plan diff;
- check Markdown formatting, trailing whitespace, unresolved placeholders, and
  `git diff --check`.

For specification and implementation leaves, run focused Requirement-named
tests and the repository validation baseline:

```text
npm test
npm run test:package
npm run check:schemas
npm run build
npm run typecheck
npm run format:check
npm run verify:contracts
git diff --check
```

Milestone closeout additionally requires current human review evidence for the
new Skill scenarios and proof that the isolated local integration path leaves
the integration ref at the verified feature head, removes only the integrated
local branch, preserves failed branches, and performs no remote side effect.

## Candidate backlog

No candidate is selected. Possible future milestones remain deliberately
uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
