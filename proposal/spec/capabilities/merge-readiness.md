---
sdd:
  type: capability
  id: CAP-205F5DBC
---

# Merge readiness

## Purpose <!-- sdd:purpose -->

Combine current specification, approval, test, QA, conflict, and Git evidence
into a deterministic readiness decision without performing the merge.

<a id="req-41edf9a3"></a>

## REQ-41EDF9A3 — Distinguish product statuses from CLI usage errors

```sdd
kind: invariant
verification: automated
```

### Relations <!-- sdd:relations -->

- depends-on: [REQ-BCFA15D8 — Return exactly three readiness statuses](../../../spec/capabilities/merge-readiness.md#req-bcfa15d8)

### Statement <!-- sdd:statement -->

CLI exit codes shall distinguish merge readiness from malformed invocation or
unreadable configuration.

### Acceptance criteria <!-- sdd:acceptance -->

- `PASS` uses exit code `0`.
- `BLOCKED` uses exit code `1`.
- `REVIEW_REQUIRED` uses exit code `2`.
- Technical CLI usage or configuration failure uses exit code `3`.

<a id="req-220945c2"></a>

## REQ-220945C2 — Require current authorized human decisions

```sdd
kind: constraint
verification: manual
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-4365C0F6 — Evidence](../../../spec/concepts/evidence.md)

### Statement <!-- sdd:statement -->

Merge Gate shall require current approval, QA, governance, and finding
resolution evidence applicable to the Change and configured policy.

### Acceptance criteria <!-- sdd:acceptance -->

- The CLI validates issuer names and subject fingerprints.
- Authentication and organizational authorization of actors remain external.
- Contradictory evidence prevents `PASS`.

<a id="req-82256d82"></a>

## REQ-82256D82 — Produce deterministic structured merge reports

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-4365C0F6 — Evidence](../../../spec/concepts/evidence.md)
- refers-to: [CON-E2F84A01 — Finding](../../../spec/concepts/finding.md)

### Statement <!-- sdd:statement -->

Merge Gate shall produce a versioned JSON report and an equivalent
human-readable view containing scope, deltas, traceability, evidence,
conflicts, diagnostics, and final status.

### Acceptance criteria <!-- sdd:acceptance -->

- JSON ordering is deterministic.
- Human output is not treated as the stable API.
- Reports identify governed-scope-only status during incremental adoption.
- Reports do not claim proof of semantic completeness.

<a id="req-44068c1a"></a>

## REQ-44068C1A — Never perform merge side effects

```sdd
kind: constraint
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-3E620A28 — Change](../../../spec/concepts/change.md)

### Statement <!-- sdd:statement -->

SDD Yo shall report merge readiness but shall not create commits, push
branches, apply merges, or modify branch protection.

### Acceptance criteria <!-- sdd:acceptance -->

- External local, CI, or hosting workflows consume the exit code and report.
- No readiness status grants the CLI additional Git mutation authority.
