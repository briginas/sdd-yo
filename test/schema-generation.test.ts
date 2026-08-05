import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertLocalSchemaReferencesResolve,
  generateArtifactTypes,
  inventoryArtifactSchemaPaths,
} from "../scripts/generate-schema-types.ts";
import type { SDDYoApprovalEvidence, SDDYoSpecPatch, Version1Artifact } from "../src/schemas/index.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const expectedArtifactSchemas = [
  "approval-evidence.schema.json",
  "candidate-tree-manifest.schema.json",
  "change-descriptor.schema.json",
  "conflict-report.schema.json",
  "finding-resolution.schema.json",
  "finding.schema.json",
  "governance-evidence.schema.json",
  "human-semantic-review-evidence.schema.json",
  "merge-report.schema.json",
  "proposal-package.schema.json",
  "qa-evidence.schema.json",
  "semantic-analysis-input-manifest.schema.json",
  "spec-patch.schema.json",
  "test-execution-evidence.schema.json",
  "test-index.schema.json",
  "verification-report.schema.json",
] as const;

test("schema generation covers every inventory-materialized artifact schema", async () => {
  const schemaPaths = await inventoryArtifactSchemaPaths();
  assert.deepEqual(
    schemaPaths.map((schemaPath) => path.basename(schemaPath)).sort(),
    [...expectedArtifactSchemas].sort(),
  );
});

test("artifact schema generation resolves only the checked-in local schema graph", async () => {
  await assertLocalSchemaReferencesResolve(await inventoryArtifactSchemaPaths());
});

test("schema generation is deterministic and preserves source schema bytes", async () => {
  const schemaDirectory = path.join(repositoryRoot, "contracts/v1/schemas");
  const schemaFilenames = (await readdir(schemaDirectory))
    .filter((filename) => filename.endsWith(".schema.json"))
    .sort();
  const before = await Promise.all(schemaFilenames.map((filename) => readFile(path.join(schemaDirectory, filename))));
  const first = await generateArtifactTypes();
  const second = await generateArtifactTypes();
  const after = await Promise.all(schemaFilenames.map((filename) => readFile(path.join(schemaDirectory, filename))));

  assert.equal(first, second);
  assert.deepEqual(after, before);
});

test("generated artifact types expose representative version 1 shapes", () => {
  const approval = {
    schema_version: "1.0",
    artifact_type: "approval_evidence",
    project_id: "SDD-17EF8B29",
    issuer: "product-review",
    actor: "user:42",
    decision: "approved",
    mode: "spec-code",
    subject: {
      base_ref: "4f88",
      semantic_delta_fingerprint: `sha256:${"0".repeat(64)}`,
      structural_delta_fingerprint: `sha256:${"1".repeat(64)}`,
    },
  } satisfies SDDYoApprovalEvidence;
  const patchOperation = {
    operation: "delete",
    path: "spec/example.md",
    before_sha256: `sha256:${"2".repeat(64)}`,
  } satisfies SDDYoSpecPatch["operations"][number];
  const artifact: Version1Artifact = approval;

  assert.equal(artifact.artifact_type, "approval_evidence");
  assert.equal(patchOperation.operation, "delete");
});
