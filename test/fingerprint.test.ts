import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import {
  canonicalObjectBytes,
  fingerprintObject,
  fingerprintValidatedObject,
  parseSpecificationDocument,
  projectValidatedObject,
  validateSpecificationGraph,
} from "../src/index.ts";
import type { ObjectId, ProjectPath, SpecificationDocument, ValidatedSpecificationGraph } from "../src/index.ts";

type Cases = {
  cases: readonly {
    case_id?: string;
    model_path?: string;
    variant_model_paths?: readonly string[];
    expected_equal_to_case_ids?: readonly string[];
    fingerprint_class?: "semantic" | "structural" | "verification";
    canonical_json_utf8?: string;
    expected_fingerprint?: string;
  }[];
};
test("REQ-8ACBC52D REQ-1095E571 canonical object bytes and fingerprints", async () => {
  const root = "fixtures/v1/fingerprints/objects";
  const manifest = JSON.parse(await readFile(`${root}/cases.json`, "utf8")) as Cases;
  for (const item of manifest.cases) {
    if (
      item.model_path === undefined ||
      item.fingerprint_class === undefined ||
      item.fingerprint_class === "verification"
    )
      continue;
    const projection = JSON.parse(await readFile(`${root}/${item.model_path}`, "utf8")) as {
      object: Record<string, unknown>;
    };
    assert.equal(
      new TextDecoder().decode(canonicalObjectBytes(projection, item.fingerprint_class)),
      item.canonical_json_utf8,
    );
    assert.equal(fingerprintObject(projection, item.fingerprint_class), item.expected_fingerprint);
  }
  const goldenCases = new Map(manifest.cases.map((item) => [item.case_id, item]));
  for (const item of manifest.cases) {
    if (item.variant_model_paths === undefined || item.expected_equal_to_case_ids === undefined) continue;
    const projections = await Promise.all(
      item.variant_model_paths.map(
        async (path) => JSON.parse(await readFile(`${root}/${path}`, "utf8")) as { object: Record<string, unknown> },
      ),
    );
    for (const expectedId of item.expected_equal_to_case_ids) {
      const fingerprintClass = goldenCases.get(expectedId)?.fingerprint_class;
      assert.notEqual(fingerprintClass, undefined, expectedId);
      if (fingerprintClass === undefined || fingerprintClass === "verification") continue;
      assert.equal(
        fingerprintObject(projections[0]!, fingerprintClass),
        fingerprintObject(projections[1]!, fingerprintClass),
        item.case_id,
      );
    }
  }
});

async function validatedGraph(root: string): Promise<ValidatedSpecificationGraph> {
  const documents: SpecificationDocument[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const path = join(root, entry.name);
    const parsed = parseSpecificationDocument(
      relative(root, path).replaceAll("\\", "/") as ProjectPath,
      await readFile(path),
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) documents.push(parsed.value);
  }
  const validated = validateSpecificationGraph(documents, "README.md" as ProjectPath);
  assert.equal(validated.ok, true, validated.ok ? undefined : validated.diagnostics[0]?.code);
  if (!validated.ok) throw new Error("Fixture graph did not validate.");
  return validated.value;
}

test("REQ-13CF54D6 fingerprints only known objects from a validated graph", async () => {
  const root = "fixtures/v1/markdown/change-classification/semantic-only/before";
  const graph = await validatedGraph(root);
  assert.match(fingerprintValidatedObject(graph, "REQ-A1000001" as ObjectId, "semantic"), /^sha256:[0-9a-f]{64}$/u);
  assert.equal(
    new TextDecoder().decode(
      canonicalObjectBytes(projectValidatedObject(graph, "REQ-A1000001" as ObjectId), "semantic"),
    ),
    '{"canonicalization_version":"1","object_type":"requirement","object_id":"REQ-A1000001","fingerprint_class":"semantic","canonical_value":{"statement":[{"type":"paragraph","children":[{"type":"text","value":"The system shall deliver each notification once."}]}],"acceptance":[[{"type":"paragraph","children":[{"type":"text","value":"A delivered notification is recorded."}]}]],"constraints":[]}}',
  );
  assert.throws(
    () => fingerprintValidatedObject(graph, "REQ-FFFFFFFF" as ObjectId, "semantic"),
    /unknown graph object/u,
  );
});

test("REQ-13CF54D6 preserves graph-adapter fingerprints across a parsed path move", async () => {
  const root = "fixtures/v1/markdown/change-classification/semantic-only/before";
  const before = await validatedGraph(root);
  const capability = parseSpecificationDocument("nested/renamed.md", await readFile(join(root, "capability.md")));
  const index = parseSpecificationDocument(
    "README.md",
    new TextEncoder().encode(
      (await readFile(join(root, "README.md"), "utf8")).replace("(capability.md)", "(nested/renamed.md)"),
    ),
  );
  assert.ok(capability.ok && index.ok);
  const moved = validateSpecificationGraph([index.value, capability.value], "README.md" as ProjectPath);
  assert.equal(moved.ok, true, moved.ok ? undefined : moved.diagnostics[0]?.code);
  if (!moved.ok) return;
  for (const fingerprintClass of ["semantic", "structural"] as const)
    assert.equal(
      fingerprintValidatedObject(before, "REQ-A1000001" as ObjectId, fingerprintClass),
      fingerprintValidatedObject(moved.value, "REQ-A1000001" as ObjectId, fingerprintClass),
    );
});

test("REQ-8ACBC52D classifies semantic, structural, and explanatory Markdown changes", async () => {
  const root = "fixtures/v1/markdown/change-classification";
  const manifest = JSON.parse(await readFile(join(root, "cases.json"), "utf8")) as {
    pairs: readonly {
      case_id: string;
      before_root: string;
      after_root: string;
      changed_object_id: ObjectId;
      expected_change_classifications: readonly string[];
    }[];
  };
  for (const item of manifest.pairs) {
    const before = await validatedGraph(join(root, item.before_root));
    const after = await validatedGraph(join(root, item.after_root));
    const changed = (["semantic", "structural"] as const).filter(
      (fingerprintClass) =>
        fingerprintValidatedObject(before, item.changed_object_id, fingerprintClass) !==
        fingerprintValidatedObject(after, item.changed_object_id, fingerprintClass),
    );
    const expected = item.expected_change_classifications.filter((value) => value !== "explanatory");
    assert.deepEqual(changed, expected, item.case_id);
  }
});
