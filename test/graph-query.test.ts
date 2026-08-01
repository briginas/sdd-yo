import assert from "node:assert/strict";
import test from "node:test";

import { isObjectId, isProjectPath } from "../src/contracts/identifiers.ts";
import type { ObjectId } from "../src/contracts/identifiers.ts";
import { directReverseRelations, traceGraphObject } from "../src/graph/query-graph.ts";
import { validateSpecificationGraph } from "../src/graph/validate-graph.ts";
import { parseSpecificationDocument } from "../src/markdown/parse-markdown.ts";
import type { SpecificationDocument } from "../src/markdown/types.ts";

const encoder = new TextEncoder();

function parse(pathValue: unknown, source: string): SpecificationDocument {
  assert.ok(isProjectPath(pathValue));
  const parsed = parseSpecificationDocument(pathValue, encoder.encode(source));
  assert.ok(parsed.ok, parsed.ok ? undefined : parsed.diagnostics[0]?.code);
  return parsed.value;
}

function objectId(value: unknown): ObjectId {
  assert.ok(isObjectId(value));
  return value;
}

const indexSource = `---
sdd:
  type: index
---
# Query graph

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Query capability](capability.md)

## Concepts <!-- sdd:concepts -->

- [CON-A1000001 — Shared concept](concept.md)
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Query capability

## Purpose <!-- sdd:purpose -->

Exercise deterministic graph queries.

<a id="req-a1000001"></a>

## REQ-A1000001 — First Requirement

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

- depends-on: [REQ-A1000002 — Second Requirement](capability.md#req-a1000002)

### Statement <!-- sdd:statement -->

The first behavior shall depend on the second.

### Acceptance criteria <!-- sdd:acceptance -->

- The first dependency is visible.

<a id="req-a1000002"></a>

## REQ-A1000002 — Second Requirement

\`\`\`sdd
kind: invariant
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

- depends-on: [REQ-A1000003 — Third Requirement](capability.md#req-a1000003)

### Statement <!-- sdd:statement -->

The second behavior shall depend on the third.

### Acceptance criteria <!-- sdd:acceptance -->

- The second dependency is visible.

<a id="req-a1000003"></a>

## REQ-A1000003 — Third Requirement

\`\`\`sdd
kind: constraint
verification: manual
\`\`\`

### Relations <!-- sdd:relations -->

- refers-to: [CON-A1000001 — Shared concept](concept.md)
- refers-to: [CON-A1000001 — Shared concept](concept.md)

### Statement <!-- sdd:statement -->

The third behavior shall refer to the shared concept.

### Acceptance criteria <!-- sdd:acceptance -->

- The concept referrer is visible once.
`;

const conceptSource = `---
sdd:
  type: concept
  id: CON-A1000001
---

# Shared concept

## Definition <!-- sdd:definition -->

A shared concept used by the query fixture.
`;

test("REQ-24073D4F computes sorted transitive Requirement closures and direct referrers", () => {
  const entrypointValue: unknown = "README.md";
  assert.ok(isProjectPath(entrypointValue));
  const result = validateSpecificationGraph(
    [parse("README.md", indexSource), parse("capability.md", capabilitySource), parse("concept.md", conceptSource)],
    entrypointValue,
  );
  assert.ok(result.ok, result.ok ? undefined : result.diagnostics[0]?.code);

  assert.deepEqual(traceGraphObject(result.value, objectId("REQ-A1000001")), {
    object_id: "REQ-A1000001",
    ancestry: ["CAP-A1000001"],
    dependencies: ["REQ-A1000002", "REQ-A1000003"],
    dependents: [],
    referrers: [],
  });
  assert.deepEqual(traceGraphObject(result.value, objectId("REQ-A1000003")), {
    object_id: "REQ-A1000003",
    ancestry: ["CAP-A1000001"],
    dependencies: [],
    dependents: ["REQ-A1000001", "REQ-A1000002"],
    referrers: [{ type: "depends-on", source_id: "REQ-A1000002" }],
  });
  assert.deepEqual(directReverseRelations(result.value, objectId("CON-A1000001")), [
    { type: "refers-to", source_id: "REQ-A1000003" },
  ]);
});

test("REQ-24073D4F keeps Capability and Concept closures empty and returns no test conclusions", () => {
  const entrypointValue: unknown = "README.md";
  assert.ok(isProjectPath(entrypointValue));
  const result = validateSpecificationGraph(
    [parse("README.md", indexSource), parse("capability.md", capabilitySource), parse("concept.md", conceptSource)],
    entrypointValue,
  );
  assert.ok(result.ok);
  const capability = traceGraphObject(result.value, objectId("CAP-A1000001"));
  assert.deepEqual(capability, {
    object_id: "CAP-A1000001",
    ancestry: [],
    dependencies: [],
    dependents: [],
    referrers: [],
  });
  const concept = traceGraphObject(result.value, objectId("CON-A1000001"));
  assert.deepEqual(concept, {
    object_id: "CON-A1000001",
    ancestry: [],
    dependencies: [],
    dependents: [],
    referrers: [{ type: "refers-to", source_id: "REQ-A1000003" }],
  });
  assert.equal("mapped_tests" in (concept ?? {}), false);
  assert.equal(traceGraphObject(result.value, objectId("REQ-FFFFFFFF")), undefined);
});
