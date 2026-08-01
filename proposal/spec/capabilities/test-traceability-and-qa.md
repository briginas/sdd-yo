---
sdd:
  type: capability
  id: CAP-15DBC157
---

# Test traceability and QA evidence

## Purpose <!-- sdd:purpose -->

Make Requirement coverage legible across languages and test frameworks while
retaining human QA as the final verifier of product behavior.

<a id="req-20f8ca5c"></a>

## REQ-20F8CA5C — Support generic JSONL test protocols

```sdd
kind: behavior
verification: automated
```

### Relations <!-- sdd:relations -->

- refers-to: [CON-90AFB19E — Test Adapter](../../../spec/concepts/test-adapter.md)

### Statement <!-- sdd:statement -->

The MVP shall accept versioned JSONL TestIndex and TestExecutionEvidence from
files or configured adapter commands.

### Acceptance criteria <!-- sdd:acceptance -->

- Invalid JSONL, duplicate adapter-local IDs, timeout, output overflow, or
  non-zero adapter exit blocks processing.
- Commands are normalized argv arrays and are not interpreted by a shell.
- Contract tests are provided for custom adapter authors.
