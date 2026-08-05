import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  percentile,
  runPerformanceBenchmark,
  writePerformanceBenchmarkReport,
} from "../scripts/performance-benchmark.ts";

test("performance benchmark computes nearest-rank percentiles", () => {
  assert.equal(percentile([5, 1, 4, 2, 3], 0.5), 3);
  assert.equal(percentile([5, 1, 4, 2, 3], 0.95), 5);
  assert.throws(() => percentile([], 0.95));
});

test("performance benchmark smoke profile measures every workload against accepted targets", async () => {
  const first = await runPerformanceBenchmark({ profile: "smoke", samples: 1 });
  const second = await runPerformanceBenchmark({ profile: "smoke", samples: 1 });

  assert.equal(first.fixture_sha256, second.fixture_sha256);
  assert.equal(first.source_sha256, second.source_sha256);
  assert.equal(first.scale.model_object_count, 10);
  assert.equal(first.scale.specification_bytes, 64 * 1024);
  assert.equal(first.workloads.validate.observed_count, 10);
  assert.equal(first.workloads.test_index.observed_count, 100);
  assert.equal(first.workloads.warm_inspect.observed_count, 1);
  assert.equal(first.workloads.warm_trace.observed_count, 1);
  assert.equal(first.workloads.test_index.target.peak_rss_bytes_max, 256 * 1024 * 1024);
  assert.equal(first.workloads.test_index.target_status, "MET");
  assert.equal(first.target_status, "MET");
  for (const workload of Object.values(first.workloads)) {
    assert.equal(workload.measurement_status, "MEASURED");
    assert.equal(workload.samples, 1);
    assert.ok(workload.median_ms !== null && workload.median_ms >= 0);
    assert.ok(workload.p95_ms !== null && workload.p95_ms >= 0);
    assert.ok(workload.peak_rss_bytes !== null && workload.peak_rss_bytes > 0);
  }

  const root = await mkdtemp(join(tmpdir(), "sdd-performance-report-"));
  try {
    const path = join(root, "result.json");
    await writePerformanceBenchmarkReport(path, first);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), first);
    await assert.rejects(() => writePerformanceBenchmarkReport(path, second), { code: "EEXIST" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
