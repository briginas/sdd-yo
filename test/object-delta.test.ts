import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";

import { isProjectPath } from "../src/contracts/identifiers.ts";
import {
  canonicalizeObjectDelta,
  computeGraphObjectDelta,
  computeVerificationObjectDelta,
} from "../src/fingerprint/object-delta.ts";
import type { ObjectDeltaEntry } from "../src/fingerprint/object-delta.ts";
import type { Fingerprint, GitObjectId, ProjectId, RequirementId } from "../src/contracts/identifiers.ts";
import type { TestIndex } from "../src/tests/test-index.ts";
import { validateSpecificationGraph } from "../src/graph/validate-graph.ts";
import type { ValidatedSpecificationGraph } from "../src/graph/validate-graph.ts";
import { parseSpecificationDocument } from "../src/markdown/parse-markdown.ts";
import type { SpecificationDocument } from "../src/markdown/types.ts";

async function graphAt(root: string): Promise<ValidatedSpecificationGraph> {
  const pending = [root];
  const files: string[] = [];
  while (pending.length > 0) {
    const directory = pending.pop();
    if (directory === undefined) throw new Error("Pending graph directory is unavailable.");
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
    }
  }
  const documents: SpecificationDocument[] = [];
  for (const file of files.toSorted()) {
    const pathValue: unknown = relative(root, file).replaceAll("\\", "/");
    assert.ok(isProjectPath(pathValue));
    const parsed = parseSpecificationDocument(pathValue, await readFile(file));
    assert.ok(parsed.ok, parsed.ok ? undefined : parsed.diagnostics[0]?.code);
    documents.push(parsed.value);
  }
  const entrypointValue: unknown = "README.md";
  assert.ok(isProjectPath(entrypointValue));
  const validated = validateSpecificationGraph(documents, entrypointValue);
  assert.ok(validated.ok, validated.ok ? undefined : validated.diagnostics[0]?.code);
  return validated.value;
}

function canonicalJson(delta: { readonly canonicalBytes: Uint8Array }): string {
  return new TextDecoder().decode(delta.canonicalBytes);
}

test("REQ-24A372E7 matches every Stage 0 canonical delta byte and fingerprint golden", async () => {
  const manifest = JSON.parse(await readFile("fixtures/v1/fingerprints/deltas/cases.json", "utf8")) as {
    delta_goldens: readonly {
      golden_id: string;
      canonical_json_utf8: string;
      expected_fingerprint: string;
    }[];
  };
  for (const golden of manifest.delta_goldens) {
    const entries = JSON.parse(golden.canonical_json_utf8) as ObjectDeltaEntry[];
    const delta = canonicalizeObjectDelta(entries);
    assert.equal(canonicalJson(delta), golden.canonical_json_utf8, golden.golden_id);
    assert.equal(delta.fingerprint, golden.expected_fingerprint, golden.golden_id);
  }
});

test("REQ-24A372E7 computes independent semantic and structural graph changes", async () => {
  const root = "fixtures/v1/markdown/change-classification";
  const expectations = {
    "semantic-only": { semantic: ["modify"], structural: [] },
    "structural-only": { semantic: [], structural: ["modify"] },
    "explanatory-only": { semantic: [], structural: [] },
  } as const;
  for (const [caseId, expected] of Object.entries(expectations)) {
    const delta = computeGraphObjectDelta(
      await graphAt(join(root, caseId, "before")),
      await graphAt(join(root, caseId, "after")),
    );
    assert.deepEqual(
      delta.semantic.entries.map((entry) => entry.operation),
      expected.semantic,
      caseId,
    );
    assert.deepEqual(
      delta.structural.entries.map((entry) => entry.operation),
      expected.structural,
      caseId,
    );
    if (expected.semantic.length === 0) assert.equal(canonicalJson(delta.semantic), "[]", caseId);
    if (expected.structural.length === 0) assert.equal(canonicalJson(delta.structural), "[]", caseId);
  }
});

test("REQ-24A372E7 emits sorted add and delete entries only for applicable fingerprint classes", async () => {
  const emptyRoot = await mkdtemp(join(tmpdir(), "sdd-empty-delta-"));
  await writeFile(
    join(emptyRoot, "README.md"),
    "---\nsdd:\n  type: index\n---\n# Empty\n\n## Capabilities <!-- sdd:capabilities -->\n\n## Concepts <!-- sdd:concepts -->\n",
  );
  const empty = await graphAt(emptyRoot);
  const representative = await graphAt("fixtures/v1/markdown/documents/representative-valid");
  const added = computeGraphObjectDelta(empty, representative);
  const deleted = computeGraphObjectDelta(representative, empty);

  assert.ok(added.semantic.entries.every((entry) => entry.operation === "add" && entry.type !== "capability"));
  assert.ok(added.structural.entries.some((entry) => entry.type === "capability"));
  assert.deepEqual(
    added.structural.entries.map((entry) => `${entry.type}:${entry.id}`),
    added.structural.entries.map((entry) => `${entry.type}:${entry.id}`).toSorted(),
  );
  assert.ok(deleted.semantic.entries.every((entry) => entry.operation === "delete" && entry.type !== "capability"));
  assert.ok(deleted.structural.entries.every((entry) => entry.operation === "delete"));
  assert.equal("verification" in added, false);
});

test("REQ-24A372E7 rejects duplicate object identities in one fingerprint-class delta", () => {
  const entries = JSON.parse(
    '[{"operation":"add","type":"requirement","id":"REQ-D4000001","after":"sha256:1111111111111111111111111111111111111111111111111111111111111111"}]',
  ) as ObjectDeltaEntry[];
  assert.throws(() => canonicalizeObjectDelta([...entries, ...entries]), /duplicate object identity/u);
  const first = entries[0];
  if (first === undefined || first.operation !== "add") throw new Error("Expected one add delta fixture entry.");
  assert.throws(
    () =>
      canonicalizeObjectDelta([
        {
          operation: "modify",
          type: "requirement",
          id: first.id,
          before: first.after,
          after: first.after,
        },
      ]),
    /does not change/u,
  );
});

test("REQ-B25091A0 computes verification deltas from mode and mapped test references", async () => {
  const graph = await graphAt("fixtures/v1/markdown/change-classification/semantic-only/before");
  const index = (testRefs: readonly string[]): TestIndex => ({
    schema_version: "1.0",
    artifact_type: "test_index",
    project_id: "SDD-A1000001" as ProjectId,
    subject: {
      head_ref: "head" as GitObjectId,
      config_fingerprint: `sha256:${"1".repeat(64)}` as Fingerprint,
      adapter_fingerprints: { unit: `sha256:${"2".repeat(64)}` as Fingerprint },
    },
    tests: testRefs.map((testRef) => ({
      test_ref: testRef,
      adapter_id: "unit",
      local_id: testRef.slice("unit:".length),
      full_name: `REQ-A1000001 ${testRef}`,
      requirement_ids: ["REQ-A1000001" as RequirementId],
    })),
  });
  const unchanged = computeVerificationObjectDelta(graph, index(["unit:a"]), graph, index(["unit:a"]));
  assert.equal(canonicalJson(unchanged), "[]");
  const changed = computeVerificationObjectDelta(graph, index(["unit:a"]), graph, index(["unit:a", "unit:b"]));
  assert.deepEqual(
    changed.entries.map((entry) => [entry.operation, entry.type, entry.id]),
    [["modify", "requirement", "REQ-A1000001"]],
  );
});
