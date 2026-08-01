import assert from "node:assert/strict";
import test from "node:test";

import { isProjectPath, isRequirementId } from "../src/contracts/identifiers.ts";
import type { ProjectPath, RequirementId } from "../src/contracts/identifiers.ts";
import { validateSpecificationGraph } from "../src/graph/validate-graph.ts";
import type { ValidatedSpecificationGraph } from "../src/graph/validate-graph.ts";
import { parseSpecificationDocument } from "../src/markdown/parse-markdown.ts";
import { AffectedScopeError, computeAffectedScope } from "../src/verification/affected-scope.ts";

const indexSource = `---
sdd:
  type: index
---
# Scope graph

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Scope](capability.md)

## Concepts <!-- sdd:concepts -->

- [CON-A1000001 — Shared concept](concept.md)
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Scope

## Purpose <!-- sdd:purpose -->

Exercise affected scope.

<a id="req-a1000001"></a>

## REQ-A1000001 — First dependent

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

- depends-on: [REQ-A1000002 — Second dependent](capability.md#req-a1000002)

### Statement <!-- sdd:statement -->

The first behavior shall depend on the second.

### Acceptance criteria <!-- sdd:acceptance -->

- The first behavior is verified.

<a id="req-a1000002"></a>

## REQ-A1000002 — Second dependent

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

- depends-on: [REQ-A1000003 — Concept user](capability.md#req-a1000003)

### Statement <!-- sdd:statement -->

The second behavior shall depend on the concept user.

### Acceptance criteria <!-- sdd:acceptance -->

- The second behavior is verified.

<a id="req-a1000003"></a>

## REQ-A1000003 — Concept user

\`\`\`sdd
kind: invariant
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

- refers-to: [CON-A1000001 — Shared concept](concept.md)

### Statement <!-- sdd:statement -->

The behavior shall use the shared concept.

### Acceptance criteria <!-- sdd:acceptance -->

- The concept use is verified.
`;

function concept(definition: string): string {
  return `---
sdd:
  type: concept
  id: CON-A1000001
---

# Shared concept

## Definition <!-- sdd:definition -->

${definition}
`;
}

function graph(
  capability: string,
  conceptSource = concept("The original shared definition."),
): ValidatedSpecificationGraph {
  const sources = [
    ["README.md", indexSource],
    ["capability.md", capability],
    ["concept.md", conceptSource],
  ] as const;
  const documents = sources.map(([path, source]) => {
    assert.ok(isProjectPath(path));
    const parsed = parseSpecificationDocument(path, new TextEncoder().encode(source));
    assert.ok(parsed.ok, parsed.ok ? undefined : parsed.diagnostics[0]?.code);
    return parsed.value;
  });
  const entrypoint: ProjectPath = "README.md" as ProjectPath;
  const result = validateSpecificationGraph(documents, entrypoint);
  assert.ok(result.ok, result.ok ? undefined : result.diagnostics[0]?.code);
  return result.value;
}

function requirementId(value: string): RequirementId {
  assert.ok(isRequirementId(value));
  return value;
}

test("REQ-89AFB91E expands semantic Concept impact through transitive active dependents", () => {
  const before = graph(capabilitySource);
  const after = graph(capabilitySource, concept("The changed shared definition."));
  const first = computeAffectedScope({ before, after });
  const second = computeAffectedScope({ before, after });
  assert.deepEqual(first.affected_requirements, ["REQ-A1000001", "REQ-A1000002", "REQ-A1000003"]);
  assert.deepEqual(first.affected_capabilities, ["CAP-A1000001"]);
  assert.equal(new TextDecoder().decode(first.canonical_bytes), new TextDecoder().decode(second.canonical_bytes));
  assert.equal(first.fingerprint, second.fingerprint);
});

test("REQ-89AFB91E expands explicit code targets and rejects inactive targets", () => {
  const value = graph(capabilitySource);
  const scope = computeAffectedScope({
    before: value,
    after: value,
    code_targets: [requirementId("REQ-A1000002")],
  });
  assert.deepEqual(scope.affected_requirements, ["REQ-A1000001", "REQ-A1000002"]);
  assert.deepEqual(scope.affected_capabilities, ["CAP-A1000001"]);
  assert.throws(
    () =>
      computeAffectedScope({
        before: value,
        after: value,
        code_targets: [requirementId("REQ-FFFFFFFF")],
      }),
    (error) => error instanceof AffectedScopeError && error.code === "SDD_GRAPH_CODE_TARGET_UNKNOWN",
  );
});

test("REQ-89AFB91E starts from directly modified active Requirements", () => {
  const modified = capabilitySource
    .replace("- depends-on: [REQ-A1000003 — Concept user](capability.md#req-a1000003)\n", "")
    .replace(
      "The second behavior shall depend on the concept user.",
      "The second behavior shall remain independently observable.",
    );
  const scope = computeAffectedScope({ before: graph(capabilitySource), after: graph(modified) });
  assert.deepEqual(scope.affected_requirements, ["REQ-A1000001", "REQ-A1000002"]);
  assert.deepEqual(scope.affected_capabilities, ["CAP-A1000001"]);
});

test("REQ-89AFB91E excludes deleted Requirements but retains their former Capability for QA", () => {
  const afterCapability = capabilitySource.slice(0, capabilitySource.indexOf('<a id="req-a1000001"></a>'));
  const scope = computeAffectedScope({ before: graph(capabilitySource), after: graph(afterCapability) });
  assert.deepEqual(scope.affected_requirements, []);
  assert.deepEqual(scope.affected_capabilities, ["CAP-A1000001"]);
});
