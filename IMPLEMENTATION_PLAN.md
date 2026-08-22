# SDD Yo implementation plan

## Status

- Active: Milestone 34 — automatic `spec-code` workflow observation; immediate
  leaf 34.1
- Queued: Milestone 35 — automatic `code` workflow observation; Milestone 36 —
  automatic `spec` workflow observation
- Complete: Milestones 0–33; public `sdd-yo@0.5.5`
- Last updated: 2026-08-22

## Milestone 34 — Automatic `spec-code` workflow observation

Milestone 34 automatically makes every bounded Skill-orchestrated `spec-code`
workflow observable, so a person can watch its real orchestration progress
without enabling observation, asking the agent to hand-author events, or
restarting the observer after every step.

### Outcome

Provide one end-to-end observed `spec-code` route:

1. When a person selects one SDD Project and confirms a `spec-code` outcome,
   the Skill automatically initializes exactly one safe ignored project-local
   workflow journal for that run and returns its exact path. Journal creation
   requires no observation opt-in and grants no authoring, approval, patch
   application, implementation, Git, merge, publication, or release authority.
2. After observation starts, the Skill automatically records allowlisted
   events at actual orchestration boundaries, including human-decision waits,
   compatible CLI outcomes, retained artifact references, implementation and
   verification progress, interruption, failure, and completion. It never
   derives status by parsing prose, logs, prompts, reasoning, or elapsed time.
3. A deterministic CLI-owned journal operation validates the selected project,
   run, producer, expected sequence, current journal, event payload, path
   containment, and writer freshness before publishing the next event. The
   Skill invokes that operation through the compatibility wrapper instead of
   reimplementing event or filesystem rules.
4. The same observed workflow can continue across agent turns and compatible
   retries without resetting sequence or duplicating completed boundaries. An
   already-started unobserved workflow may begin a new explicitly partial
   observation from its current checkpoint, but no earlier state is fabricated
   or reconstructed.
5. One running `sdd observe` session follows valid journal publications and
   sends updated deterministic snapshots to its protected loopback page. A
   malformed, stale, conflicting, or failed observation update preserves the
   last valid view and cannot change the underlying workflow result or any
   authoritative artifact.

### User-visible `spec-code` stages

The observer presents one ordered stage model so the person can see both the
current position and the next real decision boundary. Each stage may be
`pending`, `active`, `waiting`, `completed`, `skipped`, `interrupted`, or
`failed` only when an allowlisted event supplies that transition:

1. **Workflow initialization** — select the project and `spec-code` outcome,
   create the run identity and journal, and validate the current project.
2. **Semantic model** — prepare the complete ID-free future behavior model,
   wait for explicit human confirmation, and retain the unchanged confirmed
   model.
3. **Specification candidate** — generate confirmed identities, author the
   complete virtual candidate, and materialize the immutable proposal bundle.
4. **Proposal decision** — present the exact proposal subject, wait for an
   identified human approval or rejection, and record only the supplied
   decision.
5. **Exact specification patch** — discover and revalidate bounded refs,
   prepare the exact patch, wait for application authority, and apply only the
   unchanged selected patch.
6. **Implementation** — plan and perform the implementation against the
   applied specification, with interruption and failure represented without
   inventing completion.
7. **Verification and review** — discover tests, collect current execution and
   QA evidence, validate findings and resolutions, perform human semantic or
   adapter trust review when required, and compute merge readiness from exact
   current inputs.
8. **Local integration** — show not requested, waiting for authority,
   normalization, evidence refresh, fast-forward integration, or completed as
   separate states; never imply remote push, publication, or release.
9. **Terminal outcome** — report completed, interrupted, failed, or rejected
   while preserving approval, readiness, freshness, and integration as
   independent axes.

Optional or inapplicable branches remain visible as `skipped` or not requested
rather than making a later stage appear to have happened. Fine-grained events
may exist inside a stage, but the renderer must keep this stable stage order.

### Change mode and affected authority

- Mode: `spec-code`, because automatic Skill production, resumable journal
  recording, partial observation, and live CLI observer behavior are new
  observable product behavior.
- Expected affected Capabilities:
  `CAP-9D46B7E6` — Read-only workflow progress observation, and
  `CAP-404305F6` — Multi-project CLI and skill integration.
- Relevant active Requirements:
  `REQ-61673C24`, `REQ-1FD47FF6`, `REQ-291769E4`, `REQ-B2001FED`,
  `REQ-627F78A2`, `REQ-2F5B2571`, `REQ-0837358D`, `REQ-26234DC8`, and
  `REQ-A3C3B779`.
- The exact normative revisions and any new Requirement IDs remain
  deliberately unselected until the complete ID-free semantic model is
  explicitly confirmed in 34.1. Milestone planning generates no identity and
  changes no canonical specification.

### Selected architectural direction

- The existing `WorkflowEvent -> WorkflowSnapshot` contract remains the only
  status model. Automatic orchestration is a producer and the loopback page is
  a renderer; neither becomes workflow authority.
- The deterministic CLI owns journal creation, validation, sequence-safe
  publication, and resume checks. The Skill owns route placement and invokes
  only typed compatible operations at actual lifecycle boundaries.
- Observation begins automatically for every selected `spec-code` workflow.
  The journal path and run identity are mechanically created and retained so a
  person is never asked to enable observation or invent or copy them between
  stages.
- Resume uses the retained journal plus explicit current workflow subject; it
  does not rely on chat history or hidden durable state. Stale or competing
  writers fail safely rather than merging, renumbering, or repairing events.
- Status axes change only after their owning authoritative boundary supplies a
  result. Execution completion still implies none of approval, `PASS`, commit,
  integration, push, deployment, publication, or release.
- The long-running observer revalidates complete atomic journal publications
  and publishes only valid later snapshots through the existing protected SSE
  session. File change notification is transport, never event order or state
  authority.

### Boundaries

Milestone 34 covers every Skill-orchestrated `spec-code` workflow after this
behavior is delivered. It does not instrument `spec`, `code`, onboarding,
initiative planning, understand, diagnose, release, or unrelated
repository-maintenance routes. Milestones 35 and 36 extend the shared contract
to `code` and `spec` through separate governed Changes.

It does not add raw-log tailing, prompt or model-reasoning capture, arbitrary
tool telemetry, hosted storage, remote access, authentication, a background
daemon, multi-user synchronization, a Codex plugin, TUI, IDE panel, CI adapter,
or issue-tracker integration. It does not infer or backfill events for work
that occurred before observation began, make a human decision, create evidence,
change authoritative artifacts, mutate Git, merge, publish, or release.

### Planned leaves

- [ ] **34.1 — Confirm the observed `spec-code` semantic contract.**
      Present one complete ID-free model covering automatic observation for
      every selected `spec-code` workflow, journal and run ownership, safe
      generated path, pre-Change identity, the stable user-visible stage model,
      exact orchestration boundaries, waiting and interruption semantics,
      partial start, resume and retry behavior, stale-writer handling, failure
      isolation, live refresh, retention, and terminal states. Stop for explicit
      confirmation before generating IDs or drafting a specification candidate.
- [ ] **34.2 — Author and apply the governed specification proposal.**
      Generate project-aware identities only for the unchanged confirmed
      model, author the complete virtual candidate, materialize and review one
      immutable proposal bundle, record a separate explicit human decision,
      prepare the exact patch, and apply it only after explicit selection.
- [ ] **34.3 — Implement deterministic resumable journal publication.**
      Add the confirmed CLI and library boundary for safe journal creation and
      sequence-checked event publication, compatibility-wrapper support,
      stable diagnostics, atomic contained writes, resumable subject checks,
      stale-writer rejection, and Requirement-named tests. Keep observation
      failure independent from the observed operation.
- [ ] **34.4 — Integrate automatic production into the `spec-code` Skill.**
      Emit events at the confirmed route boundaries, preserve the exact
      journal and run identity across human pauses and retries, update status
      only from compatible authoritative results, map fine-grained events into
      the stable stage order, represent a partial start honestly, and keep every
      existing authority stop intact. Synchronize the packaged Skill payload
      manifest, installation fixtures, and focused evals.
- [ ] **34.5 — Deliver live observation and close the milestone.**
      Make one running loopback observer revalidate atomic journal updates and
      publish later valid snapshots and the current stable stage without
      restart. Prove an end-to-end future run, a mid-process partial start,
      pause/resume, failure isolation, reconnect, shutdown, package behavior,
      npm-user documentation, full repository validation, and normal milestone
      closeout.

### Immediate leaf

Milestone 34.1 is next. It confirms only the future normative and user-state
model. It does not generate IDs, draft or materialize a specification
candidate, create a journal or SDD artifact, invoke an observed `spec-code`
workflow, record a human decision, change the CLI or Skill, start a server,
mutate Git, commit, push, publish, or release.

### Validation

Milestone 34 requires focused proof that:

- every newly selected `spec-code` workflow automatically attempts exactly one
  safe ignored journal initialization for its project and run, with no
  observation toggle, duplicate journal, or broadened workflow authority;
- every confirmed `spec-code` orchestration boundary produces one ordered
  allowlisted event, retries are idempotent, and resume continues the exact
  subject and next sequence across agent turns;
- the stable stage list always identifies the current stage and next decision,
  represents optional branches as skipped or not requested, and never marks a
  stage complete from prose, elapsed time, or a later independent status axis;
- a partial observation starts from an explicit current checkpoint and never
  claims unobserved earlier steps or reconstructs state from logs or chat;
- stale, concurrent, cross-project, traversal-bearing, symbolic, malformed,
  oversized, or incompatible writes fail without partial publication or
  changes to the observed CLI result and authoritative artifact bytes;
- approval, readiness, freshness, and integration change only from their
  authoritative deterministic boundaries and remain independent of execution;
- waiting for semantic confirmation, approval, patch application, semantic
  review, or Git authority is visible without supplying that decision;
- one running loopback page receives valid later snapshots, preserves its last
  valid state on an observation failure, reconnects without duplication, and
  releases watchers, clients, and listeners on shutdown;
- Skill evals preserve progressive disclosure, exact human-decision pauses,
  retained-input reuse, unchanged `spec` and `code` behavior, and
  prompt-injection and secret-exposure boundaries;
- packaged Skill payload hashes, wrapper operation validation, fixtures,
  generated schema types when affected, and the isolated package consumer are
  synchronized; and
- `npm test`, `npm run test:package`, `npm run check:schemas`, `npm run build`,
  `npm run typecheck`, `npm run format:check`, `npm run verify:contracts`, and
  `git diff --check` pass on the final subject.

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
a pure deterministic reducer, injected producers, and a temporary read-only
loopback renderer. Execution, CLI outcome, approval, merge readiness, artifact
freshness, and integration remain independent axes. The observer accepts one
explicit project-relative journal, serves only exact referenced regular files,
and cannot record a decision, run a gate, mutate Git, publish, or release.
Journals and snapshots are removable observation data rather than hidden
workflow state or authoritative evidence. Additional terminal, IDE, CI, or
hosted adapters remain deferred renderers over the same observation contract.

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
