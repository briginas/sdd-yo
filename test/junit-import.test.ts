import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

import { importJunitFile, importJunitXml, isProjectPath, JunitImportError, nodeFileSystem } from "../src/index.ts";
import type { JunitImportLimits, ProjectPath } from "../src/index.ts";

async function fixture(name: string): Promise<Uint8Array> {
  return readFile(join("fixtures", "v1", "adapters", "junit", name));
}

function path(value: string): ProjectPath {
  assert.ok(isProjectPath(value));
  return value;
}

const limits: JunitImportLimits = {
  max_report_bytes: 64 * 1024,
  max_xml_depth: 16,
  max_suite_count: 100,
  max_test_count: 1_000,
};

describe("REQ-6D8DDDF7 JUnit-compatible import", () => {
  test("preserves nested suite hierarchy, names, results, source, and time", async () => {
    const report = importJunitXml(await fixture("nested-suites.xml"), "unit", path("reports/nested.xml"), limits);
    assert.deepEqual(
      report.suites.map((suite) => suite.suite_path),
      [["Root adapter suite REQ-6D8DDDF7"], ["Root adapter suite REQ-6D8DDDF7", "Nested behavior REQ-12E19D70"]],
    );
    assert.equal(report.hierarchy.retained, true);
    assert.deepEqual(report.hierarchy.diagnostics, []);
    assert.deepEqual(Object.fromEntries(report.tests.map((item) => [item.name, item.status])), {
      "imports a passing case": "passed",
      "imports a failure": "failed",
      "imports an error": "failed",
      "imports a skipped case": "skipped",
    });
    const passing = report.tests.find((item) => item.name === "imports a passing case");
    assert.deepEqual(passing?.source, { path: "tests/adapter-contract.case", line: 17 });
    assert.equal(passing?.time_seconds, "0.125");
  });

  test("reports flat producer hierarchy loss without deriving suites from classname", async () => {
    const report = importJunitXml(await fixture("flat-report.xml"), "unit", path("reports/flat.xml"), limits);
    assert.deepEqual(
      report.suites.map((suite) => suite.name),
      ["Flat producer report"],
    );
    assert.equal(report.hierarchy.retained, false);
    assert.deepEqual(report.hierarchy.diagnostics, ["SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE"]);
    assert.equal(
      report.suites.some((suite) => suite.name === "framework.module.ContextA"),
      false,
    );
    assert.deepEqual(
      report.tests.map((item) => item.name),
      ["duplicate example", "duplicate example", "different case"],
    );
  });

  test("derives stable opaque IDs from report, suite path, classname, name, and occurrence", async () => {
    const bytes = await fixture("flat-report.xml");
    const first = importJunitXml(bytes, "unit", path("reports/flat.xml"), limits);
    const repeated = importJunitXml(bytes, "unit", path("reports/flat.xml"), limits);
    assert.deepEqual(
      first.tests.map((item) => item.local_id),
      repeated.tests.map((item) => item.local_id),
    );
    assert.equal(new Set(first.tests.map((item) => item.local_id)).size, 3);
    const moved = importJunitXml(bytes, "unit", path("reports/moved.xml"), limits);
    assert.notEqual(first.tests[0]?.local_id, moved.tests[0]?.local_id);
  });

  test("retains a producer source path when no line is available", () => {
    const report = importJunitXml(
      new TextEncoder().encode('<testsuite name="suite"><testcase name="case" file="tests/case.ts" /></testsuite>'),
      "unit",
      path("reports/path-only.xml"),
      limits,
    );
    assert.deepEqual(report.tests[0]?.source, { path: "tests/case.ts" });
  });

  test("rejects malformed XML and DTD before returning partial imported data", async () => {
    await assert.rejects(
      async () => importJunitXml(await fixture("malformed.xml"), "unit", path("reports/malformed.xml"), limits),
      (error) => error instanceof JunitImportError && error.code === "SDD_ADAPTER_JUNIT_MALFORMED_XML",
    );
    await assert.rejects(
      async () =>
        importJunitXml(await fixture("external-entity.xml"), "unit", path("reports/external-entity.xml"), limits),
      (error) => error instanceof JunitImportError && error.code === "SDD_ADAPTER_JUNIT_DTD_FORBIDDEN",
    );
  });

  test("enforces report byte, XML depth, suite count, and test count limits", async () => {
    const cases = [
      ["nested-suites.xml", { ...limits, max_report_bytes: 128 }, "SDD_ADAPTER_JUNIT_REPORT_TOO_LARGE"],
      ["depth-overflow.xml", { ...limits, max_xml_depth: 3 }, "SDD_ADAPTER_JUNIT_XML_DEPTH_LIMIT"],
      ["suite-count-overflow.xml", { ...limits, max_suite_count: 2 }, "SDD_ADAPTER_JUNIT_SUITE_LIMIT"],
      ["test-count-overflow.xml", { ...limits, max_test_count: 2 }, "SDD_ADAPTER_JUNIT_TEST_LIMIT"],
    ] as const;
    for (const [name, bounded, code] of cases) {
      await assert.rejects(
        async () => importJunitXml(await fixture(name), "unit", path(`reports/${name}`), bounded),
        (error) => error instanceof JunitImportError && error.code === code,
      );
    }
  });

  test("reads only regular project-scoped report files", async () => {
    const root = await mkdtemp(join(tmpdir(), "sdd-junit-project-"));
    const outside = await mkdtemp(join(tmpdir(), "sdd-junit-outside-"));
    await mkdir(join(root, "reports"));
    await writeFile(join(root, "reports", "nested.xml"), await fixture("nested-suites.xml"));
    await writeFile(join(outside, "escape.xml"), await fixture("flat-report.xml"));
    await symlink(join(outside, "escape.xml"), join(root, "reports", "escape.xml"));
    assert.equal(
      (await importJunitFile(nodeFileSystem, root, "unit", path("reports/nested.xml"), limits)).tests.length,
      4,
    );
    await assert.rejects(
      importJunitFile(nodeFileSystem, root, "unit", path("reports/escape.xml"), limits),
      (error) => error instanceof JunitImportError && error.code === "SDD_ADAPTER_JUNIT_FILE_OUT_OF_SCOPE",
    );
  });
});
