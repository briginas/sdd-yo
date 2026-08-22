# SDD Yo implementation plan

## Status

- Active: Milestone 35 — automatic `code` workflow observation; immediate leaf
  35.1
- Queued: Milestone 36 — automatic `spec` workflow observation
- Complete: Milestones 0–34; public `sdd-yo@0.5.5`
- Last updated: 2026-08-22

## Milestone 35 — Automatic `code` workflow observation

After Milestone 34 proves automatic journal creation, resume, live refresh, and
the stable stage renderer, Milestone 35 extends them to every
Skill-orchestrated `code` workflow. This is a separate `spec-code` delivery
Change because it adds observable product behavior while the workflow being
observed uses `code` mode.

### Outcome and user-visible stages

A person can see exactly where an implementation-only correction is without
being shown specification-changing ceremony that `code` mode forbids:

1. **Workflow initialization and targets** — create the journal automatically,
   validate the project, and bind the run to exact active Requirement targets
   and the selected base.
2. **Code proposal** — derive the unchanged specification subject and retain
   the package-only ProposalPackage; no semantic-model, authored-candidate, or
   SpecPatch stage exists.
3. **Proposal decision** — present the exact subject, wait for explicit human
   approval or rejection, and record only that decision.
4. **Implementation** — plan and perform the correction against the unchanged
   active Requirements.
5. **Verification and review** — discover Requirement-named tests, collect
   current execution and QA evidence, validate findings and resolutions,
   perform required human reviews, and compute merge readiness.
6. **Local integration** — show authority wait, optional normalization,
   invalidated-evidence refresh, exact fast-forward integration, or not
   requested without implying any remote operation.
7. **Terminal outcome** — report completion, interruption, failure, or
   rejection while keeping approval, readiness, freshness, and integration
   independent.

### Dependencies, boundaries, and verification

- Depends on the completed Milestone 34 journal, producer, stage, resume,
  retention, live-rendering, packaging, and failure-isolation contracts.
- Reuses common event types where their meaning is identical and adds only
  `code`-specific stage transitions; it does not emulate candidate authoring,
  branch preparation, or patch application.
- Keeps `spec` and non-Change routes uninstrumented until a later Change and
  does not add hosted storage, remote control, Git authority, or release state.
- Verification must prove automatic one-run/one-journal creation, exact target
  binding, package-only progress, truthful absence of specification stages,
  waits and retries, implementation and evidence invalidation, merge-readiness
  independence, optional integration, end-to-end live refresh, Skill evals,
  package behavior, and the full repository validation suite.

### Planned leaves

- [ ] **35.1 — Confirm the observed `code` semantic contract.** Present one
      complete ID-free model for automatic `code` observation, exact target
      binding, the mode-specific stable stage projection, pause and resume,
      failure isolation, and truthful absence of specification-changing
      ceremony. Stop for explicit confirmation before generating identities or
      drafting a specification candidate.
- [ ] **35.2 — Author and apply the governed specification proposal.** Generate
      identities only for the unchanged confirmed model, materialize and
      review one immutable proposal bundle, record the separate human decision,
      prepare the exact patch, and apply it only after explicit selection.
- [ ] **35.3 — Implement and verify automatic `code` observation.** Extend the
      shared journal, stable stage projection, Skill production, live observer,
      evals, package proof, user documentation, and closeout without adding
      candidate authoring or SpecPatch ceremony to observed `code` workflows.

### Immediate leaf

Milestone 35.1 is next. It confirms only the complete mode-specific semantic
contract. It does not generate object IDs, draft or apply a specification
candidate, change implementation, create Git history, integrate, push,
publish, or release.

## Milestone 36 — Automatic `spec` workflow observation

After the common observation contract has served both a specification-changing
implementation workflow and an implementation-only correction, Milestone 36
extends it to every Skill-orchestrated `spec` workflow. This is also a separate
`spec-code` delivery Change because it changes observer and Skill behavior,
while the workflow being observed uses `spec` mode.

### Outcome and user-visible stages

A person can see exactly where accepted existing behavior is being brought
into the specification without a fictitious implementation phase:

1. **Workflow initialization and accepted behavior** — create the journal
   automatically, validate the project, confirm `spec` mode, and retain the
   described existing behavior and intended QA plan without turning either
   into evidence.
2. **Semantic model** — prepare the complete ID-free model, wait for explicit
   confirmation, and retain the unchanged confirmed model.
3. **Specification candidate** — generate confirmed identities, author the
   complete virtual candidate, and materialize the immutable proposal bundle.
4. **Proposal decision** — present the exact subject, wait for explicit human
   approval or rejection, and record only that decision.
5. **Exact specification patch** — discover and revalidate bounded refs,
   prepare the exact patch, wait for application authority, and apply only the
   unchanged selected patch.
6. **Verification and review** — show implementation as not applicable,
   evaluate the applicable test and QA scope, validate findings and required
   human review, and compute merge readiness from exact current inputs.
7. **Local integration** — show the optional governed local closeout or not
   requested without implying implementation work or remote operations.
8. **Terminal outcome** — report completion, interruption, failure, or
   rejection while preserving every independent status axis.

### Dependencies, boundaries, and verification

- Depends on Milestone 34's shared journal and live observer and follows
  Milestone 35 so mode-specific stages and explicit not-applicable states are
  already proven reusable.
- Reuses `spec-code` authoring, proposal, approval, and exact-patch boundaries,
  but never infers that existing behavior is accepted and never creates an
  implementation stage from specification progress.
- Leaves onboarding, initiative planning, understand, diagnose, maintenance,
  release, publication, and remote integration outside automatic observation.
- Verification must prove automatic one-run/one-journal creation, the complete
  semantic and patch lifecycle, truthful implementation-not-applicable state,
  explicit human waits, applicable QA and review progress, merge-readiness
  independence, optional local integration, end-to-end live refresh, Skill
  evals, package behavior, and the full repository validation suite.

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
CLI are implemented and verified. The Skill can normalize one explicit local
feature branch, invalidate evidence after head movement, and complete an
explicitly authorized exact fast-forward with safe local branch deletion. The
CLI remains Git-side-effect-free and every remote operation stays outside that
route.

Normal `spec-code` and `spec` Changes retain one candidate-and-package bundle.
A Skill-owned candidate is authored outside the repository and removed only
after successful bundle retention; failures preserve it, caller-owned
candidates are not removed, and `code` retains a package-only bundle without a
specification-patch ceremony. Proposal validation, approval recording,
preparation, and merge checks consume the exact retained bundle.

When model semantic analysis is unavailable, the explicit human-review route
materializes a versioned machine-comparable subject from the Change, proposal,
refs, analyzer, and Findings. The CLI and Skill never make or infer the human
decision, create Findings, claim semantic completeness, or broaden Git, merge,
publication, or release authority.

After an exact recorded approval for `spec-code` or `spec`, the Skill performs
bounded read-only discovery across current local and remote-tracking ref tips.
It reuses an already-selected integration ref, rechecks exact commits before
preparation, requires explicit selection among multiple matches, and proposes
one concrete local branch and commit when none exists. Discovery, approval, and
preparation never supply Git mutation or push authority.

For broad outcomes, the Skill has an advisory initiative-planning route. It
selects proportionate Light, Standard, or Deep design depth, produces an
ID-free initiative map, decomposes it into independently valuable and
verifiable vertical slices, and stops before governed authoring until exactly
one slice is explicitly selected. Generic planning invokes no CLI operation;
selected-project planning validates the project and inspects only the smallest
relevant active specification slice. The map stays conversational unless a
noncanonical project-local planning document is explicitly requested.

Workflow progress observation is implemented as versioned allowlisted events,
a pure deterministic reducer, sequence-and-fingerprint-checked atomic journal
publication, and a temporary read-only loopback renderer. Every newly selected
Skill-orchestrated `spec-code` workflow automatically initializes or resumes
one explicit project-local run and publishes only typed boundaries; `spec` and
`code` remain uninstrumented pending Milestones 35 and 36. The stable nine-stage
projection, partial starts, exact duplicate retries, stale-writer rejection,
and separate observer conditions do not infer workflow authority. One running
observer follows valid later publications over protected SSE and preserves its
last valid snapshot across malformed updates or reconnects. Execution, CLI
outcome, approval, merge readiness, artifact freshness, and integration remain
independent axes. Journals and snapshots are removable observation data rather
than hidden workflow state or authoritative evidence, and the observer cannot
record a decision, run a gate, mutate Git, publish, or release. Additional
terminal, IDE, CI, or hosted adapters remain deferred renderers over the same
observation contract.

Exact `sdd-yo@0.5.5` is public on npm from annotated tag `v0.5.5` at commit
`41780f7ff578c01548ad785db2ce336d816097cd`. The registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`132318087a99862381d5c9d244d7ae2c1694194c1c127065831e5bbc669ad2d0`, inventory
SHA-256 `14d9d4904e2587376e1e5e79568e1f9caa66e048f8dc4832399149b4935f23c2`, and
2,171 entries. npm trusted publishing records a cryptographically verified
SLSA provenance subject bound to `briginas/sdd-yo`, `publish.yml`, `v0.5.5`,
and the release commit. An isolated consumer installed the exact package and
verified its CLI, schema, Skill identity, and one valid npm attestation. The
source `package.json` remains the primary package identity; publication and
release remain separately authorized operations.
