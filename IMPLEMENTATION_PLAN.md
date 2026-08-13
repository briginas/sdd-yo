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
presents that subject and pauses for an identified human decision, and a
separate recorder invocation revalidates the unchanged subject before creating
immutable `HumanSemanticReviewEvidence`.

### Outcome

Provide a complete two-phase semantic-review workflow:

1. A deterministic CLI operation derives the current
   `SemanticAnalysisInputManifest` from an exact `ChangeDescriptor`, retained
   proposal bundle, proposal head, integration state, and fixed versioned
   human-review analyzer identity. It atomically creates one caller-selected
   Git-ignored manifest outside the specification root and returns the exact
   review scope.
2. The Skill presents the manifest's changed objects, related objects,
   normative review context, semantic candidates, current refs, and selected
   evidence target without asking the human to copy a fingerprint or compose
   JSON. It then pauses for an explicit issuer, actor, and `reviewed` decision.
3. A separate CLI recorder re-resolves the current refs, revalidates the
   Change, bundle, retained manifest, and any supplied Finding artifacts, and
   creates `HumanSemanticReviewEvidence` only when the subject is unchanged.
   The recorder derives `candidate_input_fingerprint` and the canonical sorted
   `finding_ids`; neither value is authored conversationally.
4. `merge check` consumes the retained manifest and recorder-created evidence
   through its existing explicit-input and freshness rules.

The resulting user interaction is a meaningful semantic-review decision, not
a request to create a technical artifact by hand.

### Change mode and affected authority

- Mode: `spec-code`, because the supported CLI and Skill workflow change.
- Primary Capability: `CAP-F31EF876` — Semantic review and conflict analysis.
- Existing Requirements requiring normative revision:
  `REQ-2AF962EB`, `REQ-F7D39246`, `REQ-26234DC8`, `REQ-E85A06C3`,
  `REQ-64DB876B`, and `REQ-A3C3B779`.
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
   - Require one exact Change, one retained mode-correct proposal bundle, and
     one new project-relative manifest target.
   - Revalidate the package and Change relationship, resolve the proposal and
     configured integration refs, and use the same semantic-input builder that
     merge readiness uses.
   - Return the retained manifest path and exact subject needed for informed
     review. The CLI does not perform model analysis or make a human decision.
2. **Record only an explicit human decision.**
   - After presenting the exact retained subject, the Skill requires a
     non-empty issuer, identified actor, and explicit `reviewed` decision.
   - The recorder accepts the retained manifest, Change, bundle, selected
     evidence target, and optional current Finding artifacts. It derives all
     fingerprint and Finding-ID fields itself.
   - The evidence records CLI producer identity without an ambient timestamp;
     issuer authentication, actor authorization, session identity, and
     organizational policy remain external.
3. **Revalidate after every conversational pause.**
   - The recorder recomputes the semantic input from current refs and rejects a
     stale manifest, moved proposal head or integration ref, changed bundle,
     mismatched Change, cross-project artifact, or non-current Finding.
   - The Skill accepts success only when the recorder response identifies the
     exact subject displayed before the pause and the exact selected evidence
     path.
   - Later ref or input movement invalidates the evidence normally; no stale
     evidence is silently refreshed or rewritten.
4. **Create only bounded immutable artifacts.**
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

The existing `HumanSemanticReviewEvidence` and
`SemanticAnalysisInputManifest` schemas remain unchanged unless governed
authoring proves that their current fields cannot express the confirmed
workflow. `decision` remains the exact constant `reviewed`; this milestone does
not turn semantic review into approval or QA.

### Planned leaves

- [ ] **26.1 — Confirm the complete semantic contract.**
      Revalidate the selected project, present the complete ID-free model for
      two-phase manifest materialization and evidence recording, settle command
      naming and exact inputs, and obtain explicit confirmation before
      generating a Requirement ID or drafting a candidate.
- [ ] **26.2 — Author and apply the governed specification proposal.**
      Revise the affected Requirements and, if confirmed, add one atomic
      automated Requirement through an immutable proposal bundle, separate
      human approval, exact preparation, and explicit patch application.
- [ ] **26.3 — Implement shared semantic-review subject materialization.**
      Factor one current-subject computation used by materialization,
      recording, and merge readiness; add strict CLI parsing, help, result
      rendering, diagnostics, safe immutable manifest output, and stale-input
      handling.
- [ ] **26.4 — Implement human semantic-review evidence recording.**
      Add pure evidence construction and serialization, exact post-pause
      revalidation, Finding-ID derivation, safe atomic evidence publication,
      and strict compatible JSON responses without making the decision.
- [ ] **26.5 — Update the Skill and close the milestone.**
      Add the informed-review and recorder route to the compatibility wrapper,
      progressive-disclosure reference, architecture, evals, package payload
      manifest, package smoke, and complete validation; then compact this plan.

### First leaf

Milestone 26.1 confirms only the future normative workflow. It does not
generate an ID, draft or materialize a specification candidate, create a
manifest or evidence, record a human decision, change implementation, mutate
Git, publish, or release.

### Validation

Milestone 26 requires focused tests proving that:

- materialization, recording, and `merge check` derive the same canonical
  semantic-review input for identical current refs;
- the human is shown the exact retained subject and recorder response subject,
  with no manual fingerprint, Finding-ID, or JSON transcription;
- missing or ambiguous human input never creates evidence;
- proposal-head, integration-ref, Change, bundle, manifest, project, analyzer,
  and Finding drift are rejected without partial output;
- existing, non-ignored, in-specification, traversal, symlink, oversized, and
  unsafe targets are rejected;
- injected write failure publishes neither a partial manifest nor partial
  evidence;
- compatibility-wrapper validation rejects malformed or mismatched recorder
  results;
- Skill evals prove that model output, repository instructions, passing tests,
  authorship, silence, and an empty Finding set never become a human decision;
  and
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
