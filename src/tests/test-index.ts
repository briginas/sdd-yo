import { createHash } from "node:crypto";

import { isFingerprint, isGitObjectId, isProjectId, isRequirementId } from "../contracts/identifiers.ts";
import type { Fingerprint, GitObjectId, ProjectId, ProjectPath, RequirementId } from "../contracts/identifiers.ts";
import type { ImportedDiscoveryStream } from "./discovery-jsonl.ts";
import type { ImportedJunitReport } from "./junit-import.ts";

const adapterIdPattern = /^[a-z][a-z0-9-]{0,31}$/u;

export type TestIndexEntry = {
  readonly test_ref: string;
  readonly adapter_id: string;
  readonly local_id: string;
  readonly full_name: string;
  readonly requirement_ids: readonly RequirementId[];
  readonly source?: {
    readonly path: ProjectPath;
    readonly line?: number;
  };
};

export type TestIndex = {
  readonly schema_version: "1.0";
  readonly artifact_type: "test_index";
  readonly project_id: ProjectId;
  readonly subject: {
    readonly head_ref: GitObjectId;
    readonly config_fingerprint: Fingerprint;
    readonly adapter_fingerprints: Readonly<Record<string, Fingerprint>>;
  };
  readonly tests: readonly TestIndexEntry[];
};

export type AdapterDiscovery = {
  readonly adapter_id: string;
  readonly suites: readonly {
    readonly local_id: string;
    readonly parent_id: string | null;
    readonly name: string;
  }[];
  readonly tests: readonly {
    readonly local_id: string;
    readonly parent_id: string | null;
    readonly name: string;
    readonly source?: {
      readonly path: ProjectPath;
      readonly line?: number;
    };
  }[];
};

export class TestIndexError extends Error {
  readonly code:
    | "SDD_ADAPTER_DISCOVERY_DUPLICATE_ID"
    | "SDD_ADAPTER_DISCOVERY_HIERARCHY_CYCLE"
    | "SDD_ADAPTER_DISCOVERY_INVALID"
    | "SDD_ADAPTER_DISCOVERY_PARENT_UNKNOWN"
    | "SDD_ADAPTER_DISCOVERY_REQUIREMENT_UNKNOWN"
    | "SDD_ADAPTER_TEST_INDEX_SUBJECT_INVALID";

  constructor(code: TestIndexError["code"], message: string) {
    super(message);
    this.name = "TestIndexError";
    this.code = code;
  }
}

export function discoveryFromJsonl(stream: ImportedDiscoveryStream): AdapterDiscovery {
  return {
    adapter_id: stream.header.adapter_id,
    suites: stream.records
      .filter((record) => record.record_type === "suite")
      .map((record) => ({ local_id: record.local_id, parent_id: record.parent_id, name: record.name })),
    tests: stream.records
      .filter((record) => record.record_type === "test")
      .map((record) => ({
        local_id: record.local_id,
        parent_id: record.parent_id,
        name: record.name,
        ...(record.source === undefined ? {} : { source: record.source }),
      })),
  };
}

export function discoveryFromJunit(report: ImportedJunitReport): AdapterDiscovery {
  return {
    adapter_id: report.adapter_id,
    suites: report.suites.map((suite) => ({
      local_id: suite.local_id,
      parent_id: suite.parent_id,
      name: suite.name,
    })),
    tests: report.tests.map((test) => ({
      local_id: test.local_id,
      parent_id: test.parent_id,
      name: test.name,
      ...(test.source === undefined ? {} : { source: test.source }),
    })),
  };
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  if (typeof value === "string") return value.normalize("NFC");
  return value;
}

export function fingerprintTestInput(value: unknown): Fingerprint {
  const candidate: unknown = `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)), "utf8")
    .digest("hex")}`;
  if (!isFingerprint(candidate)) throw new Error("Test input fingerprint generation failed.");
  return candidate;
}

function requirementIds(fullName: string): readonly RequirementId[] {
  const pattern = /(?<![A-Za-z0-9_-])REQ-[0-9A-F]{8}(?![A-Za-z0-9_-])/gu;
  return [...new Set([...fullName.matchAll(pattern)].map((match) => match[0]).filter(isRequirementId))].toSorted();
}

function normalizedAdapterTests(
  discovery: AdapterDiscovery,
  knownRequirements: ReadonlySet<RequirementId>,
): TestIndexEntry[] {
  const nodes = new Map<
    string,
    | { readonly type: "suite"; readonly parent_id: string | null; readonly name: string }
    | AdapterDiscovery["tests"][number]
  >();
  for (const suite of discovery.suites) {
    if (nodes.has(suite.local_id)) {
      throw new TestIndexError("SDD_ADAPTER_DISCOVERY_DUPLICATE_ID", "Discovery contains a duplicate local ID.");
    }
    nodes.set(suite.local_id, { type: "suite", parent_id: suite.parent_id, name: suite.name });
  }
  for (const test of discovery.tests) {
    if (nodes.has(test.local_id)) {
      throw new TestIndexError("SDD_ADAPTER_DISCOVERY_DUPLICATE_ID", "Discovery contains a duplicate local ID.");
    }
    nodes.set(test.local_id, test);
  }

  const suiteNames = new Map<string, readonly string[]>();
  const visiting = new Set<string>();
  const resolveSuite = (localId: string): readonly string[] => {
    const existing = suiteNames.get(localId);
    if (existing !== undefined) return existing;
    const node = nodes.get(localId);
    if (node === undefined || !("type" in node) || node.type !== "suite") {
      throw new TestIndexError("SDD_ADAPTER_DISCOVERY_PARENT_UNKNOWN", "Discovery parent does not name a suite.");
    }
    if (visiting.has(localId)) {
      throw new TestIndexError("SDD_ADAPTER_DISCOVERY_HIERARCHY_CYCLE", "Discovery suite hierarchy contains a cycle.");
    }
    visiting.add(localId);
    const names = [...(node.parent_id === null ? [] : resolveSuite(node.parent_id)), node.name];
    visiting.delete(localId);
    suiteNames.set(localId, names);
    return names;
  };
  for (const suite of discovery.suites) resolveSuite(suite.local_id);

  return discovery.tests.map((test): TestIndexEntry => {
    const fullName = [...(test.parent_id === null ? [] : resolveSuite(test.parent_id)), test.name].join(" ");
    if (fullName.length === 0 || test.local_id.length === 0 || test.local_id.includes("\0")) {
      throw new TestIndexError("SDD_ADAPTER_DISCOVERY_INVALID", "Discovery test identity or full name is invalid.");
    }
    const mapped = requirementIds(fullName);
    if (mapped.some((id) => !knownRequirements.has(id))) {
      throw new TestIndexError(
        "SDD_ADAPTER_DISCOVERY_REQUIREMENT_UNKNOWN",
        "Discovery full name contains an unknown Requirement ID.",
      );
    }
    return {
      test_ref: `${discovery.adapter_id}:${test.local_id}`,
      adapter_id: discovery.adapter_id,
      local_id: test.local_id,
      full_name: fullName,
      requirement_ids: mapped,
      ...(test.source === undefined ? {} : { source: test.source }),
    };
  });
}

export function buildTestIndex(input: {
  readonly project_id: ProjectId;
  readonly head_ref: GitObjectId;
  readonly config_fingerprint: Fingerprint;
  readonly adapter_fingerprints: Readonly<Record<string, Fingerprint>>;
  readonly discoveries: readonly AdapterDiscovery[];
  readonly known_requirement_ids: ReadonlySet<RequirementId>;
}): TestIndex {
  if (!isProjectId(input.project_id) || !isGitObjectId(input.head_ref) || !isFingerprint(input.config_fingerprint)) {
    throw new TestIndexError("SDD_ADAPTER_TEST_INDEX_SUBJECT_INVALID", "TestIndex subject is invalid.");
  }
  const discoveries = new Map<string, AdapterDiscovery>();
  for (const discovery of input.discoveries) {
    if (!adapterIdPattern.test(discovery.adapter_id)) {
      throw new TestIndexError("SDD_ADAPTER_DISCOVERY_INVALID", "Discovery adapter ID is invalid.");
    }
    if (discoveries.has(discovery.adapter_id)) {
      throw new TestIndexError("SDD_ADAPTER_DISCOVERY_DUPLICATE_ID", "Discovery adapter ID is duplicated.");
    }
    discoveries.set(discovery.adapter_id, discovery);
  }
  const fingerprintEntries = Object.entries(input.adapter_fingerprints).toSorted(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  if (
    fingerprintEntries.length === 0 ||
    fingerprintEntries.some(([id, fingerprint]) => !discoveries.has(id) || !isFingerprint(fingerprint)) ||
    discoveries.size !== fingerprintEntries.length
  ) {
    throw new TestIndexError(
      "SDD_ADAPTER_TEST_INDEX_SUBJECT_INVALID",
      "Adapter fingerprints do not match discoveries.",
    );
  }
  const tests = [...discoveries.values()]
    .flatMap((discovery) => normalizedAdapterTests(discovery, input.known_requirement_ids))
    .toSorted((left, right) => (left.test_ref < right.test_ref ? -1 : left.test_ref > right.test_ref ? 1 : 0));
  if (new Set(tests.map((test) => test.test_ref)).size !== tests.length) {
    throw new TestIndexError("SDD_ADAPTER_DISCOVERY_DUPLICATE_ID", "TestIndex contains a duplicate test reference.");
  }
  return {
    schema_version: "1.0",
    artifact_type: "test_index",
    project_id: input.project_id,
    subject: {
      head_ref: input.head_ref,
      config_fingerprint: input.config_fingerprint,
      adapter_fingerprints: Object.fromEntries(fingerprintEntries),
    },
    tests,
  };
}
