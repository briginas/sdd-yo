---
sdd:
  type: capability
  id: CAP-9D46B7E6
---

# Read-only workflow progress observation

## Purpose <!-- sdd:purpose -->

Let a person understand the current execution and governed status of workflows
for one selected SDD Project without making observation state a new source of
specification, approval, verification, merge, or Git authority.

<a id="req-61673c24"></a>

## REQ-61673C24 — Emit versioned workflow events

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

An observation producer shall emit versioned structured workflow events that
identify one explicit project, Change, run, step, and monotonic sequence value
and contain only event-type-specific allowlisted fields.

### Acceptance criteria <!-- sdd:acceptance -->

- Event order is determined by sequence within a run; timestamps are optional
  display metadata and never determine replay order.
- Event types identify actual orchestration boundaries, human-decision waits,
  compatible CLI outcomes, retained artifact references, implementation and
  verification progress, interruption, failure, rejection, and completion;
  they never derive a boundary from prose, logs, prompts, reasoning, or elapsed
  time.
- Event and identifier size, supported major version, project containment, and
  event-type payload shape are validated before the event changes a snapshot.
- Raw stdout, stderr, prompts, model reasoning, unrestricted environment state,
  credentials, response bodies, and arbitrary tool logs are not event fields.
- Malformed, oversized, traversal-bearing, unsupported-major, or cross-project
  events fail with stable diagnostics and no partial state.

<a id="req-02f9fab3"></a>

## REQ-02F9FAB3 — Replay events deterministically

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-61673C24 — Emit versioned workflow events](read-only-workflow-progress-observation.md#req-61673c24)

### Statement <!-- sdd:statement -->

A pure reducer shall replay validated workflow events into one deterministic
current snapshot without consulting wall-clock time, filesystem discovery, Git,
or hidden workflow state.

### Acceptance criteria <!-- sdd:acceptance -->

- Identical ordered events produce byte-equivalent snapshots after fresh
  replay, restart, duplicate delivery, and reconnect.
- An exact duplicate sequence and event is idempotent; a conflicting duplicate,
  sequence gap, or out-of-order new event fails without partial state.
- Run and step transitions reject impossible regressions with stable
  diagnostics rather than repairing or inferring missing events.
- A snapshot is a derived view and is fully recoverable from the retained
  observation journal when that journal exists.

<a id="req-1fd47ff6"></a>

## REQ-1FD47FF6 — Keep workflow status axes independent

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-02F9FAB3 — Replay events deterministically](read-only-workflow-progress-observation.md#req-02f9fab3)
- depends-on: [REQ-82256D82 — Produce deterministic structured merge reports](merge-readiness.md#req-82256d82)

### Statement <!-- sdd:statement -->

Every workflow snapshot shall represent execution lifecycle, deterministic CLI
outcome, merge readiness, and authoritative-artifact freshness as separate
typed axes that cannot overwrite or imply one another.

### Acceptance criteria <!-- sdd:acceptance -->

- Execution lifecycle distinguishes active, waiting, interrupted, failed, and
  completed runs and their current steps.
- CLI outcome preserves the exact available deterministic status without
  converting it into execution or readiness state.
- Merge readiness preserves PASS, REVIEW_REQUIRED, BLOCKED, or unavailable
  separately from execution completion.
- Artifact freshness distinguishes current, stale, missing, or unknown only
  when supplied by an authoritative deterministic boundary.
- Completed never implies approved, PASS, committed, merged, pushed, deployed,
  published, or released.

<a id="req-291769e4"></a>

## REQ-291769E4 — Reference authoritative subjects without replacing them

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)
- depends-on: [REQ-A3C3B779 — Keep CLI workflow state external](proposal-modes-and-workflow-gates.md#req-a3c3b779)

### Statement <!-- sdd:statement -->

Observation state may reference exact bounded Git subjects and retained
versioned workflow artifacts but shall never replace, modify, reconstruct, or
be accepted as any decision-bearing input or result.

### Acceptance criteria <!-- sdd:acceptance -->

- References identify an allowlisted artifact kind plus a project-relative,
  traversal-free path and an available exact fingerprint or Git object ID.
- Artifact links are navigation metadata; the referenced artifact remains the
  authoritative value and is revalidated by its owning workflow operation.
- Observation does not derive approval, readiness, freshness, resolution, or
  integration state from file names, English output, event absence, repository
  prose, passing tests, authorship, model confidence, or elapsed time.
- Deleting observation data does not delete or change a referenced artifact.

<a id="req-b2001fed"></a>

## REQ-B2001FED — Isolate observation producers

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-61673C24 — Emit versioned workflow events](read-only-workflow-progress-observation.md#req-61673c24)
- depends-on: [REQ-291769E4 — Reference authoritative subjects without replacing them](read-only-workflow-progress-observation.md#req-291769e4)

### Statement <!-- sdd:statement -->

Library, CLI, and Agent Skill orchestration shall produce observation events
only at explicit typed boundaries, and observation failure shall not change the
underlying command result, workflow artifact, or authorized side effect.

### Acceptance criteria <!-- sdd:acceptance -->

- Producer APIs accept allowlisted structured values rather than parsing logs
  or capturing unrestricted process context.
- A producer write failure is reported as observation failure without changing
  the deterministic CLI response or decision-bearing artifact bytes.
- Producer ownership is explicit for each run; events from another producer,
  project, or run cannot update that snapshot.
- Observation APIs do not grant permission to execute a command or Git action.
- A stale or competing writer fails before publication and cannot renumber,
  merge, repair, or replace events produced by the current run owner.

<a id="req-b5d3be6b"></a>

## REQ-B5D3BE6B — Publish resumable project-local workflow journals

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-61673C24 — Emit versioned workflow events](read-only-workflow-progress-observation.md#req-61673c24)
- depends-on: [REQ-02F9FAB3 — Replay events deterministically](read-only-workflow-progress-observation.md#req-02f9fab3)
- depends-on: [REQ-B2001FED — Isolate observation producers](read-only-workflow-progress-observation.md#req-b2001fed)
- depends-on: [REQ-A3C3B779 — Keep CLI workflow state external](proposal-modes-and-workflow-gates.md#req-a3c3b779)

### Statement <!-- sdd:statement -->

The deterministic CLI shall create and publish one contained mode-scoped
project-local workflow journal for an explicit run through sequence-checked
operations that support compatible resume without hidden workflow state.

### Acceptance criteria <!-- sdd:acceptance -->

- Initialization validates the selected project, pre-Change run identity,
  producer, supported workflow mode, mode-scoped generated ignored path, and
  absence of an existing journal before atomically publishing sequence zero.
- A `code` journal additionally resolves the selected base to one exact Git
  object, binds a canonical non-empty set of exact active Requirement targets
  with their semantic and structural fingerprints, and preserves that complete
  subject across resume and publication.
- Publication validates the selected project, run, producer, expected next
  sequence, current complete journal, allowlisted event payload, path
  containment, symbolic-link boundaries, size limits, and writer freshness
  before one atomic replacement.
- Resume requires the retained journal plus an explicit current workflow
  subject, continues from the next sequence, and treats an exact completed
  boundary as idempotent without duplicating it.
- A mismatched subject, stale writer, conflicting duplicate, missing sequence,
  malformed or oversized journal, traversal-bearing path, cross-project input,
  or incompatible version fails with stable diagnostics and preserves the last
  complete journal bytes.
- Journal initialization and publication report observation outcomes
  separately and never change the result or authorized side effect of the
  workflow operation being observed.

<a id="req-627f78a2"></a>

## REQ-627F78A2 — Retain removable non-authoritative observation data

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-A3C3B779 — Keep CLI workflow state external](proposal-modes-and-workflow-gates.md#req-a3c3b779)
- depends-on: [REQ-B2001FED — Isolate observation producers](read-only-workflow-progress-observation.md#req-b2001fed)

### Statement <!-- sdd:statement -->

Observation journals and derived snapshots shall use bounded project-local
retention as removable non-authoritative data, with interruption and observer
failure represented explicitly rather than inferred as an SDD gate decision.

### Acceptance criteria <!-- sdd:acceptance -->

- Retention enforces configured entry and byte limits through deterministic
  whole-run eviction and never truncates or rewrites an authoritative artifact.
- Producer interruption, observer failure, renderer disconnect, and process
  interruption are distinct observation conditions and never become an
  automatic CLI BLOCKED or merge-readiness result.
- Removing the observation journal or cache removes only derived progress
  visibility and leaves every authoritative SDD input and result unchanged.
- Retained paths reject traversal and symbolic-link escape and contain no
  secret, raw-log, prompt, reasoning, or unrestricted environment content.
- A workflow that starts observation after work has already occurred records an
  explicit partial checkpoint and never fabricates or reconstructs earlier
  events from chat, logs, repository state, or retained artifact names.

<a id="req-2f5b2571"></a>

## REQ-2F5B2571 — Serve one protected loopback view

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-02F9FAB3 — Replay events deterministically](read-only-workflow-progress-observation.md#req-02f9fab3)
- depends-on: [REQ-44068C1A — Never perform merge side effects](merge-readiness.md#req-44068c1a)

### Statement <!-- sdd:statement -->

An on-demand local observer shall serve an initial workflow snapshot and
one-way live updates through a temporary capability-protected loopback session
without exposing workflow mutation operations.

### Acceptance criteria <!-- sdd:acceptance -->

- The server binds only to a loopback address on an operating-system-selected
  port and never becomes a daemon or remote service.
- Each session uses an unguessable capability and rejects missing or invalid
  capabilities, unsafe origins, methods, and paths.
- The initial snapshot and Server-Sent Events use deterministic versioned JSON;
  reconnect and exact duplicate delivery preserve the same derived snapshot.
- Observer failure or client disconnect does not change producer execution or
  authoritative state, and shutdown releases listeners and resources cleanly.
- One running session follows later complete atomic publications for its exact
  journal, revalidates the entire publication, and sends only valid later
  snapshots; malformed, stale, conflicting, or failed updates preserve the
  last valid view.
- The transport exposes no endpoint that records approval, applies a patch,
  creates evidence, runs a gate, mutates Git, publishes, or releases.

<a id="req-0837358d"></a>

## REQ-0837358D — Render accessible workflow progress

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-1FD47FF6 — Keep workflow status axes independent](read-only-workflow-progress-observation.md#req-1fd47ff6)
- depends-on: [REQ-291769E4 — Reference authoritative subjects without replacing them](read-only-workflow-progress-observation.md#req-291769e4)
- depends-on: [REQ-2F5B2571 — Serve one protected loopback view](read-only-workflow-progress-observation.md#req-2f5b2571)

### Statement <!-- sdd:statement -->

The local renderer shall provide accessible read-only run-list and run-detail
views that expose current steps, independent governed status axes, explicit
interruptions, and available authoritative-artifact links without requiring a
person to read logs.

### Acceptance criteria <!-- sdd:acceptance -->

- A person can distinguish execution completed, approval state, merge PASS,
  artifact freshness, and integration state from a bounded rendered fixture.
- Waiting, interrupted, failed, disconnected, unavailable, and stale states
  have explicit text in addition to visual styling.
- The run detail preserves ordered steps and exact deterministic outcomes and
  labels artifact navigation as view-only.
- Keyboard navigation, programmatic labels, focus visibility, document
  landmarks, and live-update announcements remain usable without color alone.
- The renderer contains no workflow mutation control and does not infer state
  from missing events or elapsed time.

<a id="req-6a40513d"></a>

## REQ-6A40513D — Project one stable observed spec-code stage model

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-02F9FAB3 — Replay events deterministically](read-only-workflow-progress-observation.md#req-02f9fab3)
- depends-on: [REQ-1FD47FF6 — Keep workflow status axes independent](read-only-workflow-progress-observation.md#req-1fd47ff6)
- depends-on: [REQ-0837358D — Render accessible workflow progress](read-only-workflow-progress-observation.md#req-0837358d)
- depends-on: [REQ-B5D3BE6B — Publish resumable project-local workflow journals](read-only-workflow-progress-observation.md#req-b5d3be6b)

### Statement <!-- sdd:statement -->

An observed `spec-code` run shall project allowlisted workflow events into one
stable ordered stage model that identifies the current stage and next real
decision boundary without implying independent authority or unobserved work.

### Acceptance criteria <!-- sdd:acceptance -->

- The ordered stages are workflow initialization, semantic model,
  specification candidate, proposal decision, exact specification patch,
  implementation, verification and review, local integration, and terminal
  outcome.
- A stage changes only when an allowlisted event supplies `pending`, `active`,
  `waiting`, `completed`, `skipped`, `interrupted`, or `failed`; optional and
  inapplicable branches remain visible as skipped or not requested.
- Waiting distinguishes semantic confirmation, proposal decision, patch
  application, semantic review, adapter trust review, and local Git authority
  without supplying or inferring the requested decision.
- Terminal completed, interrupted, failed, or rejected remains separate from
  approval, merge readiness, artifact freshness, and local integration state.
- A partial run marks earlier unobserved stages explicitly and begins only from
  the supplied current checkpoint.

<a id="req-7b9b6531"></a>

## REQ-7B9B6531 — Project one exact observed code workflow

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-02F9FAB3 — Replay events deterministically](read-only-workflow-progress-observation.md#req-02f9fab3)
- depends-on: [REQ-1FD47FF6 — Keep workflow status axes independent](read-only-workflow-progress-observation.md#req-1fd47ff6)
- depends-on: [REQ-0837358D — Render accessible workflow progress](read-only-workflow-progress-observation.md#req-0837358d)
- depends-on: [REQ-B5D3BE6B — Publish resumable project-local workflow journals](read-only-workflow-progress-observation.md#req-b5d3be6b)
- depends-on: [REQ-5FFEC13F — Derive the unchanged code proposal subject](proposal-modes-and-workflow-gates.md#req-5ffec13f)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

An observed `code` run shall preserve one exact implementation-only subject
and project allowlisted workflow events into one stable ordered stage model
without adding specification-changing ceremony or implying independent
authority.

### Acceptance criteria <!-- sdd:acceptance -->

- The run is bound to mode `code`, one resolved base Git object, and a
  canonical non-empty set of exact active Requirement targets with their
  semantic and structural fingerprints; resume and publication reject any
  subject drift without changing the owning workflow.
- The ordered stages are workflow initialization and targets, code proposal,
  proposal decision, implementation, verification and review, local
  integration, and terminal outcome.
- No semantic-model, authored specification-candidate, branch-preparation, or
  exact-SpecPatch stage is present, completed, or inferred for `code`.
- Proposal progress references the package-only unchanged ProposalPackage;
  that retained package remains authoritative and observation never replaces
  or reconstructs its subject.
- Waiting distinguishes only real boundaries, including proposal decision,
  semantic review, adapter trust review, implementation authority when
  required by the selected workflow, and local Git authority, without
  supplying or inferring a decision.
- A partial run marks earlier unobserved `code` stages explicitly; terminal
  completed, interrupted, failed, or rejected remains separate from approval,
  merge readiness, artifact freshness, and local integration state.

<a id="req-5a23a618"></a>

## REQ-5A23A618 — Follow valid journal publications live

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-B5D3BE6B — Publish resumable project-local workflow journals](read-only-workflow-progress-observation.md#req-b5d3be6b)
- depends-on: [REQ-2F5B2571 — Serve one protected loopback view](read-only-workflow-progress-observation.md#req-2f5b2571)
- depends-on: [REQ-6A40513D — Project one stable observed spec-code stage model](read-only-workflow-progress-observation.md#req-6a40513d)
- depends-on: [REQ-7B9B6531 — Project one exact observed code workflow](read-only-workflow-progress-observation.md#req-7b9b6531)

### Statement <!-- sdd:statement -->

One running protected loopback observer shall follow valid later publications
of its selected workflow journal and deliver the current deterministic snapshot
and stable stage projection without restart.

### Acceptance criteria <!-- sdd:acceptance -->

- File notification triggers complete-journal revalidation and replay and is
  never treated as event order, workflow state, or authority.
- Only a strictly valid later snapshot is published to connected clients;
  malformed, stale, conflicting, truncated, or unreadable updates preserve the
  last valid snapshot and expose an observer condition separately.
- Reconnect delivers the current snapshot without duplicating a completed
  boundary, and shutdown releases file watchers, SSE clients, and the loopback
  listener.
- Live refresh never records a decision, runs a workflow operation, mutates an
  authoritative artifact, changes Git, or broadens loopback access.
