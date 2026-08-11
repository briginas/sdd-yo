import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createMacosConformanceReport, writeNewJson } from "../scripts/macos-conformance.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("REQ-F91F7D11 macOS conformance manifest is deterministic and create-only", async () => {
  const first = await createMacosConformanceReport({ root, platformName: "darwin" });
  const second = await createMacosConformanceReport({ root, platformName: "darwin" });
  assert.equal(first.platform, "darwin");
  assert.equal(first.source_sha256, second.source_sha256);
  assert.equal(first.deterministic_manifest_sha256, second.deterministic_manifest_sha256);
  assert.deepEqual(first.deterministic_manifest, second.deterministic_manifest);
  assert.ok(first.deterministic_manifest.cases.every((item) => item.object_count > 0));

  const directory = await mkdtemp(join(tmpdir(), "sdd-macos-conformance-"));
  try {
    const path = join(directory, "report.json");
    await writeNewJson(path, first);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), first);
    await assert.rejects(() => writeNewJson(path, second), { code: "EEXIST" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("REQ-F91F7D11 macOS conformance rejects another host", async () => {
  await assert.rejects(() => createMacosConformanceReport({ root, platformName: "other" }));
});

test("REQ-F91F7D11 macOS conformance workflow is read-only and retains one report", async () => {
  const workflow = await readFile(join(root, ".github/workflows/macos-conformance.yml"), "utf8");
  const ordinaryCi = await readFile(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /^permissions:\n  contents: read$/mu);
  assert.match(workflow, /runs-on: macos-latest/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.match(workflow, /actions\/upload-artifact@v7/u);
  assert.match(ordinaryCi, /runs-on: macos-latest/u);
  assert.doesNotMatch(workflow, /package-manager-cache/u);
  assert.doesNotMatch(workflow, /\b(push|pull_request_target):/u);
});
