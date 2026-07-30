---
sdd:
  type: capability
  id: CAP-F31EF876
---

# Semantic review and conflict analysis

## Purpose <!-- sdd:purpose -->

Surface likely quality and semantic compatibility problems while reserving
final judgment for authorized humans.

<a id="req-dff6bfa6"></a>

## REQ-DFF6BFA6 — Generate deterministic conflict candidates

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- refers-to: [CON-3E620A28 — Change](../concepts/change.md)

### Statement <!-- sdd:statement -->

The core shall generate semantic review candidates from overlapping object
changes, shared Concepts, Requirement dependencies, deletion conflicts, and
incompatible graph operations.

### Acceptance criteria <!-- sdd:acceptance -->

- Candidate generation is deterministic.
- Textually separate changes may still become candidates.
- Candidate generation does not declare semantic conflict by itself.

<a id="req-18f84ce2"></a>

## REQ-18F84CE2 — Keep AI semantic analysis optional

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)

### Statement <!-- sdd:statement -->

Model-assisted semantic analysis shall be an optional accelerator and shall not
be a trusted decision-maker or a dependency of deterministic core validation.

### Acceptance criteria <!-- sdd:acceptance -->

- Mechanical validation works offline without a model.
- A human may review candidates when AI is unavailable.
- The model cannot approve, dismiss, waive, or merge.

<a id="req-04f23007"></a>

## REQ-04F23007 — Limit semantic analysis context

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

Semantic analysis shall receive only changed objects, candidate related
objects, relevant Concept definitions, dependencies, and normative sections.

### Acceptance criteria <!-- sdd:acceptance -->

- Whole-repository context is not attached by default.
- Input object and section IDs are recorded.
- Input content is bound by a fingerprint.

<a id="req-a76942a0"></a>

## REQ-A76942A0 — Emit evidence-backed structured findings

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)

### Statement <!-- sdd:statement -->

Every model-assisted Finding shall satisfy a local schema and cite concrete
object IDs and normative section IDs supporting its summary.

### Acceptance criteria <!-- sdd:acceptance -->

- Free-form hidden reasoning is not required or stored.
- Confidence is informational and affects sorting only.
- Malformed model output is rejected.
- Finding IDs are derived deterministically from analyzer and input identity.

<a id="req-20aaa622"></a>

## REQ-20AAA622 — Require human resolution of review findings

```sdd
kind: invariant
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- refers-to: [CON-4365C0F6 — Evidence](../concepts/evidence.md)

### Statement <!-- sdd:statement -->

Every open semantic or quality Finding required by a gate shall receive a
current human decision before the gate can pass.

### Acceptance criteria <!-- sdd:acceptance -->

- Supported decisions are `dismissed`, eligible `waived`, and `confirmed`.
- A reason is required for dismissal and waiver.
- A confirmed issue blocks until the relevant input changes and analysis is
  rerun.

<a id="req-fb66e5d6"></a>

## REQ-FB66E5D6 — Prohibit semantic conflict waivers

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- depends-on: [REQ-20AAA622 — Require human resolution of review findings](#req-20aaa622)

### Statement <!-- sdd:statement -->

A semantic conflict Finding shall not accept a `waived` resolution.

### Acceptance criteria <!-- sdd:acceptance -->

- A false conflict may be dismissed with reason.
- A confirmed conflict remains blocked until the specification changes.
- Waiver remains available only to explicitly eligible quality findings.

<a id="req-adf9965a"></a>

## REQ-ADF9965A — Invalidate resolutions when inputs change

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- refers-to: [CON-FC16381E — Fingerprint](../concepts/fingerprint.md)

### Statement <!-- sdd:statement -->

A Finding resolution shall be valid only for the exact Finding and input
fingerprint it names.

### Acceptance criteria <!-- sdd:acceptance -->

- Changing any cited object invalidates the resolution.
- The Finding is recomputed rather than permanently marked resolved.
- Cached findings are keyed by analyzer version and full input fingerprint.

<a id="req-2af962eb"></a>

## REQ-2AF962EB — Require review when semantic analysis is unavailable

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)
- depends-on: [REQ-18F84CE2 — Keep AI semantic analysis optional](#req-18f84ce2)

### Statement <!-- sdd:statement -->

When semantic review is required and no model analysis is available, the gate
shall return `REVIEW_REQUIRED` until a human provides equivalent review
evidence.

### Acceptance criteria <!-- sdd:acceptance -->

- AI unavailability is not treated as a structural failure.
- The core does not silently skip required semantic review.
- Human review evidence names the candidate input fingerprint.

<a id="req-bdafd401"></a>

## REQ-BDAFD401 — Avoid completeness claims for semantic analysis

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-E2F84A01 — Finding](../concepts/finding.md)

### Statement <!-- sdd:statement -->

SDD Yo shall not claim that an empty semantic Finding set proves the absence
of all semantic conflicts.

### Acceptance criteria <!-- sdd:acceptance -->

- Reports distinguish performed analysis from proof.
- Human merge authority remains responsible for final judgment.

<a id="req-b5815bb5"></a>

## REQ-B5815BB5 — Expand impact from changed Concepts

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-88F1C731 — Domain Concept](../concepts/domain-concept.md)
- refers-to: [CON-9F69CC0E — Requirement](../concepts/requirement.md)

### Statement <!-- sdd:statement -->

A semantic Domain Concept change shall add every directly referring
Requirement and its transitive dependents to semantic review and verification
scope.

### Acceptance criteria <!-- sdd:acceptance -->

- Concept definition, identity, state vocabulary, and semantic relations
  participate in impact analysis.
- Rationale, examples, and formatting do not expand impact.

