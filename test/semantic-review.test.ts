import assert from "node:assert/strict";
import test from "node:test";

import { isProjectId, isProjectPath } from "../src/contracts/identifiers.ts";
import type { ProjectId, ProjectPath } from "../src/contracts/identifiers.ts";
import { validateSpecificationGraph } from "../src/graph/validate-graph.ts";
import type { ValidatedSpecificationGraph } from "../src/graph/validate-graph.ts";
import { parseSpecificationDocument } from "../src/markdown/parse-markdown.ts";
import { computeAffectedScope } from "../src/verification/affected-scope.ts";
import { buildSemanticAnalysisInputManifest, generateSemanticCandidates } from "../src/verification/semantic-review.ts";

const indexSource = `---
sdd:
  type: index
---
# Semantic graph

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Semantic review](capability.md)

## Concepts <!-- sdd:concepts -->

- [CON-A1000001 — Shared state](concept.md)
- [CON-B1000002 — Related state](related-concept.md)
`;

type Relation = { readonly type: "depends-on" | "refers-to"; readonly id: string; readonly title: string };

function requirement(id: string, title: string, statement: string, relations: readonly Relation[] = []): string {
  const relationLines = relations.map((relation) => {
    const target = relation.id.startsWith("CON-") ? "concept.md" : `capability.md#${relation.id.toLowerCase()}`;
    return `- ${relation.type}: [${relation.id} — ${relation.title}](${target})`;
  });
  return `<a id="${id.toLowerCase()}"></a>

## ${id} — ${title}

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

${relationLines.join("\n")}

### Statement <!-- sdd:statement -->

${statement}

### Acceptance criteria <!-- sdd:acceptance -->

- ${title} is observable.
`;
}

function capability(requirements: readonly string[]): string {
  return `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Semantic review

## Purpose <!-- sdd:purpose -->

Exercise deterministic semantic review.

${requirements.join("\n")}`;
}

function concept(
  definition: string,
  options: {
    readonly identity?: string;
    readonly states?: readonly string[];
    readonly relatesToSecond?: boolean;
    readonly rationale?: string;
  } = {},
): string {
  const states = options.states ?? ["ready", "closed"];
  return `---
sdd:
  type: concept
  id: CON-A1000001
---

# Shared state

## Definition <!-- sdd:definition -->

${definition}

## Identity <!-- sdd:identity -->

${options.identity ?? "The state is identified by its stable key."}

## States <!-- sdd:states -->

- ${states.join("\n- ")}

## Relations <!-- sdd:relations -->

${options.relatesToSecond === true ? "- relates-to: [CON-B1000002 — Related state](related-concept.md)" : ""}

${options.rationale === undefined ? "" : `## Rationale <!-- sdd:rationale -->\n\n${options.rationale}`}
`;
}

const relatedConceptSource = `---
sdd:
  type: concept
  id: CON-B1000002
---

# Related state

## Definition <!-- sdd:definition -->

The related state is stable.
`;

function graph(
  requirements: readonly string[],
  conceptDefinition: string | undefined = "The shared state is ready or closed.",
  conceptOptions: Parameters<typeof concept>[1] = {},
) {
  const sources = [
    ["README.md", indexSource],
    ["capability.md", capability(requirements)],
    ["concept.md", concept(conceptDefinition ?? "The shared state is ready or closed.", conceptOptions)],
    ["related-concept.md", relatedConceptSource],
  ] as const;
  const documents = sources.map(([path, source]) => {
    assert.ok(isProjectPath(path));
    const parsed = parseSpecificationDocument(path, new TextEncoder().encode(source));
    assert.ok(parsed.ok, parsed.ok ? undefined : parsed.diagnostics[0]?.code);
    return parsed.value;
  });
  const entrypoint: ProjectPath = "README.md" as ProjectPath;
  const validated = validateSpecificationGraph(documents, entrypoint);
  assert.ok(validated.ok, validated.ok ? undefined : validated.diagnostics[0]?.code);
  return validated.value;
}

const first = (statement = "The first behavior uses shared state.") =>
  requirement("REQ-A1000001", "First behavior", statement, [
    { type: "depends-on", id: "REQ-A1000002", title: "Second behavior" },
    { type: "refers-to", id: "CON-A1000001", title: "Shared state" },
  ]);
const second = () =>
  requirement("REQ-A1000002", "Second behavior", "The second behavior also uses shared state.", [
    { type: "refers-to", id: "CON-A1000001", title: "Shared state" },
  ]);
const dependent = () =>
  requirement("REQ-A1000003", "Dependent behavior", "The dependent behavior follows the first.", [
    { type: "depends-on", id: "REQ-A1000001", title: "First behavior" },
  ]);
const unrelated = () => requirement("REQ-A1000004", "Unrelated behavior", "The unrelated behavior stays isolated.");

function projectId(): ProjectId {
  const value: unknown = "SDD-A1000001";
  assert.ok(isProjectId(value));
  return value;
}

test("REQ-DFF6BFA6 REQ-B5815BB5 generates dependency, shared-Concept, and transitive Concept-impact candidates", () => {
  const before = graph([first(), second(), dependent(), unrelated()]);
  const after = graph(
    [first("The first behavior uses the changed shared state."), second(), dependent(), unrelated()],
    "The shared state is ready, suspended, or closed.",
  );
  const candidates = generateSemanticCandidates({ base: before, candidate: after });
  assert.ok(
    candidates.some(
      (candidate) =>
        candidate.reason === "shared-concept" &&
        candidate.objects.join(",") === "CON-A1000001,REQ-A1000001,REQ-A1000002",
    ),
  );
  assert.ok(
    candidates.some(
      (candidate) =>
        candidate.reason === "requirement-dependency" && candidate.objects.join(",") === "REQ-A1000001,REQ-A1000003",
    ),
  );
  const conceptImpact = candidates
    .filter((candidate) => candidate.reason === "changed-concept-impact")
    .flatMap((candidate) => candidate.objects)
    .filter((id) => id.startsWith("REQ-"));
  assert.deepEqual([...new Set(conceptImpact)].toSorted(), ["REQ-A1000001", "REQ-A1000002", "REQ-A1000003"]);
  assert.deepEqual(candidates, generateSemanticCandidates({ base: before, candidate: after }));
});

test("REQ-B5815BB5 expands identity, state, and semantic-relation changes but ignores rationale", () => {
  const requirements = [first(), second(), dependent(), unrelated()];
  const base = graph(requirements);
  const variants = [
    graph(requirements, undefined, { identity: "The state uses a replacement stable identity." }),
    graph(requirements, undefined, { states: ["ready", "suspended", "closed"] }),
    graph(requirements, undefined, { relatesToSecond: true }),
  ];
  for (const candidate of variants) {
    const semantic = generateSemanticCandidates({ base, candidate });
    assert.ok(
      semantic.some(
        (item) => item.reason === "changed-concept-impact" && item.objects.some((id) => id === "REQ-A1000003"),
      ),
    );
    assert.deepEqual(computeAffectedScope({ before: base, after: candidate }).affected_requirements, [
      "REQ-A1000001",
      "REQ-A1000002",
      "REQ-A1000003",
    ]);
  }
  const rationaleOnly = graph(requirements, undefined, { rationale: "This explanatory note changed." });
  assert.deepEqual(generateSemanticCandidates({ base, candidate: rationaleOnly }), []);
  assert.deepEqual(computeAffectedScope({ before: base, after: rationaleOnly }).affected_requirements, []);
});

test("REQ-DFF6BFA6 distinguishes overlapping changes from incompatible graph operations and deletion conflicts", () => {
  const base = graph([requirement("REQ-A1000001", "First behavior", "The original behavior applies.")]);
  const proposed = graph([requirement("REQ-A1000001", "First behavior", "The proposed behavior applies.")]);
  const concurrent = graph([requirement("REQ-A1000001", "First behavior", "The concurrent behavior applies.")]);
  assert.ok(
    generateSemanticCandidates({ base, candidate: proposed, comparison: concurrent }).some(
      (candidate) => candidate.reason === "overlapping-object-change",
    ),
  );

  const deleted = graph([]);
  assert.ok(
    generateSemanticCandidates({ base, candidate: deleted, comparison: concurrent }).some(
      (candidate) => candidate.reason === "incompatible-graph-operation",
    ),
  );

  const deletionBase = graph([
    requirement("REQ-A1000001", "First behavior", "The first behavior depends on the second.", [
      { type: "depends-on", id: "REQ-A1000002", title: "Second behavior" },
    ]),
    second(),
  ]);
  const deletionCandidate = graph([
    requirement("REQ-A1000001", "First behavior", "The first behavior is now independent."),
  ]);
  assert.ok(
    generateSemanticCandidates({ base: deletionBase, candidate: deletionCandidate }).some(
      (candidate) =>
        candidate.reason === "deletion-conflict" && candidate.objects.join(",") === "REQ-A1000001,REQ-A1000002",
    ),
  );
});

test("REQ-04F23007 REQ-B5815BB5 REQ-18F84CE2 emits only bounded normative context in a stable manifest", () => {
  const before = graph([first(), second(), dependent(), unrelated()]);
  const after = graph(
    [first("The first behavior uses the changed shared state."), second(), dependent(), unrelated()],
    "The shared state is ready, suspended, or closed.",
  );
  const input = {
    project_id: projectId(),
    analyzer: { name: "semantic-review", version: "1.0" },
    base: before,
    candidate: after,
  } as const;
  const manifest = buildSemanticAnalysisInputManifest(input);
  assert.deepEqual(manifest.changed_objects, ["CON-A1000001", "REQ-A1000001"]);
  assert.deepEqual(manifest.related_objects, ["REQ-A1000002", "REQ-A1000003"]);
  assert.ok(manifest.normative_sections.every((section) => !section.content.includes("Exercise deterministic")));
  assert.ok(manifest.normative_sections.every((section) => section.object_id !== "REQ-A1000004"));
  assert.ok(manifest.normative_sections.some((section) => section.section === "definition"));
  assert.ok(manifest.normative_sections.some((section) => section.section === "statement"));
  assert.match(manifest.input_fingerprint, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(manifest, buildSemanticAnalysisInputManifest(input));

  const changedAnalyzer = buildSemanticAnalysisInputManifest({
    ...input,
    analyzer: { name: "semantic-review", version: "1.1" },
  });
  assert.notEqual(changedAnalyzer.input_fingerprint, manifest.input_fingerprint);
});
