import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  comparePlatformConformanceReports,
  createPlatformConformanceReport,
  writeNewJson,
  type PlatformConformanceReport,
} from "../scripts/cross-platform-conformance.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("bootstrap cross-platform conformance manifest is deterministic and create-only", async () => {
  const first = await createPlatformConformanceReport({ root });
  const second = await createPlatformConformanceReport({ root });
  assert.equal(first.source_sha256, second.source_sha256);
  assert.equal(first.deterministic_manifest_sha256, second.deterministic_manifest_sha256);
  assert.deepEqual(first.deterministic_manifest, second.deterministic_manifest);
  assert.ok(first.deterministic_manifest.cases.every((item) => item.object_count > 0));

  const directory = await mkdtemp(join(tmpdir(), "sdd-conformance-"));
  try {
    const path = join(directory, "report.json");
    await writeNewJson(path, first);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), first);
    await assert.rejects(() => writeNewJson(path, second), { code: "EEXIST" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bootstrap cross-platform comparison requires identical source and deterministic payloads", async () => {
  const local = await createPlatformConformanceReport({ root, runId: "1", gitSha: "abc" });
  const reports = [
    { ...local, platform: "darwin" },
    { ...local, platform: "linux" },
    { ...local, platform: "win32" },
  ] satisfies PlatformConformanceReport[];
  const summary = comparePlatformConformanceReports(reports);
  assert.equal(summary.status, "MET");
  assert.deepEqual(summary.platforms, ["darwin", "linux", "win32"]);
  assert.throws(() =>
    comparePlatformConformanceReports([
      reports[0]!,
      reports[1]!,
      { ...reports[2]!, deterministic_manifest_sha256: `sha256:${"f".repeat(64)}` },
    ]),
  );
});

test("bootstrap cross-platform workflow is read-only and retains every platform result", async () => {
  const workflow = await readFile(join(root, ".github/workflows/cross-platform-conformance.yml"), "utf8");
  assert.match(workflow, /^permissions:\n  contents: read$/mu);
  assert.match(workflow, /os: \[macos-latest, ubuntu-latest, windows-latest\]/u);
  assert.match(workflow, /persist-credentials: false/gu);
  assert.equal(workflow.match(/persist-credentials: false/gu)?.length, 2);
  assert.match(workflow, /actions\/upload-artifact@v7/gu);
  assert.equal(workflow.match(/actions\/upload-artifact@v7/gu)?.length, 2);
  assert.match(workflow, /actions\/download-artifact@v8/u);
  assert.doesNotMatch(workflow, /package-manager-cache/u);
  assert.doesNotMatch(workflow, /\b(push|pull_request_target):/u);
});
