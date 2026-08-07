# Milestone 12 — Explicit human approval evidence recording

## Objective and final boundary

Milestone 12 allowed the optional `sdd-yo` Skill to request an identified
human's explicit approval or rejection of the exact displayed proposal subject
and to invoke the deterministic CLI to materialize one immutable
`ApprovalEvidence` file containing the exact human message. The human remained
the decision authority; the Skill orchestrated the handoff; and the CLI
validated, bound, serialized, and wrote the artifact.

The milestone introduced no automatic approval, QA, test, merge, branch,
commit, push, publication, or release authority.

## Requirement traceability

The milestone retained and verified:

- `REQ-32C76ED3` — explicit human approval/rejection recording;
- `REQ-F7D39246` — the narrow CLI workflow surface;
- `REQ-26234DC8` — progressive-disclosure Skill orchestration and explicit
  human authority;
- `REQ-7341DBB7`, `REQ-A3C3B779`, and `REQ-AFD65A03` — exact subject and
  freshness binding;
- `REQ-E85A06C3` — evidence and downstream workflow boundaries.

Executable checks name their applicable Requirements. The manual Skill review
is retained separately because scripted checks cannot supply a human verdict.

## Execution leaves

### 12.1 — Normal `spec-code` candidate and Proposal Gate

Generated `REQ-32C76ED3` and retained the complete candidate and strict
ProposalPackage under `.sdd/staging/milestone-12.1/`. The exact subject was
validated in `spec-code` mode with semantic fingerprint
`sha256:fcf89b715ca8aa0203f1047ce0ac68fb15e75844108ba3af9eb82edf517071bf`
and structural fingerprint
`sha256:e7d2e4f518e1114f6fddb322ecff4c8b5a33087eea16f8de82e1784496d1b086`.

### 12.2 — Human product decision and exact specification patch

The exact candidate was explicitly approved by issuer `product-review` and
actor `Ivan Briginas`. The exact SpecPatch was prepared and applied only after
separate selection. Canonical patch SHA-256:
`1127de41a42f42cf15a73a920f625af915ee9ef130dfd6cffa558b72b28f2b29`.

### 12.3 — Deterministic ApprovalEvidence recorder

Implemented the pure constructor, canonical serializer, and `sdd approval
record` adapter. Focused recorder and proposal-preparation coverage passed 17
tests, including approved and rejected decisions, exact UTF-8 messages,
subject drift, project and issuer mismatch, unsafe targets, and interrupted
publication.

### 12.4 — Approval-gated Skill orchestration

Updated the compatibility wrapper, progressive-disclosure approval route,
references, fake CLI, eval scenarios, and payload manifest. The Skill displays
the exact subject and evidence target, requires explicit issuer/actor/decision/
message, revalidates after a pause, and separates rejection from preparation.
The focused Skill/eval checks passed; package smoke and the packed payload
manifest passed.

### 12.5 — Human Skill review, full validation, and closeout

The identified reviewer ran the installed Skill against the approval-recording
flow and reported:

> запустил скил и проверил его. всё работает.

The retained result covers the three approval-recording scenarios:

- `approval-explicit-approved-and-separate-preparation`;
- `approval-explicit-rejection-stops`;
- `approval-ambiguous-or-changed-subject-restarts`.

All three are recorded as `pass` with no findings, bound to Skill revision
`92a43ca` and transcript
`evals/skill/transcripts/ivan-briginas-approval-verdict.md`.

## Retained evidence

- Human review result:
  `evals/skill/approval-review-result.json`.
- Human review transcript:
  `evals/skill/transcripts/ivan-briginas-approval-verdict.md`.
- Transcript SHA-256:
  `sha256:8f6d03b167377edfd0ac51b138594f5de11fe6f4aef393a4ffbdd2e7d8068e6e`.
- Pending-review schema template remains at
  `evals/skill/approval-review-result.template.json`.
- Source/Skill revision: `92a43ca`.
- Private package artifact:
  `sdd-yo-0.1.0.tgz`, SHA-256
  `c59f02bde91f9e4e85905c465153955f59e3247afefdc694aa446fea3bdf0cf0`.

## Validation evidence

All commands passed on 2026-08-07:

- `node --test test/skill-evals.test.ts`: 12 tests;
- `npm test`: 230 tests, 0 failures;
- `npm run test:package`: one packed-consumer smoke test;
- `npm run check:schemas`;
- `npm run build`;
- `npm run typecheck`;
- `npm run format:check`;
- `npm run verify:contracts`: 27,339 checks after closeout compaction;
- `git diff --check`.

## Exclusions and deferred scope

No model-generated, test-inferred, repository-inferred, or implicit approval
was materialized. No actor authentication, signature, remote approval service,
workflow database, policy engine, QA evidence, test-execution evidence,
automatic patch application, Git operation, publication, release, package
version change, marketplace plugin, or cross-platform onboarding claim was
introduced.

The candidate backlog and deferred scope remain in the active plan. No next
candidate was selected by this closeout.

## Closeout result

Milestone 12 and Milestone 12.5 are complete as of 2026-08-07. This closeout
does not authorize a commit, merge, push, publication, or release. The working
tree retains the requested untracked private package artifact
`sdd-yo-0.1.0.tgz`.
