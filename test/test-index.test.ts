import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, test } from "node:test";

import {
  buildTestIndex,
  discoveryFromJsonl,
  discoveryFromJunit,
  fingerprintTestInput,
  importJunitXml,
  isFingerprint,
  isGitObjectId,
  isProjectId,
  isProjectPath,
  isRequirementId,
  parseDiscoveryJsonl,
  TestIndexError,
} from "../src/index.ts";
import type {
  AdapterDiscovery,
  Fingerprint,
  GitObjectId,
  ProjectId,
  ProjectPath,
  RequirementId,
} from "../src/index.ts";

async function jsonl(name: string) {
  return parseDiscoveryJsonl(await readFile(join("fixtures", "v1", "adapters", "jsonl", name)), {
    maxBytes: 16 * 1024,
    expectedAdapterId: "unit",
  });
}

function requirement(value: string): RequirementId {
  assert.ok(isRequirementId(value));
  return value;
}

function subject(discoveries: readonly AdapterDiscovery[]) {
  const projectValue: unknown = "SDD-17EF8B29";
  const headValue: unknown = "head-commit";
  assert.ok(isProjectId(projectValue));
  assert.ok(isGitObjectId(headValue));
  const adapter_fingerprints = Object.fromEntries(
    discoveries.map((discovery) => [discovery.adapter_id, fingerprintTestInput({ adapter_id: discovery.adapter_id })]),
  ) as Record<string, Fingerprint>;
  return {
    project_id: projectValue as ProjectId,
    head_ref: headValue as GitObjectId,
    config_fingerprint: fingerprintTestInput({ config: "v1" }),
    adapter_fingerprints,
  };
}

const known = new Set<RequirementId>([
  requirement("REQ-12E19D70"),
  requirement("REQ-20F8CA5C"),
  requirement("REQ-E451458E"),
  requirement("REQ-F7CEE6D0"),
]);

describe("REQ-12E19D70 REQ-F7CEE6D0 deterministic TestIndex", () => {
  test("inherits standalone Requirement IDs through forward-declared suites", async () => {
    const discoveries = [discoveryFromJsonl(await jsonl("hierarchy-valid.jsonl"))];
    const index = buildTestIndex({ ...subject(discoveries), discoveries, known_requirement_ids: known });
    assert.equal(index.artifact_type, "test_index");
    assert.deepEqual(index.tests, [
      {
        test_ref: "unit:test-child",
        adapter_id: "unit",
        local_id: "test-child",
        full_name: "Traceability REQ-F7CEE6D0 Automated coverage REQ-E451458E declares REQ-12E19D70 REQ-F7CEE6D0",
        requirement_ids: ["REQ-12E19D70", "REQ-E451458E", "REQ-F7CEE6D0"],
      },
    ]);
  });

  test("normalizes record order and unions adapter namespaces by test_ref", async () => {
    const first = discoveryFromJsonl(await jsonl("record-order-a.jsonl"));
    const second = discoveryFromJsonl(await jsonl("record-order-b.jsonl"));
    const firstIndex = buildTestIndex({ ...subject([first]), discoveries: [first], known_requirement_ids: known });
    const secondIndex = buildTestIndex({ ...subject([second]), discoveries: [second], known_requirement_ids: known });
    assert.deepEqual(firstIndex, secondIndex);

    const other: AdapterDiscovery = {
      adapter_id: "integration",
      suites: [],
      tests: [{ local_id: "case", parent_id: null, name: "covers REQ-12E19D70" }],
    };
    const union = buildTestIndex({
      ...subject([first, other]),
      discoveries: [other, first],
      known_requirement_ids: known,
    });
    assert.deepEqual(
      union.tests.map((item) => item.test_ref),
      ["integration:case", "unit:test-a", "unit:test-z"],
    );
  });

  test("rejects duplicate IDs, cycles, unresolved parents, and unknown Requirements", async () => {
    const cases = [
      ["duplicate-local-id.jsonl", "SDD_ADAPTER_DISCOVERY_DUPLICATE_ID"],
      ["cycle.jsonl", "SDD_ADAPTER_DISCOVERY_HIERARCHY_CYCLE"],
      ["unknown-requirement.jsonl", "SDD_ADAPTER_DISCOVERY_REQUIREMENT_UNKNOWN"],
    ] as const;
    for (const [name, code] of cases) {
      const discovery = discoveryFromJsonl(await jsonl(name));
      assert.throws(
        () => buildTestIndex({ ...subject([discovery]), discoveries: [discovery], known_requirement_ids: known }),
        (error) => error instanceof TestIndexError && error.code === code,
      );
    }
    const unresolved: AdapterDiscovery = {
      adapter_id: "unit",
      suites: [],
      tests: [{ local_id: "test", parent_id: "missing", name: "case" }],
    };
    assert.throws(
      () => buildTestIndex({ ...subject([unresolved]), discoveries: [unresolved], known_requirement_ids: known }),
      (error) => error instanceof TestIndexError && error.code === "SDD_ADAPTER_DISCOVERY_PARENT_UNKNOWN",
    );
  });

  test("does not accept embedded or suffixed Requirement-like strings", () => {
    const discovery: AdapterDiscovery = {
      adapter_id: "unit",
      suites: [],
      tests: [
        {
          local_id: "boundaries",
          parent_id: null,
          name: "XREQ-FFFFFFFF REQ-FFFFFFFF-OLD valid REQ-12E19D70",
        },
      ],
    };
    const index = buildTestIndex({ ...subject([discovery]), discoveries: [discovery], known_requirement_ids: known });
    assert.deepEqual(index.tests[0]?.requirement_ids, ["REQ-12E19D70"]);
  });

  test("normalizes JUnit imports without trusting classname as hierarchy", async () => {
    const reportPathValue: unknown = "reports/flat.xml";
    assert.ok(isProjectPath(reportPathValue));
    const report = importJunitXml(
      await readFile(join("fixtures", "v1", "adapters", "junit", "flat-report.xml")),
      "unit",
      reportPathValue as ProjectPath,
      {
        max_report_bytes: 16 * 1024,
        max_xml_depth: 16,
        max_suite_count: 10,
        max_test_count: 10,
      },
    );
    const discovery = discoveryFromJunit(report);
    const index = buildTestIndex({ ...subject([discovery]), discoveries: [discovery], known_requirement_ids: known });
    assert.equal(index.tests.length, 3);
    assert.ok(index.tests.every((item) => item.full_name.startsWith("Flat producer report ")));
    assert.ok(index.tests.every((item) => !item.full_name.includes("framework.module")));
  });
});

test("REQ-12E19D70 TestIndex input fingerprints are canonical and version-safe", () => {
  const left = fingerprintTestInput({ z: "e\u0301", a: [2, 1] });
  const right = fingerprintTestInput({ a: [2, 1], z: "é" });
  assert.equal(left, right);
  assert.ok(isFingerprint(left));
});
