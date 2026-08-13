# SDD Yo implementation plan

## Status

- Active: Milestone 26 — CLI-recorded human semantic review evidence;
  immediate leaf 26.1
- Complete: Milestones 0–25; public `sdd-yo@0.5.2`
- Last updated: 2026-08-13

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
CLI are implemented and verified. The Skill can additionally normalize one
explicit local feature branch, invalidate evidence after head movement, and
complete an explicitly authorized exact fast-forward with safe local branch
deletion; the CLI remains Git-side-effect-free and every remote operation stays
outside that route. Normal `spec-code` and `spec` Changes retain one
candidate-and-package bundle. A Skill-owned authored candidate is created
outside the repository through the host temporary boundary and removed after
successful bundle retention; failures preserve it, caller-owned candidates are
not removed, and `code` creates no candidate directory. `code` retains one
package-only bundle and performs no specification-patch ceremony. Proposal
validation, approval recording, preparation, and merge checks consume the exact
retained bundle; superseded `0.4.x` handoff routes are absent.

Exact `sdd-yo@0.5.2` is public on npm from annotated tag `v0.5.2` at commit
`15f7a33c290ddd742ff57470af35480645ce03fb`. Its registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`2129c9ec55e0095aaff96554a2cd120641fa9338e408419a223cdab0c836beba`,
inventory SHA-256
`7d2e69d75debc2639fcc0a9470df3b9494a378b45c831db5e803f47235448079`,
and 2,139 entries. npm trusted publishing records SLSA provenance for the
GitHub Actions `publish.yml` subject. The public package, CLI identity, library,
schemas, repository Skill, macOS user-scoped private CLI and wrapper, and an
isolated exact consumer installation are verified.

## Milestone 26 — CLI-recorded human semantic review evidence

Milestone 26 removes manual JSON and fingerprint transcription from the human
semantic-review fallback while preserving the human as the only decision-maker.
The CLI first materializes the exact deterministic review subject, the Skill
presents that subject and pauses once for an identified human decision, and a
separate recorder invocation revalidates the unchanged subject before creating
immutable `HumanSemanticReviewEvidence`. For one unchanged review subject, the
workflow asks no other question: the Skill composes every deterministic step
and reuses exact current-workflow inputs that it already holds.

### Outcome

Provide a complete two-phase semantic-review workflow:

1. A deterministic CLI operation derives the current
   `SemanticAnalysisInputManifest` from an exact `ChangeDescriptor`, retained
   proposal bundle, proposal head, integration state, and fixed versioned
   human-review analyzer identity, while validating zero or more explicit
   current Finding artifacts selected for the same review. It atomically
   creates one caller-selected Git-ignored manifest outside the specification
   root and returns one versioned, machine-comparable review subject. The
   caller may be the Skill; the human does not select routine artifact paths.
2. The Skill presents the manifest's changed objects, related objects,
   normative review context, semantic candidates, every current supplied
   Finding with its review-relevant fields, current refs, recorder identity,
   and selected evidence target without asking the human to copy a fingerprint,
   compose JSON, choose a path, or resupply an input already retained in the
   selected workflow. It then pauses once for an explicit `reviewed` decision,
   collecting issuer or actor in the same request only when either value has
   not already been explicitly supplied for the current workflow.
3. A separate CLI recorder re-resolves the current refs, revalidates the
   Change, bundle, retained manifest, and any supplied Finding artifacts, and
   creates `HumanSemanticReviewEvidence` only when the subject is unchanged.
   The recorder derives `candidate_input_fingerprint` and the canonical sorted
   `finding_ids`; neither value is authored conversationally. It returns the
   same versioned review subject for exact Skill comparison after the pause.
4. When merge readiness is part of the already selected bounded outcome, the
   Skill supplies the retained manifest and recorder-created evidence directly
   to `merge check` through its existing explicit-input and freshness rules. It
   does not ask whether to record the decision, continue, or run the check.

The resulting user interaction is a meaningful semantic-review decision, not
a request to create a technical artifact by hand.

### Interaction contract

- One unchanged semantic-review subject has exactly one human pause: the
  informed `reviewed` decision. Missing issuer and actor values, when any, are
  requested together with that decision rather than through separate turns.
- An explicitly selected end-to-end outcome remains selected across compatible
  deterministic CLI operations. The Skill does not ask the human to reselect
  proposal review, evidence recording, preparation, verification, or merge
  readiness when those stages are already contained in that outcome.
- The Skill reuses exact project, mode, Change, bundle, refs, manifest,
  Findings, evidence, and safe staging paths that it created, received, or
  retained in the current workflow. It asks only when a required input is truly
  absent or conflicting and cannot be derived mechanically.
- Semantic-model confirmation, ProposalPackage approval, exact-patch
  application, semantic review, normative ambiguity resolution, and new Git,
  merge, publication, or release authority remain distinct human decisions.
  Deterministic validation, materialization, recording after an informed
  decision, preparation, and read-only readiness computation are not extra
  decision boundaries within an already selected route.

### Change mode and affected authority

- Mode: `spec-code`, because the supported CLI and Skill workflow change.
- Primary Capability: `CAP-F31EF876` — Semantic review and conflict analysis.
- Existing Requirements requiring normative revision:
  `REQ-2AF962EB`, `REQ-F7D39246`, `REQ-26234DC8`, `REQ-E85A06C3`,
  `REQ-64DB876B`, and `REQ-A3C3B779`.
- Existing Requirements requiring implementation and test traceability even if
  their normative meaning remains unchanged: `REQ-7C848ED0` for exact
  artifact-producing response subjects, `REQ-FFE60B5A` for complete CLI help,
  and `REQ-32C76ED3` for the shared safe immutable recorder boundary.
- Related Domain Concepts: `CON-4365C0F6` — Evidence,
  `CON-E2F84A01` — Finding, and `CON-3E620A28` — Change.
- One new automated Requirement may be added for exact manifest
  materialization and evidence recording after the complete semantic model is
  confirmed. No new object identity is generated during milestone planning.

### Selected semantic direction

1. **Materialize the review subject before the human pause.**
   - Add a dedicated, explicitly named semantic-review materialization
     operation rather than extending `proposal prepare` or adding a write side
     effect to `merge check`.
   - Require one exact Change, one retained mode-correct proposal bundle, zero
     or more explicit current Finding artifacts, and one new project-relative
     manifest target. The Skill selects and validates a fresh target itself
     when the current workflow does not supply one.
   - Revalidate the package and Change relationship, resolve the proposal and
     configured integration refs, and use the same semantic-input builder that
     merge readiness uses.
   - Return the retained manifest path and one versioned review subject that
     includes project and mode, resolved proposal head, integration ref and
     merge base, bundle or package identity, analyzer identity, manifest input
     fingerprint, and canonical Finding IDs. The CLI does not perform model
     analysis or make a human decision.
2. **Present one complete informed-review request.**
   - Present the complete manifest context and every current supplied Finding's
     ID, kind, severity, summary, object IDs, and normative section citations.
     Evidence never names a Finding that was not included in the displayed
     review subject.
   - Display the explicit issuer and actor already supplied for this workflow;
     request either missing value together with the decision, never as a
     separate preliminary or follow-up question.
   - Display the recorder action and evidence target as consequences of the
     decision. The target is not part of the semantic subject and choosing it
     is not delegated to the human.
3. **Record only an explicit human decision.**
   - After presenting the exact retained subject, the Skill requires a
     non-empty issuer, identified actor, and explicit `reviewed` decision.
   - The recorder accepts the retained manifest, Change, bundle, selected
     evidence target, and optional current Finding artifacts. It derives all
     fingerprint and Finding-ID fields itself.
   - The evidence records CLI producer identity without an ambient timestamp;
     issuer authentication, actor authorization, session identity, and
     organizational policy remain external.
4. **Revalidate after every conversational pause.**
   - The recorder recomputes the semantic input from current refs and rejects a
     stale manifest, moved proposal head or integration ref, changed bundle,
     mismatched Change, cross-project artifact, or non-current Finding.
   - The Skill accepts success only when the recorder response returns the exact
     versioned subject displayed before the pause and identifies the published
     evidence path. Subject comparison is machine-owned; the human is not asked
     to compare fingerprints, refs, paths, or JSON.
   - Later ref or input movement invalidates the evidence normally; no stale
     evidence is silently refreshed or rewritten.
   - A changed semantic subject requires a newly presented subject and a fresh
     human decision. A target collision, unsafe output target, or transient
     write failure with an otherwise unchanged subject is technical rather than
     semantic: the Skill selects another fresh safe target and retries the
     recorder without asking the human to repeat the decision.
5. **Compose the selected route through the next real decision.**
   - The Skill automatically supplies recorder outputs to `merge check` when
     merge readiness was selected, and reports its result without a `continue`,
     `record`, or `run merge check` question.
   - The same orchestration rule removes route-selection pauses elsewhere in an
     explicitly selected normal Change outcome: after semantic confirmation it
     may materialize and present the proposal, and after recorded approval it
     may prepare and present the exact patch. Proposal approval and patch
     application remain separate decisions.
6. **Create only bounded immutable artifacts.**
   - Manifest and evidence targets are new, project-relative, Git-ignored,
     outside the configured specification root, regular-file and symlink safe,
     and published atomically without partial output.
   - The implementation should share generic safe ignored-artifact output
     primitives with approval recording rather than duplicate weaker checks.

### Boundaries

Milestone 26 does not let the CLI, Skill, model, repository content, test
results, authorship, silence, or absence of Findings make a human decision. It
does not add a Finding or FindingResolution recorder, change Finding resolution
semantics, make model-assisted review mandatory, claim semantic completeness,
authenticate issuers or actors, introduce hidden workflow state, weaken merge
freshness, modify Git refs, merge branches, push, publish, or release a package.
It does not infer issuer or actor from authorship, account metadata, repository
content, or model memory; it may reuse only values explicitly supplied for the
current workflow. Automatic continuation applies only to the bounded outcome
already selected by the human and never broadens that authority.

The existing `HumanSemanticReviewEvidence` and
`SemanticAnalysisInputManifest` schemas remain unchanged unless governed
authoring proves that their current fields cannot express the confirmed
workflow. `decision` remains the exact constant `reviewed`; this milestone does
not turn semantic review into approval or QA.

### Planned leaves

- [ ] **26.1 — Confirm the complete semantic contract.**
      Revalidate the selected project, present the complete ID-free model for
      two-phase manifest materialization and evidence recording, settle command
      naming, exact inputs, the versioned review-subject response, one-pause
      continuation rules, Finding presentation, and technical retry semantics,
      and obtain explicit confirmation before generating a Requirement ID or
      drafting a candidate.
- [ ] **26.2 — Author and apply the governed specification proposal.**
      Revise the affected Requirements and, if confirmed, add one atomic
      automated Requirement through an immutable proposal bundle, separate
      human approval, exact preparation, and explicit patch application.
- [ ] **26.3 — Implement shared semantic-review subject materialization.**
      Factor one current-subject computation used by materialization,
      recording, and merge readiness; add strict CLI parsing, help, result
      rendering, a shared machine-comparable response subject, diagnostics,
      safe immutable manifest output, and stale-input handling.
- [ ] **26.4 — Implement human semantic-review evidence recording.**
      Add pure evidence construction and serialization, exact post-pause
      revalidation, Finding-ID derivation, safe atomic evidence publication,
      diagnostics that distinguish subject drift from technical target failure,
      and strict compatible JSON responses without making the decision.
- [ ] **26.5 — Update the Skill and close the milestone.**
      Add the informed-review and recorder route to the compatibility wrapper,
      progressive-disclosure reference, automatic continuation through already
      selected deterministic stages, no-repeat input policy, architecture,
      evals, package payload manifest, package smoke, and complete validation;
      then compact this plan.

### First leaf

Milestone 26.1 confirms only the future normative workflow. It does not
generate an ID, draft or materialize a specification candidate, create a
manifest or evidence, record a human decision, change implementation, mutate
Git, publish, or release.

### Validation

Milestone 26 requires focused tests proving that:

- materialization, recording, and `merge check` derive the same canonical
  semantic-review input for identical current refs;
- materialization and recording return the same complete versioned review
  subject, including resolved refs, bundle identity, analyzer, manifest
  fingerprint, and canonical Finding IDs;
- the human is shown the exact retained subject and every current supplied
  Finding, and the recorder response matches that subject, with no manual
  fingerprint, Finding-ID, path, ref, retained-input, or JSON transcription;
- one unchanged subject produces exactly one human pause, missing issuer or
  actor values are collected in that same pause, and already explicit values
  are not requested again;
- an already selected end-to-end route automatically composes deterministic
  materialization, recording, preparation, and read-only readiness operations
  without separate `continue`, route-selection, recorder, or merge-check
  questions;
- missing or ambiguous human input never creates evidence;
- proposal-head, integration-ref, Change, bundle, manifest, project, analyzer,
  and Finding drift are rejected without partial output;
- existing, non-ignored, in-specification, traversal, symlink, oversized, and
  unsafe targets are rejected;
- injected write failure publishes neither a partial manifest nor partial
  evidence;
- manifest target failure before the pause is handled without human input, and
  evidence target collision or transient write failure after the pause retries
  with a fresh safe target without repeating an unchanged human decision;
- compatibility-wrapper validation rejects malformed or mismatched recorder
  results;
- Skill evals prove that model output, repository instructions, passing tests,
  authorship, silence, and an empty Finding set never become a human decision;
  evals also prove that the Skill never binds an undisplayed Finding, infers
  issuer or actor, or broadens an already selected bounded outcome; and
- `npm test`, `npm run test:package`, `npm run check:schemas`, `npm run build`,
  `npm run typecheck`, `npm run format:check`, `npm run verify:contracts`, and
  `git diff --check` pass on the final subject.

## Candidate backlog

Other possible future milestones remain deliberately uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
