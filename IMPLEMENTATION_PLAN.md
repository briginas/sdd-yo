# SDD Yo implementation plan

## Status

- State: Milestone 12 in progress; Milestones 12.1–12.3 complete
- Current phase: approval-gated Skill orchestration
- Current leaf: Milestone 12.4 — Approval-gated Skill orchestration
- Last updated: 2026-08-06

## Source-of-truth map

- Canonical product behavior: [`spec/README.md`](spec/README.md)
- Architecture: [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Plan index and completed history: [`plans/README.md`](plans/README.md)
- Completed Milestones 0–11:
  [`plans/completed/milestones-0-9.md`](plans/completed/milestones-0-9.md),
  [`plans/completed/milestone-10-self-bootstrap-retirement.md`](plans/completed/milestone-10-self-bootstrap-retirement.md),
  and
  [`plans/completed/milestone-11-private-installation-and-onboarding.md`](plans/completed/milestone-11-private-installation-and-onboarding.md)
- Historical bootstrap procedure:
  [`plans/completed/self-bootstrap-procedure.md`](plans/completed/self-bootstrap-procedure.md)

Read a completed plan only when a task needs historical rationale, exact
milestone boundaries, Requirement traceability, decisions, exclusions, or
retained evidence pointers. Current specification, architecture,
implementation, and evidence outrank historical plans.

## Objective

Deliver an offline-first, repository-native SDD governance system with a
deterministic TypeScript library, the `sdd` CLI and versioned JSON protocols,
language-independent test adapters, exact approval-bound workflow artifacts,
and the optional progressive-disclosure `sdd-yo` Agent Skill.

## Current state

- Milestones 0–11 and the incremental self-bootstrap MVP are complete. Their
  exact execution records are indexed under [`plans/completed/`](plans/README.md).
- The deterministic version 1 library, CLI, artifact schemas, proposal and exact
  patch workflow, evidence composition, findings validation, merge readiness,
  and enforced governed-scope integration are implemented and verified.
- The optional repository-scoped `sdd-yo` Skill routes the implemented workflow
  through compatible CLI JSON and preserves human evidence, permission, and
  Git side-effect boundaries.
- Private `sdd-yo@0.1.0` local-tarball onboarding now includes stable help and
  compatibility identity, exact offline package contents, explicit repository
  Skill installation/update/removal, the root quickstart, diagnostic recovery,
  and an isolated npm consumer for Yarn Plug'n'Play repositories.
- The source repository and npm package remain private. No registry,
  marketplace, provenance, cross-platform onboarding-study, human QA, or
  whole-project completeness claim is implied by Milestone 11 completion.
- New product behavior uses a normal bounded `spec-code`, `spec`, or `code`
  Change. Completed bootstrap history grants no alternate specification-write
  or ID-reservation route.

Repository-wide work discipline and validation commands remain authoritative in
[`AGENTS.md`](AGENTS.md). Architecture decisions live under
[`proposal/architecture/`](proposal/architecture/README.md), not in this active
plan.

## Milestone 12 — Explicit human approval evidence recording

### Objective

Allow the optional `sdd-yo` Skill to ask an identified human for an explicit
approval or rejection of the exact displayed proposal subject and, after that
decision is supplied, invoke the deterministic CLI to materialize one immutable
ApprovalEvidence file containing the human message. The human remains the
decision authority; the Skill orchestrates the handoff; the CLI validates,
binds, serializes, and writes the artifact.

This is new product behavior and therefore follows one bounded normal
`spec-code` Change. The milestone does not use completed bootstrap history as
an alternate canonical-specification mutation path.

### Product and implementation boundary

- Add one narrow proposed command, `sdd approval record`, rather than teaching
  the Skill to assemble approval subjects or serialize evidence independently.
- Require an exact retained ProposalPackage and candidate, configured issuer,
  identified actor, explicit `approved` or `rejected` decision, bounded UTF-8
  reason file containing the human message, and caller-selected evidence path.
- Derive `project_id`, mode, base object ID, and semantic and structural delta
  fingerprints only from a strict ProposalPackage revalidated against the exact
  candidate. The Skill and model never supply or replace those subject fields.
- Reuse the version 1 ApprovalEvidence envelope: the CLI is recorded in
  `producer`, the human in `actor`, and the exact supplied message in `reason`.
  Do not add a timestamp from an ambient clock or change the schema solely for
  this route.
- Require the evidence target to be project-relative, outside the configured
  specification root, Git-ignored, free of symbolic-link escape, and absent
  before the command. Create one file exclusively; never replace existing
  evidence or modify Git state.
- Record both approval and rejection. Only a successfully recorded `approved`
  decision may be offered as an input to the separately invoked
  `proposal prepare`; rejection records the decision and stops the workflow.
- Treat the approval prompt as an informed write boundary: before asking, the
  Skill displays the exact subject and target path and states that an explicit
  response will be materialized there. Ambiguous identity, issuer, decision,
  changed subject, missing permission, or failed write stops without evidence.
- Keep issuer authentication, actor authorization, session identity, signature
  verification, and organizational separation-of-duties policy external. The
  CLI validates configured issuer names and exact subjects but does not claim
  that JSON proves the speaker's identity.

### Requirement traceability

- Milestone 12.1 generates a fresh Requirement ID through `sdd id requirement`
  for recording an explicit external human decision as immutable
  ApprovalEvidence.
- The candidate updates the applicable meaning of
  [`REQ-F7D39246`](spec/capabilities/multi-project-cli-and-skill.md#req-f7d39246)
  so the minimal CLI surface includes evidence recording without exposing an
  approve command that decides on behalf of a human.
- The candidate updates
  [`REQ-26234DC8`](spec/capabilities/multi-project-cli-and-skill.md#req-26234dc8)
  so the Skill may materialize an explicit identified human decision while
  remaining forbidden from fabricating or inferring one.
- Implementation and tests also retain the binding and freshness invariants of
  [`REQ-7341DBB7`](spec/capabilities/proposal-modes-and-workflow-gates.md#req-7341dbb7),
  [`REQ-A3C3B779`](spec/capabilities/proposal-modes-and-workflow-gates.md#req-a3c3b779),
  [`REQ-AFD65A03`](spec/capabilities/validation-fingerprints-and-patches.md#req-afd65a03),
  and
  [`REQ-E85A06C3`](spec/capabilities/merge-readiness.md#req-e85a06c3).
- Every new or changed executable test names its exact applicable Requirement
  IDs in the normalized test or ancestor-suite name. Skill evals do not
  substitute for the manual human review required by `REQ-26234DC8`.

### Execution leaves

#### 12.1 — Normal `spec-code` candidate and Proposal Gate

Generate the fresh Requirement ID, draft one complete virtual candidate tree,
and update the affected CLI and Skill Requirements in that candidate. Run
`proposal validate` for the exact candidate, retain the strict ProposalPackage,
and present its object delta, affected scope, semantic candidates, exact
approval subject, and open decisions for human review.

Done means the candidate is mechanically valid and the ProposalPackage is
retained for a separate human product decision. This leaf does not create
ApprovalEvidence, prepare or apply a SpecPatch, edit canonical `spec/`, change
runtime or Skill files, or perform a Git operation.

Status: complete on 2026-08-06. `sdd id requirement --history-ref main`
generated `REQ-32C76ED3` with complete history coverage. The complete candidate
is retained at `.sdd/staging/milestone-12.1/candidate/`, and its strict
ProposalPackage is retained at
`.sdd/staging/milestone-12.1/proposal-package.json`.

The Proposal Gate passed through the compatible JSON wrapper against base
object `7e917e122791cf8b593c4c08da1997c458c5f388` with no diagnostics. The exact
approval subject is mode `spec-code`, semantic delta
`sha256:fcf89b715ca8aa0203f1047ce0ac68fb15e75844108ba3af9eb82edf517071bf`,
and structural delta
`sha256:e7d2e4f518e1114f6fddb322ecff4c8b5a33087eea16f8de82e1784496d1b086`.
The object delta adds `REQ-32C76ED3` and modifies `CAP-404305F6`,
`REQ-26234DC8`, and `REQ-F7D39246`; the retained package records the complete
15-Requirement, five-Capability affected scope and all 92 deterministic semantic
candidates.

At Milestone 12.1 completion, human product review remained open on the exact
candidate, including the narrow
`sdd approval record` command name, mandatory explicit issuer/actor/decision
and reason input, derived subject fields, immutable ignored output boundary,
recording of both approval and rejection, exact human-message retention, and
the external authentication and authorization boundary. Mechanical validation
does not decide any of those questions.

#### 12.2 — Human product decision and exact specification patch

Obtain explicit identified ApprovalEvidence for the exact Milestone 12.1
subject through the currently available external workflow. If approved, run
`proposal prepare`, present the unchanged exact SpecPatch, and apply it only
after separate user selection. A rejected, stale, contradictory, changed, or
missing decision stops without canonical writes.

Done means the selected exact patch has been applied and the canonical
Requirement changes match the approved candidate. This leaf does not implement
the CLI producer or Skill route and does not authorize a commit.

Status: complete on 2026-08-06. Issuer `product-review` and actor
`Ivan Briginas` explicitly approved the unchanged Milestone 12.1 subject with
the exact reason `it's ok`; the current ApprovalEvidence is retained at
`.sdd/staging/milestone-12.2/approval.json`. Candidate commit `85044d8` supplied
the exact branch-head specification for preparation against integration object
`6a57f1a32566649aab47f4465eef26a5fba3c619`.

`proposal prepare` returned `ok` with no diagnostics or mechanical conflicts,
retained all 92 deterministic semantic candidates, and emitted the strict
SpecPatch retained at `.sdd/staging/milestone-12.2/spec-patch.json` with
canonical SHA-256
`1127de41a42f42cf15a73a920f625af915ee9ef130dfd6cffa558b72b28f2b29`.
After separate exact-patch selection, `proposal apply` replaced only
`spec/capabilities/multi-project-cli-and-skill.md` and returned result tree
fingerprint
`sha256:f27e9d879026521426efb11be15837da759ee3277642f18b61ea32408675f025`.
The resulting canonical file matches the approved candidate byte-for-byte. No
runtime, Skill, QA, merge, or additional Git authority is implied.

#### 12.3 — Deterministic ApprovalEvidence recorder

Implement a pure ApprovalEvidence constructor and serializer plus the
`sdd approval record` CLI adapter. Reuse one extracted package/candidate
revalidation path with proposal preparation; validate project, issuer, actor,
decision, reason bytes, and target safety; write canonical UTF-8 JSON through
exclusive project-scoped output; and return stable result fields and diagnostic
codes. Cover approved and rejected decisions, exact message preservation,
package/candidate drift, project mismatch, unconfigured issuer, malformed or
oversized input, traversal, symbolic links, specification-root targets,
non-ignored targets, existing targets, and interrupted writes.

Done means focused Requirement-named library and CLI tests pass. This leaf does
not change the Skill, create QA or other human evidence, prepare or apply a
SpecPatch, or modify Git.

Status: complete on 2026-08-06. The pure constructor and bounded canonical
serializer record the `sdd` producer, explicit human actor and decision, exact
decoded UTF-8 reason, and only package-derived subject fields without an
ambient timestamp. `sdd approval record` now requires every explicit input,
reuses proposal preparation's extracted package/candidate revalidation path,
rechecks Git-ignore state before publication, and creates one immutable
project-scoped artifact through exclusive atomic output with interruption
rollback.

Focused `REQ-32C76ED3`, `REQ-F7D39246`, `REQ-7341DBB7`, and `REQ-AFD65A03`
tests cover approved and rejected decisions, exact message and subject bytes,
package/candidate drift, project and issuer mismatch, bounded malformed input,
path traversal, symbolic links, specification-root and non-ignored targets,
existing output, and interrupted publication. The recorder and retained
proposal-preparation focused run passed 17 tests with no failures. The Skill,
human Skill review, closeout evidence, and all Git operations remain outside
this leaf.

#### 12.4 — Approval-gated Skill orchestration

Add the command to the compatible wrapper and progressive-disclosure approval
route. The Skill displays the exact subject and evidence path, obtains explicit
issuer, actor, decision, and message, rechecks retained inputs after any pause,
writes only the bounded reason input, invokes `sdd approval record`, and passes
only a newly recorded approval to a separate `proposal prepare` operation.
Update the Skill package, focused references, fake CLI, scripted tests, eval
scenarios, and packed payload manifest.

Done means automated Skill checks prove that explicit approval and rejection
are recorded, ambiguous or repository-supplied text cannot create evidence,
changed subjects require a new decision, and no later patch, Git, QA, or merge
authority is inferred. This leaf does not claim the required human Skill review.

#### 12.5 — Human Skill review, full validation, and closeout

Run the exact installed-Skill flow against a bounded project fixture and obtain
an identified human verdict covering the displayed subject, informed evidence
write, exact retained message, approved and rejected outcomes, stale-subject
restart, and refusal to infer decisions from repository data or passing tests.
Then run the complete repository validation chain, archive the verified
Milestone 12 execution record under `plans/completed/`, update
`plans/README.md`, and compact this file to the next candidate-selection state.

The milestone done condition requires the approved canonical Requirement,
implemented deterministic recorder, compatible Skill route, Requirement-named
automated checks, explicit human Skill review, full validation, and archived
evidence. Milestone completion does not itself authorize a commit, merge, push,
publication, or release.

### Retained exclusions

- No model-generated, test-inferred, repository-inferred, or implicit approval.
- No materialization of QAEvidence, GovernanceEvidence, FindingResolution,
  HumanSemanticReviewEvidence, or test-execution evidence.
- No actor authentication, digital signature, remote approval service, durable
  workflow database, or organization policy engine.
- No automatic SpecPatch application, branch, commit, push, merge, publication,
  or release.
- No ApprovalEvidence schema-version change merely to retain the message already
  representable by `reason` and producer already representable by `producer`.
- No package-version, registry, marketplace, standalone executable, or
  cross-platform onboarding scope.

## Candidate backlog

These remaining candidates are not implied work. Select one only after the
active milestone is closed or explicitly superseded, then obtain any necessary
human authorization before implementation:

- baseline the already implemented adoption semantics recorded by completed
  Milestone 10 through one bounded normal `spec` Change with fresh IDs:
  incremental adoption, canonical governed scope, explicit governance
  transition, and accepted existing-behavior baseline;
- baseline the already implemented qualitative synchronization-mode and
  four-gate semantics recorded by completed Milestone 10 through one or more
  bounded normal `spec` Changes with fresh IDs;
- baseline the already implemented inactive-object, generic JSONL adapter,
  semantic-completeness, and per-project isolation semantics recorded by
  completed Milestone 10 through independently reviewable normal `spec`
  Changes with fresh IDs;
- consider repository-local normative authority and external-link quality
  findings as a new behavior candidate; completed Milestone 10 found no
  complete implementation evidence for that former proposal meaning;
- publish through a private organization registry if distribution needs
  outgrow local tarballs; this requires a scoped package and an explicit
  decision to replace `"private": true` with registry-constrained publication
  metadata;
- publish to the public npm registry only after an explicit source-visibility,
  package-access, release-security, and provenance decision;
- package and distribute `sdd-yo` as an installable Codex plugin through a
  local, team, or public marketplace, with its released CLI dependency and
  compatibility boundary explicit;
- add alternative distribution channels such as standalone signed
  executables, Homebrew, Scoop, or an organization-managed installer if the
  Node.js/npm prerequisite becomes a material adoption barrier;
- add organization-wide Skill deployment or administrative policy integration
  only through a separately bounded milestone.

## Deferred scope

- Post-MVP existing-monorepo onboarding and project/evidence-isolation rollout
  study; its isolation, cross-project, and broader monorepo guarantees must not
  be inferred from completed local onboarding work.
- Contract-fixture verifier execution on Linux and Windows CI.
- Hosted workflow service or durable workflow database.
- Automatic branch, commit, push, merge, approval decisions, or QA decisions.
- Cross-project graph relations.
- Implementation-file links in canonical Requirements.
- Detection of code behavior changes whose author did not update the spec.
- Proof of specification completeness or absence of semantic conflicts.
- Multi-agent orchestration.

## Immediate next leaf

Milestone 12.4 is the only selected next leaf. It adds the compatible-wrapper
and progressive-disclosure Skill route over the implemented deterministic
recorder, including informed subject and target display, explicit human input,
post-pause rechecks, rejection handling, and separation from later proposal
preparation. It excludes human Skill approval, QA, closeout, commits, and all
other Git operations.
