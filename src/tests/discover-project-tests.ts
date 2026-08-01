import { createHash } from "node:crypto";
import { matchesGlob, relative, resolve } from "node:path";

import type { ResolvedProject, TestAdapter } from "../config/types.ts";
import { isProjectPath } from "../contracts/identifiers.ts";
import type { GitObjectId, ProjectPath, RequirementId } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { ProcessRunner } from "../platform/process-runner.ts";
import { importDiscoveryJsonlFile, runCommandDiscovery } from "./discovery-jsonl.ts";
import { importJunitFile } from "./junit-import.ts";
import type { AdapterDiscovery, TestIndex } from "./test-index.ts";
import { buildTestIndex, discoveryFromJsonl, discoveryFromJunit, fingerprintTestInput } from "./test-index.ts";

const adapterIdPattern = /^[a-z][a-z0-9-]{0,31}$/u;

export class ProjectTestDiscoveryError extends Error {
  readonly code:
    | "SDD_ADAPTER_DISCOVERY_EMPTY"
    | "SDD_ADAPTER_DISCOVERY_UNAVAILABLE"
    | "SDD_ADAPTER_ID_UNKNOWN"
    | "SDD_ADAPTER_JUNIT_BINDING_REQUIRED";

  constructor(code: ProjectTestDiscoveryError["code"], message: string) {
    super(message);
    this.name = "ProjectTestDiscoveryError";
    this.code = code;
  }
}

export type ProjectTestDiscoveryResult = {
  readonly index: TestIndex;
  readonly warnings: readonly string[];
};

async function listProjectFiles(
  fileSystem: FileSystem,
  projectRoot: string,
  startDirectory: string,
): Promise<readonly ProjectPath[]> {
  const files: ProjectPath[] = [];
  const walk = async (relativeDirectory: string): Promise<void> => {
    const directory = relativeDirectory.length === 0 ? projectRoot : resolve(projectRoot, relativeDirectory);
    let entries;
    try {
      entries = (await fileSystem.readDirectory(directory)).toSorted((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
      );
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const candidate = relativeDirectory.length === 0 ? entry.name : `${relativeDirectory}/${entry.name}`;
      if (!isProjectPath(candidate)) continue;
      if (entry.kind === "directory") await walk(candidate);
      else if (entry.kind === "file") files.push(candidate);
    }
  };
  await walk(startDirectory);
  return files;
}

async function expandReports(
  fileSystem: FileSystem,
  projectRoot: string,
  patterns: readonly string[],
): Promise<readonly ProjectPath[]> {
  const matched = new Set<ProjectPath>();
  for (const pattern of patterns) {
    const segments = pattern.split("/");
    const firstGlob = segments.findIndex((segment) => /[*?\[\]{}()!+@]/u.test(segment));
    const directorySegments = firstGlob < 0 ? segments.slice(0, -1) : segments.slice(0, firstGlob);
    const startDirectory = directorySegments.join("/");
    for (const path of await listProjectFiles(fileSystem, projectRoot, startDirectory)) {
      if (matchesGlob(path, pattern)) matched.add(path);
    }
  }
  return [...matched].toSorted();
}

function mergedDiscovery(adapterId: string, discoveries: readonly AdapterDiscovery[]): AdapterDiscovery {
  return {
    adapter_id: adapterId,
    suites: discoveries.flatMap((item) => item.suites),
    tests: discoveries.flatMap((item) => item.tests),
  };
}

async function executableHash(
  fileSystem: FileSystem,
  projectRoot: string,
  adapter: TestAdapter | undefined,
): Promise<string | undefined> {
  if (adapter?.type !== "command") return undefined;
  const executable = adapter.discover?.argv[0];
  if (executable === undefined || !isProjectPath(executable) || !executable.includes("/")) return undefined;
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realExecutable = await fileSystem.realPath(resolve(realRoot, ...executable.split("/")));
    const path = relative(realRoot, realExecutable);
    if (path.startsWith("..") || (await fileSystem.metadata(realExecutable)).kind !== "file") return undefined;
    return `sha256:${createHash("sha256")
      .update(await fileSystem.readFile(realExecutable))
      .digest("hex")}`;
  } catch {
    return undefined;
  }
}

export async function discoverProjectTests(input: {
  readonly fileSystem: FileSystem;
  readonly processRunner: ProcessRunner;
  readonly project: ResolvedProject;
  readonly head_ref: GitObjectId;
  readonly known_requirement_ids: ReadonlySet<RequirementId>;
  readonly adapter_ids?: readonly string[];
  readonly import_jsonl?: readonly ProjectPath[];
  readonly import_junit?: readonly ProjectPath[];
  readonly allowed_environment?: Readonly<Record<string, string>>;
}): Promise<ProjectTestDiscoveryResult> {
  const configured = new Map(input.project.configuration.tests.adapters.map((adapter) => [adapter.id, adapter]));
  const selectedIds = [...new Set(input.adapter_ids ?? [])];
  if (selectedIds.some((id) => !adapterIdPattern.test(id) || !configured.has(id))) {
    throw new ProjectTestDiscoveryError("SDD_ADAPTER_ID_UNKNOWN", "A selected adapter ID is not configured.");
  }
  const selected = (
    selectedIds.length === 0 ? [...configured.values()] : selectedIds.map((id) => configured.get(id)!)
  ).filter((adapter) => adapter.type === "junit" || adapter.discover !== undefined);
  const explicitJunit = input.import_junit ?? [];
  if (explicitJunit.length > 0) {
    const bound = selectedIds.length === 1 ? configured.get(selectedIds[0]!) : undefined;
    if (bound?.type !== "junit") {
      throw new ProjectTestDiscoveryError(
        "SDD_ADAPTER_JUNIT_BINDING_REQUIRED",
        "Explicit JUnit imports require exactly one selected configured JUnit adapter.",
      );
    }
  }

  const byAdapter = new Map<string, AdapterDiscovery[]>();
  const sourcePaths = new Map<string, { jsonl: ProjectPath[]; junit: ProjectPath[] }>();
  const warnings = new Set<string>();
  const append = (discovery: AdapterDiscovery): void => {
    const current = byAdapter.get(discovery.adapter_id) ?? [];
    current.push(discovery);
    byAdapter.set(discovery.adapter_id, current);
  };
  const paths = (id: string): { jsonl: ProjectPath[]; junit: ProjectPath[] } => {
    const current = sourcePaths.get(id) ?? { jsonl: [], junit: [] };
    sourcePaths.set(id, current);
    return current;
  };
  const limits = input.project.configuration.tests.import_limits;
  for (const adapter of selected) {
    if (adapter.type === "command") {
      append(
        discoveryFromJsonl(
          await runCommandDiscovery(input.processRunner, input.project, adapter, input.allowed_environment ?? {}),
        ),
      );
    } else {
      const reports = await expandReports(input.fileSystem, input.project.project_root, adapter.discover.reports);
      if (reports.length === 0 && explicitJunit.length === 0) {
        throw new ProjectTestDiscoveryError(
          "SDD_ADAPTER_DISCOVERY_UNAVAILABLE",
          "A configured JUnit adapter matched no report files.",
        );
      }
      for (const reportPath of reports) {
        const report = await importJunitFile(input.fileSystem, input.project.project_root, adapter.id, reportPath, {
          max_report_bytes: limits.max_report_bytes,
          max_xml_depth: limits.max_xml_depth,
          max_suite_count: limits.max_suite_count,
          max_test_count: limits.max_test_count,
        });
        append(discoveryFromJunit(report));
        paths(adapter.id).junit.push(reportPath);
        for (const warning of report.hierarchy.diagnostics) warnings.add(warning);
      }
    }
  }

  for (const path of input.import_jsonl ?? []) {
    const stream = await importDiscoveryJsonlFile(input.fileSystem, input.project.project_root, path, {
      maxBytes: limits.max_jsonl_bytes,
    });
    append(discoveryFromJsonl(stream));
    paths(stream.header.adapter_id).jsonl.push(path);
  }
  if (explicitJunit.length > 0) {
    const adapter = configured.get(selectedIds[0]!)!;
    for (const path of explicitJunit) {
      const report = await importJunitFile(input.fileSystem, input.project.project_root, adapter.id, path, {
        max_report_bytes: limits.max_report_bytes,
        max_xml_depth: limits.max_xml_depth,
        max_suite_count: limits.max_suite_count,
        max_test_count: limits.max_test_count,
      });
      append(discoveryFromJunit(report));
      paths(adapter.id).junit.push(path);
      for (const warning of report.hierarchy.diagnostics) warnings.add(warning);
    }
  }
  if (byAdapter.size === 0) {
    throw new ProjectTestDiscoveryError("SDD_ADAPTER_DISCOVERY_EMPTY", "No discovery adapter or import was selected.");
  }

  const discoveries = [...byAdapter.entries()]
    .map(([id, values]) => mergedDiscovery(id, values))
    .toSorted((left, right) => (left.adapter_id < right.adapter_id ? -1 : left.adapter_id > right.adapter_id ? 1 : 0));
  const adapterFingerprints = Object.fromEntries(
    await Promise.all(
      discoveries.map(async (discovery) => {
        const adapter = configured.get(discovery.adapter_id);
        const imports = paths(discovery.adapter_id);
        return [
          discovery.adapter_id,
          fingerprintTestInput({
            adapter: adapter ?? { id: discovery.adapter_id, type: "jsonl-file", protocol: "jsonl-v1" },
            required: true,
            import_jsonl: imports?.jsonl.toSorted() ?? [],
            import_junit: imports?.junit.toSorted() ?? [],
            environment_allowlist_names: Object.keys(input.allowed_environment ?? {}).toSorted(),
            executable_sha256: await executableHash(input.fileSystem, input.project.project_root, adapter),
          }),
        ] as const;
      }),
    ),
  );
  return {
    index: buildTestIndex({
      project_id: input.project.configuration.project_id,
      head_ref: input.head_ref,
      config_fingerprint: fingerprintTestInput(input.project.configuration),
      adapter_fingerprints: adapterFingerprints,
      discoveries,
      known_requirement_ids: input.known_requirement_ids,
    }),
    warnings: [...warnings].toSorted(),
  };
}
