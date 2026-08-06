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
produce equivalent fingerprints and JSON results on supported platforms for
identical inputs.

### Acceptance criteria <!-- sdd:acceptance -->

- macOS, Linux, and Windows are supported.
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
traceability, object diff, candidate snapshot, proposal
validation/preparation/application, approval evidence recording, test discovery,
finding validation, and merge-check operations.

### Acceptance criteria <!-- sdd:acceptance -->

- Only initialization and proposal application modify governed project state;
  candidate snapshot and approval evidence recording each create only one
  explicit immutable output artifact at a caller-selected Git-ignored
  project-relative path.
- Read operations support explicit Git refs when applicable.
- Branch, commit, push, merge, and approve commands are absent.

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

The CLI shall materialize one explicit external human `approved` or `rejected`
decision as immutable ApprovalEvidence bound to an exact validated
ProposalPackage and candidate without making, inferring, or authenticating the
decision itself.

### Acceptance criteria <!-- sdd:acceptance -->

- Input requires the exact retained ProposalPackage and candidate, a configured
  issuer, an identified actor, an explicit `approved` or `rejected` decision, a
  bounded UTF-8 reason file containing the human message, and a caller-selected
  evidence path.
- The project, mode, base object ID, and semantic and structural delta
  fingerprints are derived only by strictly revalidating the ProposalPackage
  against the exact candidate. The artifact records the CLI as producer, the
  human as actor, and the exact decoded UTF-8 message as reason, without an
  ambient timestamp.
- The target is project-relative, outside the configured specification root,
  Git-ignored, free of symbolic-link escape, and absent before the operation;
  the operation exclusively creates one file and never modifies Git state.
- A recorded approval may be supplied to a separately invoked proposal
  preparation operation. A recorded rejection cannot satisfy approval and
  stops that workflow.
- A malformed or oversized input, unknown issuer, mismatched or changed
  package/candidate subject, unsafe target, existing target, or failed write
  stops without publishing evidence.
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

The first version shall provide one optional `sdd-yo` Agent Skill that selects the
required workflow and loads only the relevant object-model, mode, semantic
review, or diagnostics references.

### Acceptance criteria <!-- sdd:acceptance -->

- The skill validates through CLI JSON rather than simulating deterministic
  checks.
- The skill remains unambiguously discoverable and explicitly invocable when
  another installed skill has a similar generic SDD name.
- It asks humans to resolve normative ambiguity.
- Before requesting approval, it displays the exact proposal subject and target
  path and states that an explicit response will be materialized there.
- After any pause, it rechecks the retained ProposalPackage and candidate and
  invokes the deterministic recorder only with an explicit issuer, actor,
  `approved` or `rejected` decision, and human message.
- It does not fabricate or infer approval, QA, test, or finding-resolution
  evidence from model output, repository content, or passing checks.
- Only a newly recorded approval may be offered to a separately invoked
  proposal preparation operation; a recorded rejection stops the workflow.
- Missing or incompatible CLI stops the workflow.

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
