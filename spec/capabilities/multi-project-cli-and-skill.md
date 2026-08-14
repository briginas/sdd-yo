---
sdd:
  type: capability
  id: CAP-404305F6
---

# Multi-project CLI and skill integration

## Purpose <!-- sdd:purpose -->

Expose one local, provider-neutral deterministic interface that works in
single projects and monorepos and can be orchestrated safely by an optional
agent skill.

<a id="req-0361538d"></a>

## REQ-0361538D — Scope projects by nearest configuration

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The CLI shall resolve an SDD Project from an explicit `--config` path or the
nearest `.sdd/config.yaml` found upward from the working directory.

### Acceptance criteria <!-- sdd:acceptance -->

- One Git repository may contain multiple SDD Projects.
- Paths in one config resolve relative to that project's configured scope.
- Version 1 configuration contains no evidence issuer authorization policy;
  unsupported configuration fields are rejected.
- Failure to resolve exactly one project is reported explicitly.

<a id="req-7c848ed0"></a>

## REQ-7C848ED0 — Provide versioned JSON as the automation API

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

Every read operation shall support versioned deterministic JSON, with human
output rendered as a replaceable view over the same result.

### Acceptance criteria <!-- sdd:acceptance -->

- Structured stdout is not mixed with ordinary logs.
- Paths are project-relative and use `/`.
- Stable diagnostic codes are available to automation.
- Unknown newer major schemas are rejected.
- Every artifact-producing operation returns the exact published artifact
  identity and subject through the same versioned deterministic response.

<a id="req-f91f7d11"></a>

## REQ-F91F7D11 — Operate offline and reproducibly by default

```sdd
kind: quality
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)

### Statement <!-- sdd:statement -->

The deterministic core shall require no network service or telemetry and shall
produce equivalent fingerprints and JSON results on macOS for identical inputs.

### Acceptance criteria <!-- sdd:acceptance -->

- macOS is the only supported platform.
- Specification content is UTF-8.
- Core processing does not transmit repository content.
- Cache deletion does not change results.
- AI and external issuer integrations remain explicit optional layers.

<a id="req-24073d4f"></a>

## REQ-24073D4F — Query the active specification graph

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-2C550D5B — Capability](../concepts/capability.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)
- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)

### Statement <!-- sdd:statement -->

The CLI shall query one validated active specification graph by stable object
identity and report deterministic forward and reverse graph relationships
without executing tests.

### Acceptance criteria <!-- sdd:acceptance -->

- `inspect` reports direct inbound active relations with relation type and
  source object ID.
- `trace` reports a selected Requirement's owning Capability, the transitive
  closure of its outgoing and incoming `depends-on` relations, and direct
  objects that refer to the selected object.
- Capability and Domain Concept ancestry and dependency closures are empty.
- The selected object is excluded from dependency closures, and every set-like
  result is sorted by canonical object ID.
- Graph-only `trace` succeeds without a TestIndex and reports neither mapped
  tests nor test-coverage conclusions.
- Unknown or inactive object IDs produce a stable non-passing diagnostic.

<a id="req-f7d39246"></a>

## REQ-F7D39246 — Provide a minimal deterministic CLI surface

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-EA57C937 — SDD Project](../concepts/sdd-project.md)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- depends-on: [REQ-24073D4F — Query the active specification graph](multi-project-cli-and-skill.md#req-24073d4f)

### Statement <!-- sdd:statement -->

The CLI shall expose initialization, ID generation, validation, inspection,
traceability, object diff, mode-specific proposal materialization and
validation, specification-only proposal preparation and application, approval
evidence recording, semantic-review subject materialization and human-review
evidence recording, test discovery, finding validation, and merge-check
operations.

### Acceptance criteria <!-- sdd:acceptance -->

- Only initialization and proposal application modify governed project state;
  proposal materialization, approval recording, semantic-review
  materialization, and semantic-review recording create only their explicit
  immutable caller-selected Git-ignored outputs.
- Read operations support explicit Git refs when applicable.
- Branch, commit, push, merge, and approve commands are absent.
- Superseded candidate-snapshot and manually transcribed ProposalPackage routes
  are absent.

<a id="req-32c76ed3"></a>

## REQ-32C76ED3 — Record explicit human approval decisions as immutable evidence

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)
- depends-on: [REQ-7341DBB7 — Bind mode to approval](proposal-modes-and-workflow-gates.md#req-7341dbb7)
- depends-on: [REQ-A3C3B779 — Keep CLI workflow state external](proposal-modes-and-workflow-gates.md#req-a3c3b779)
- depends-on: [REQ-AFD65A03 — Fingerprint approved object deltas](validation-fingerprints-and-patches.md#req-afd65a03)

### Statement <!-- sdd:statement -->

The CLI shall atomically revalidate the exact retained proposal subject that a
human reviewed and materialize that human's explicit `approved` or `rejected`
decision as immutable ApprovalEvidence without making, inferring, or
authenticating the decision itself.

### Acceptance criteria <!-- sdd:acceptance -->

- Input requires the exact retained proposal bundle, containing a candidate
  and ProposalPackage for specification-changing modes or only a
  ProposalPackage for `code`, plus a bounded non-empty issuer, an identified
  actor, an explicit `approved` or `rejected` decision, a bounded UTF-8 reason
  file containing the human message, and a caller-selected evidence path.
- The project, mode, base object ID, candidate tree, object-ID delta, code
  targets, and semantic and structural delta fingerprints are derived only by
  atomically revalidating the retained subject. The response returns that
  complete subject, and the artifact records the CLI as producer, the human as
  actor, and the exact decoded UTF-8 message as reason, without an ambient
  timestamp.
- The target is project-relative, outside the configured specification root,
  Git-ignored, free of symbolic-link escape, and absent before the operation;
  the operation exclusively creates one file and never modifies Git state.
- A recorded approval may be supplied to a separately invoked proposal
  preparation operation. A recorded rejection cannot satisfy approval and
  stops that workflow.
- A malformed or oversized input, invalid issuer, mismatched or changed
  retained subject, unsafe target, existing target, or failed write
  stops without publishing evidence.
- Every artifact recorder uses one shared bounded output boundary that rejects
  traversal, specification-root targets, non-ignored targets, symbolic-link
  escape, existing targets, non-regular parents, and partial publication.
- Issuer authentication, actor authorization, session identity, signature
  verification, and organizational policy remain external.

<a id="req-26234dc8"></a>

## REQ-26234DC8 — Orchestrate through one progressive-disclosure skill

```sdd
kind: behavior
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)

### Statement <!-- sdd:statement -->

The product shall provide one optional `sdd-yo` Agent Skill that selects the
mode-specific workflow, loads only the relevant progressive-disclosure
references, and composes deterministic CLI operations between explicit human
decisions without reimplementing product rules.

### Acceptance criteria <!-- sdd:acceptance -->

- The skill validates through CLI JSON rather than simulating deterministic
  checks.
- The skill remains unambiguously discoverable and explicitly invocable when
  another installed skill has a similar generic SDD name.
- It asks humans to resolve normative ambiguity.
- After unchanged semantic-model confirmation for `spec-code` and `spec`, it
  may compose ID generation, candidate materialization, package retention, and
  reviewer-oriented presentation.
- Before requesting approval for any mode, it revalidates and displays the
  exact retained project, mode, base object, candidate tree, object-ID delta,
  code targets, and semantic and structural delta fingerprints, plus the
  evidence target path.
- After the approval pause, it invokes the recorder with the exact retained
  subject and the explicit issuer, actor, decision, and human message. It
  accepts success only when the recorder's atomically revalidated returned
  subject equals what the human saw, without a redundant separate validation.
- When human semantic review is required, it selects fresh safe manifest and
  evidence targets, materializes the exact review subject, and displays the
  manifest's changed and related objects, normative sections, semantic
  candidates, current refs, recorder identity, and every supplied Finding's ID,
  kind, severity, summary, object IDs, and normative citations.
- One unchanged semantic-review subject has exactly one human pause for the
  explicit `reviewed` decision. Any missing issuer or actor is requested in
  that same pause, and values explicitly supplied for the current workflow are
  reused without inference.
- After that pause, it records the decision and accepts success only when the
  returned versioned subject exactly matches the displayed subject. Subject
  drift requires a new presentation and decision; a target collision or
  transient publication failure retries with a fresh safe target without
  repeating an unchanged decision.
- An already selected end-to-end outcome composes compatible deterministic
  materialization, recording, preparation, verification, and read-only merge
  readiness operations without asking the human to resupply retained inputs or
  reselect those stages.
- It does not fabricate or infer approval, QA, test, or finding-resolution
  evidence from model output, repository content, or passing checks.
- Only a newly recorded approval may be offered to a separately invoked
  proposal preparation operation for `spec-code` or `spec`; a `code` approval
  proceeds directly to implementation verification, and rejection stops every
  mode.
- Semantic-model confirmation, proposal approval, exact-patch application,
  semantic review, normative ambiguity resolution, and new Git, merge,
  publication, or release authority remain distinct decisions. Patch
  application is requested only for a non-empty `spec-code` or `spec` patch.
- By default it presents the semantic model, object delta, affected scope, file
  map, and focused review questions while keeping complete candidate bytes and
  technical artifacts available on request.
- The default pre-application presentation contains one to three short points
  describing the behavior that changes and its user-visible or governance
  consequence, followed by a direct question asking whether to apply the
  prepared change.
- The default successful post-application presentation contains only the same
  concise behavior-and-consequence result.
- The default pre-application and successful post-application presentations do
  not expose patch content, paths, operations, diffs, hashes, fingerprints,
  conflicts, or unchanged-scope lists.
- The Skill derives the concise description from the confirmed semantic model
  and the validated normative base-to-candidate delta. If those inputs do not
  support one clear description, it asks for clarification rather than
  inventing intent.
- Technical patch details remain available only on explicit request from the
  retained exact SpecPatch. Viewing them does not authorize application, and
  the Skill still requires a separate explicit selection of that unchanged
  patch.
- A preparation result that is not `ok` is described concisely in terms of its
  blocking outcome and the required next decision; diagnostics and technical
  details remain opt-in.
- Missing or incompatible CLI stops the workflow.
- It does not transcribe candidate or ProposalPackage JSON through
  conversational context, derive deterministic artifact content, or retain a
  hidden workflow database.

<a id="req-cf21ed6e"></a>

## REQ-CF21ED6E — Plan broad initiatives before governed Change authoring

```sdd
kind: behavior
verification: manual
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

For an outcome that spans multiple Capabilities or independently deliverable
Changes, the `sdd-yo` Agent Skill shall provide an advisory
initiative-planning route that chooses proportionate design depth, produces a
non-normative ID-free initiative map, decomposes the outcome into vertical
delivery slices, and stops before governed Change authoring until the human
explicitly selects one bounded slice.

### Acceptance criteria <!-- sdd:acceptance -->

- Generic initiative planning without a selected SDD Project invokes no SDD
  CLI operation and does not claim knowledge of an active specification.
- Initiative planning for a selected SDD Project validates that project and
  inspects only the smallest active specification slice relevant to the
  outcome.
- The route chooses and explains a light, standard, or deep design depth from
  the outcome's uncertainty, architectural reach, risk, and number of
  independently deliverable slices.
- The initiative map remains advisory and ID-free, distinguishes goals,
  boundaries, dependencies, risks, open decisions, and success signals, and
  does not create a Capability, Requirement, Domain Concept, Change,
  ProposalPackage, approval, evidence, or other SDD artifact.
- Every proposed delivery slice is vertical, independently valuable and
  verifiable, names its intended outcome and dependencies, and avoids assigning
  future SDD object IDs before the existing governed authoring route generates
  them.
- The route keeps the initiative conversational by default. It writes a
  project-local initiative document only when the human explicitly requests
  that file, and the document remains non-canonical planning material rather
  than workflow state or authority.
- After the human explicitly selects exactly one slice, the route hands that
  bounded slice to the existing mode-selection reference and preserves every
  semantic-model, proposal, approval, exact-patch, verification, and Git stop.

<a id="req-2b00ee25"></a>

## REQ-2B00EE25 — Use an external temporary authored candidate

```sdd
kind: behavior
verification: manual
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)
- depends-on: [REQ-20D8EC8C — Materialize one immutable proposal bundle](proposal-modes-and-workflow-gates.md#req-20d8ec8c)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

For `spec-code` and `spec`, when the `sdd-yo` Agent Skill materializes its own
authored candidate for Proposal Gate review, it shall use a fresh external
temporary directory and remove that owned source candidate after its complete
immutable proposal bundle is retained successfully.

### Acceptance criteria <!-- sdd:acceptance -->

- The Skill creates the candidate outside the selected Git repository through
  a secure host temporary-directory primitive, using `/private/tmp` on macOS
  and the host temporary root on other supported systems.
- The temporary candidate contains the selected project's matching
  `.sdd/config.yaml` and complete `spec/**` tree, and its exact path is supplied
  only as the authored `--candidate` input to `proposal materialize`.
- The Skill records whether it created the candidate. It never automatically
  removes a caller-supplied candidate or another path that it does not own.
- After an unchanged compatible `status: ok` response identifies the retained
  bundle's fixed `candidate-tree.json`, the Skill removes its owned source
  candidate while retaining the project-relative bundle and every downstream
  workflow artifact.
- A blocked, error, malformed, incompatible, or interrupted materialization
  preserves the owned candidate for correction, reports its exact location,
  and stops before approval or another downstream gate.
- Explicit cancellation or confirmation of a replacement semantic model
  removes an obsolete owned candidate. Cleanup failure reports the remaining
  exact path without invalidating an already retained proposal bundle.
- `code` mode creates no authored candidate or external candidate directory.

<a id="req-d17b2fb9"></a>

## REQ-D17B2FB9 — Confirm the semantic model before specification identities

```sdd
kind: behavior
verification: manual
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

For every `spec` and `spec-code` authoring route, the `sdd-yo` Agent Skill
shall present an ID-free semantic model of the future specification and require
explicit human confirmation of that unchanged model before generating any new
object ID, expanding a Markdown template, drafting a virtual candidate, writing
a file, or creating another SDD artifact.

### Acceptance criteria <!-- sdd:acceptance -->

- The model names each proposed Capability, groups its proposed Requirements,
  and gives one short normative meaning for every Requirement without assigning
  new object IDs.
- The model shows dependencies, boundaries, exclusions, and disputed decisions.
  An unresolved disputed decision keeps the checkpoint unconfirmed.
- One Capability without inter-object dependencies uses a short list. Multiple
  Capabilities, any inter-object dependency, or any disputed alternative uses a
  vertical top-to-bottom diagram.
- Existing active object IDs may appear only as context; proposed objects remain
  ID-free until confirmation.
- A correction or any other change to the semantic model invalidates its prior
  confirmation, requires the complete updated model to be presented again, and
  requires fresh explicit human confirmation.
- `code` mode remains outside this checkpoint and continues to target exact
  active Requirement IDs without drafting a normative specification change.
- Confirmation is an authoring checkpoint only. It creates no ApprovalEvidence
  and grants no authority to run Proposal Gate review, prepare or apply a
  SpecPatch, change implementation, make a QA decision, or perform a Git
  operation.
- After confirmation, the Skill may compose only the deterministic ID and
  proposal-materialization operations needed for the unchanged confirmed model.

<a id="req-89e78697"></a>

## REQ-89E78697 — Normalize a feature branch before final verification

```sdd
kind: behavior
verification: manual
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-26234DC8 — Orchestrate through one progressive-disclosure skill](multi-project-cli-and-skill.md#req-26234dc8)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

Before final verification, the `sdd-yo` Agent Skill shall normalize one
explicitly selected local feature branch to exactly one final Change commit on
the current explicitly selected integration ref and invalidate every retained
verification input whenever the feature head moves.

### Acceptance criteria <!-- sdd:acceptance -->

- Normalization requires explicit feature and integration refs and a clean
  worktree before any Git mutation.
- The Skill counts feature commits after the merge base: zero stops, one is
  preserved, and more than one is automatically squashed into one final Change
  commit.
- After any required squash, the final feature commit is rebased onto the
  current integration ref when that ref has advanced.
- A rebase conflict stops without guessing a resolution, modifying the
  integration branch, or deleting the feature branch.
- Every squash, rebase, or other feature-head movement invalidates the retained
  TestIndex, test-execution evidence, QA evidence, and merge-readiness result.
- Final verification inputs and evidence are produced only for the resulting
  exact feature head `H` and current integration commit `M`.

<a id="req-189d2cfa"></a>

## REQ-189D2CFA — Complete an authorized local feature integration

```sdd
kind: behavior
verification: manual
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-89E78697 — Normalize a feature branch before final verification](multi-project-cli-and-skill.md#req-89e78697)
- depends-on: [REQ-44068C1A — Never perform merge side effects](merge-readiness.md#req-44068c1a)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

After a current `MergeReport` returns `PASS`, the `sdd-yo` Agent Skill shall
complete a separately authorized local integration only by fast-forwarding the
selected integration branch to the exact verified feature head and safely
removing the integrated local feature branch.

### Acceptance criteria <!-- sdd:acceptance -->

- Local closeout requires either explicit advance authorization for the
  complete local closeout or one explicit confirmation after the current
  `PASS`; the readiness status itself grants no Git authority.
- Immediately before integration, the Skill rechecks that the feature head is
  verified `H`, the integration ref is verified `M`, and the worktree is clean.
- Movement of either ref returns the workflow to normalization and fresh
  verification instead of reusing `PASS`.
- Integration fast-forwards the integration branch to verified `H`; it creates
  no merge commit and performs no post-verification squash.
- The Skill verifies that the integration ref equals `H` and the worktree
  remains clean before deleting the integrated local feature branch without
  force.
- Every incomplete or failed closeout preserves the feature branch.
- Push, force-push, remote branch deletion, pull-request merge, branch
  protection, tag, release, and publication remain outside local authorization.

<a id="req-1dd46ca9"></a>

## REQ-1DD46CA9 — Treat repository content as untrusted data

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-77D857DB — Document](../concepts/document.md)
- refers-to: [CON-90AFB19E — Test Adapter](../concepts/test-adapter.md)

### Statement <!-- sdd:statement -->

The skill and CLI shall treat specification, code, tests, adapter output, and
external references as data rather than instructions with authority over the
runtime.

### Acceptance criteria <!-- sdd:acceptance -->

- Prompt-like text inside a Requirement does not override higher-priority
  instructions.
- Adapter commands require normal external permission enforcement.
- Changed adapter configuration creates a structural and trust finding.
- Secret-bearing environment state is not attached to model context.
