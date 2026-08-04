import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, statfs, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, tmpdir, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Fingerprint, GitObjectId, ProjectId, ProjectPath, RequirementId } from "../src/contracts/index.ts";
import { directReverseRelations, traceGraphObject, validateSpecificationGraph } from "../src/graph/index.ts";
import type { ValidatedSpecificationGraph } from "../src/graph/index.ts";
import { loadSpecificationDocuments } from "../src/markdown/index.ts";
import { nodeFileSystem } from "../src/platform/index.ts";
import { buildTestIndex } from "../src/tests/index.ts";
import type { AdapterDiscovery } from "../src/tests/index.ts";

const benchmarkSchemaVersion = "1.0" as const;
const fixtureGenerationVersion = "1" as const;
const fullSpecBytes = 100 * 1024 * 1024;

export type BenchmarkProfile = "full" | "smoke";
type WorkloadName = "validate" | "test_index" | "warm_inspect" | "warm_trace";
type TargetStatus = "MET" | "NOT_MET" | "TARGET_UNSPECIFIED" | "NOT_MEASURED";

type BenchmarkScale = {
  readonly capability_count: number;
  readonly requirements_per_capability: number;
  readonly model_object_count: number;
  readonly specification_bytes: number;
  readonly test_node_count: number;
};

type WorkerMeasurement = {
  readonly workload: WorkloadName;
  readonly duration_ms: number;
  readonly peak_rss_bytes: number;
  readonly observed_count: number;
};

export type WorkloadReport = {
  readonly measurement_status: "MEASURED" | "ERROR";
  readonly target_status: TargetStatus;
  readonly target: {
    readonly p95_ms_max: number | null;
    readonly peak_rss_bytes_max: number | null;
  };
  readonly samples: number;
  readonly median_ms: number | null;
  readonly p95_ms: number | null;
  readonly peak_rss_bytes: number | null;
  readonly observed_count: number | null;
  readonly error?: string;
};

export type PerformanceBenchmarkReport = {
  readonly schema_version: typeof benchmarkSchemaVersion;
  readonly benchmark: "sdd-performance";
  readonly profile: BenchmarkProfile;
  readonly fixture_generation_version: typeof fixtureGenerationVersion;
  readonly fixture_sha256: string;
  readonly source_sha256: string;
  readonly scale: BenchmarkScale;
  readonly environment: {
    readonly platform: string;
    readonly release: string;
    readonly architecture: string;
    readonly cpu_model: string;
    readonly logical_cpu_count: number;
    readonly total_memory_bytes: number;
    readonly filesystem_type: string;
    readonly node_version: string;
    readonly tool_name: string;
    readonly tool_version: string;
  };
  readonly workloads: Readonly<Record<WorkloadName, WorkloadReport>>;
  readonly target_status: "MET" | "NOT_MET" | "INCOMPLETE";
};

const profileScales: Readonly<Record<BenchmarkProfile, BenchmarkScale>> = {
  full: {
    capability_count: 100,
    requirements_per_capability: 99,
    model_object_count: 10_000,
    specification_bytes: fullSpecBytes,
    test_node_count: 100_000,
  },
  smoke: {
    capability_count: 2,
    requirements_per_capability: 4,
    model_object_count: 10,
    specification_bytes: 64 * 1024,
    test_node_count: 100,
  },
};

const benchmarkProjectId = "SDD-BE000001" as ProjectId;
const benchmarkGitObjectId = "benchmark-head" as GitObjectId;
const benchmarkFingerprint = `sha256:${"0".repeat(64)}` as Fingerprint;

function paddedHex(value: number): string {
  return value.toString(16).toUpperCase().padStart(7, "0");
}

function capabilityId(index: number): `CAP-${string}` {
  return `CAP-C${paddedHex(index)}`;
}

function requirementId(index: number): RequirementId {
  return `REQ-D${paddedHex(index)}` as RequirementId;
}

function capabilityDocument(capabilityIndex: number, requirementsPerCapability: number): string {
  const id = capabilityId(capabilityIndex);
  const requirements = Array.from({ length: requirementsPerCapability }, (_, localIndex) => {
    const globalIndex = capabilityIndex * requirementsPerCapability + localIndex;
    const requirement = requirementId(globalIndex);
    return `<a id="${requirement.toLowerCase()}"></a>

## ${requirement} — Benchmark requirement ${globalIndex}

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Statement <!-- sdd:statement -->

The benchmark shall retain deterministic object ${globalIndex}.

### Acceptance criteria <!-- sdd:acceptance -->

- Validation retains benchmark object ${globalIndex}.
`;
  }).join("\n");
  return `---
sdd:
  type: capability
  id: ${id}
---

# Benchmark capability ${capabilityIndex}

## Purpose <!-- sdd:purpose -->

Exercise deterministic validation at the documented scale.

${requirements}
## Benchmark payload

`;
}

function indexDocument(capabilityCount: number): string {
  const links = Array.from({ length: capabilityCount }, (_, index) => {
    const id = capabilityId(index);
    return `- [${id} — Benchmark capability ${index}](capabilities/capability-${index.toString().padStart(4, "0")}.md)`;
  }).join("\n");
  return `---
sdd:
  type: index
---

# Benchmark specification

## Capabilities <!-- sdd:capabilities -->

${links}

## Domain concepts <!-- sdd:concepts -->
`;
}

export function percentile(values: readonly number[], percentileValue: number): number {
  if (values.length === 0) throw new Error("A percentile requires at least one sample.");
  if (!(percentileValue > 0 && percentileValue <= 1)) throw new Error("A percentile must be in (0, 1].");
  const ordered = values.toSorted((left, right) => left - right);
  return ordered[Math.ceil(percentileValue * ordered.length) - 1]!;
}

async function createSpecificationFixture(projectRoot: string, scale: BenchmarkScale): Promise<string> {
  const specRoot = join(projectRoot, "spec");
  const capabilityRoot = join(specRoot, "capabilities");
  await mkdir(capabilityRoot, { recursive: true });
  const files = new Map<string, string>();
  files.set("spec/README.md", indexDocument(scale.capability_count));
  for (let index = 0; index < scale.capability_count; index += 1) {
    files.set(
      `spec/capabilities/capability-${index.toString().padStart(4, "0")}.md`,
      capabilityDocument(index, scale.requirements_per_capability),
    );
  }
  const baseBytes = [...files.values()].reduce((total, content) => total + Buffer.byteLength(content), 0);
  if (baseBytes > scale.specification_bytes) {
    throw new Error(`Generated model requires ${baseBytes} bytes, above the ${scale.specification_bytes} byte scale.`);
  }
  let remaining = scale.specification_bytes - baseBytes;
  const capabilityPaths = [...files.keys()].filter((path) => path !== "spec/README.md");
  for (const [index, path] of capabilityPaths.entries()) {
    const pathsRemaining = capabilityPaths.length - index;
    const payloadBytes = Math.floor(remaining / pathsRemaining);
    files.set(path, `${files.get(path)!}${"x".repeat(payloadBytes)}`);
    remaining -= payloadBytes;
  }
  if (remaining !== 0) throw new Error("Fixture byte allocation did not converge.");
  const hash = createHash("sha256");
  for (const [path, content] of [...files.entries()].toSorted(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    hash.update(path, "utf8");
    hash.update("\0", "utf8");
    hash.update(content, "utf8");
    await writeFile(join(projectRoot, ...path.split("/")), content, "utf8");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function loadBenchmarkGraph(projectRoot: string): Promise<ValidatedSpecificationGraph> {
  const loaded = await loadSpecificationDocuments(nodeFileSystem, projectRoot, "spec" as ProjectPath);
  if (!loaded.ok) throw new Error(`Benchmark specification load failed: ${loaded.diagnostics[0]?.code ?? "unknown"}`);
  const graph = validateSpecificationGraph(loaded.value, "spec/README.md" as ProjectPath);
  if (!graph.ok) throw new Error(`Benchmark graph validation failed: ${graph.diagnostics[0]?.code ?? "unknown"}`);
  return graph.value;
}

function createDiscovery(testNodeCount: number): AdapterDiscovery {
  return {
    adapter_id: "benchmark",
    suites: [],
    tests: Array.from({ length: testNodeCount }, (_, index) => ({
      local_id: `test-${index.toString().padStart(6, "0")}`,
      parent_id: null,
      name: `benchmark test ${index}`,
    })),
  };
}

function peakRssBytes(): number {
  return process.resourceUsage().maxRSS * 1024;
}

async function executeWorker(
  workload: WorkloadName,
  projectRoot: string,
  scale: BenchmarkScale,
): Promise<WorkerMeasurement> {
  if (workload === "validate") {
    const started = performance.now();
    const graph = await loadBenchmarkGraph(projectRoot);
    const duration = performance.now() - started;
    return {
      workload,
      duration_ms: duration,
      peak_rss_bytes: peakRssBytes(),
      observed_count: graph.objects.size,
    };
  }
  if (workload === "test_index") {
    const discovery = createDiscovery(scale.test_node_count);
    const started = performance.now();
    const index = buildTestIndex({
      project_id: benchmarkProjectId,
      head_ref: benchmarkGitObjectId,
      config_fingerprint: benchmarkFingerprint,
      adapter_fingerprints: { benchmark: benchmarkFingerprint },
      discoveries: [discovery],
      known_requirement_ids: new Set(),
    });
    const duration = performance.now() - started;
    return {
      workload,
      duration_ms: duration,
      peak_rss_bytes: peakRssBytes(),
      observed_count: index.tests.length,
    };
  }
  const graph = await loadBenchmarkGraph(projectRoot);
  const targetId = requirementId(scale.capability_count * scale.requirements_per_capability - 1);
  if (workload === "warm_inspect") {
    const started = performance.now();
    const object = graph.objects.get(targetId);
    const inbound = directReverseRelations(graph, targetId);
    const duration = performance.now() - started;
    if (object === undefined) throw new Error("Warm inspect target is unavailable.");
    return {
      workload,
      duration_ms: duration,
      peak_rss_bytes: peakRssBytes(),
      observed_count: 1 + inbound.length,
    };
  }
  const started = performance.now();
  const trace = traceGraphObject(graph, targetId);
  const duration = performance.now() - started;
  if (trace === undefined) throw new Error("Warm trace target is unavailable.");
  return {
    workload,
    duration_ms: duration,
    peak_rss_bytes: peakRssBytes(),
    observed_count: 1,
  };
}

function workerArguments(workload: WorkloadName, projectRoot: string, scale: BenchmarkScale): string[] {
  return [
    "--worker",
    workload,
    "--project-root",
    projectRoot,
    "--capabilities",
    String(scale.capability_count),
    "--requirements-per-capability",
    String(scale.requirements_per_capability),
    "--specification-bytes",
    String(scale.specification_bytes),
    "--test-nodes",
    String(scale.test_node_count),
  ];
}

async function runWorkerProcess(
  workload: WorkloadName,
  projectRoot: string,
  scale: BenchmarkScale,
): Promise<WorkerMeasurement> {
  const scriptPath = fileURLToPath(import.meta.url);
  const child = spawn(process.execPath, [scriptPath, ...workerArguments(workload, projectRoot, scale)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let standardOutput = "";
  let standardError = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    standardOutput += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    standardError += chunk;
  });
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    throw new Error(`Benchmark worker ${workload} failed: ${standardError.trim() || `exit ${exitCode}`}`);
  }
  const parsed: unknown = JSON.parse(standardOutput);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("workload" in parsed) ||
    parsed.workload !== workload ||
    !("duration_ms" in parsed) ||
    typeof parsed.duration_ms !== "number" ||
    !("peak_rss_bytes" in parsed) ||
    typeof parsed.peak_rss_bytes !== "number" ||
    !("observed_count" in parsed) ||
    typeof parsed.observed_count !== "number"
  ) {
    throw new Error(`Benchmark worker ${workload} returned an invalid result.`);
  }
  return parsed as WorkerMeasurement;
}

function workloadTarget(workload: WorkloadName): WorkloadReport["target"] {
  if (workload === "validate") return { p95_ms_max: 25_000, peak_rss_bytes_max: null };
  if (workload === "warm_inspect" || workload === "warm_trace") {
    return { p95_ms_max: 1_000, peak_rss_bytes_max: null };
  }
  return { p95_ms_max: null, peak_rss_bytes_max: 256 * 1024 * 1024 };
}

function measuredWorkload(workload: WorkloadName, samples: readonly WorkerMeasurement[]): WorkloadReport {
  const target = workloadTarget(workload);
  const durations = samples.map((sample) => sample.duration_ms);
  const p95 = percentile(durations, 0.95);
  const targetStatus: TargetStatus =
    target.p95_ms_max === null && target.peak_rss_bytes_max === null
      ? "TARGET_UNSPECIFIED"
      : (target.p95_ms_max === null || p95 <= target.p95_ms_max) &&
          (target.peak_rss_bytes_max === null ||
            Math.max(...samples.map((sample) => sample.peak_rss_bytes)) <= target.peak_rss_bytes_max)
        ? "MET"
        : "NOT_MET";
  return {
    measurement_status: "MEASURED",
    target_status: targetStatus,
    target,
    samples: samples.length,
    median_ms: Number(percentile(durations, 0.5).toFixed(3)),
    p95_ms: Number(p95.toFixed(3)),
    peak_rss_bytes: Math.max(...samples.map((sample) => sample.peak_rss_bytes)),
    observed_count: samples[0]?.observed_count ?? null,
  };
}

function failedWorkload(workload: WorkloadName, completedSamples: number, error: unknown): WorkloadReport {
  return {
    measurement_status: "ERROR",
    target_status: "NOT_MEASURED",
    target: workloadTarget(workload),
    samples: completedSamples,
    median_ms: null,
    p95_ms: null,
    peak_rss_bytes: null,
    observed_count: null,
    error: error instanceof Error ? error.message : "Unknown benchmark failure.",
  };
}

function overallTargetStatus(
  workloads: Readonly<Record<WorkloadName, WorkloadReport>>,
): PerformanceBenchmarkReport["target_status"] {
  const statuses = Object.values(workloads).map((workload) => workload.target_status);
  if (statuses.includes("NOT_MET")) return "NOT_MET";
  if (statuses.some((status) => status === "NOT_MEASURED" || status === "TARGET_UNSPECIFIED")) return "INCOMPLETE";
  return "MET";
}

async function toolVersion(): Promise<string> {
  const packageValue: unknown = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  if (
    typeof packageValue !== "object" ||
    packageValue === null ||
    !("version" in packageValue) ||
    typeof packageValue.version !== "string"
  ) {
    throw new Error("package.json does not contain a string version.");
  }
  return packageValue.version;
}

async function sourceFiles(root: string): Promise<readonly string[]> {
  const files = ["package.json", "package-lock.json", "scripts/performance-benchmark.ts"];
  const visit = async (relativeDirectory: string): Promise<void> => {
    const entries = await readdir(join(root, relativeDirectory), { withFileTypes: true });
    for (const entry of entries.toSorted((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    )) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) await visit(relativePath);
      else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(relativePath);
    }
  };
  await visit("src");
  return files.toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

async function sourceFingerprint(): Promise<string> {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const hash = createHash("sha256");
  for (const path of await sourceFiles(root)) {
    hash.update(path, "utf8");
    hash.update("\0", "utf8");
    hash.update(await readFile(join(root, ...path.split("/"))));
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function runPerformanceBenchmark(options: {
  readonly profile: BenchmarkProfile;
  readonly samples: number;
}): Promise<PerformanceBenchmarkReport> {
  if (!Number.isSafeInteger(options.samples) || options.samples < 1 || options.samples > 20) {
    throw new Error("Benchmark samples must be an integer from 1 through 20.");
  }
  const scale = profileScales[options.profile];
  const projectRoot = await mkdtemp(join(tmpdir(), "sdd-performance-"));
  try {
    const fixtureSha256 = await createSpecificationFixture(projectRoot, scale);
    const workloads = {} as Record<WorkloadName, WorkloadReport>;
    for (const workload of ["validate", "test_index", "warm_inspect", "warm_trace"] as const) {
      const measurements: WorkerMeasurement[] = [];
      try {
        for (let sample = 0; sample < options.samples; sample += 1) {
          measurements.push(await runWorkerProcess(workload, projectRoot, scale));
        }
        workloads[workload] = measuredWorkload(workload, measurements);
      } catch (error) {
        workloads[workload] = failedWorkload(workload, measurements.length, error);
      }
    }
    const fileSystem = await statfs(projectRoot);
    return {
      schema_version: benchmarkSchemaVersion,
      benchmark: "sdd-performance",
      profile: options.profile,
      fixture_generation_version: fixtureGenerationVersion,
      fixture_sha256: fixtureSha256,
      source_sha256: await sourceFingerprint(),
      scale,
      environment: {
        platform: platform(),
        release: release(),
        architecture: arch(),
        cpu_model: cpus()[0]?.model ?? "unknown",
        logical_cpu_count: cpus().length,
        total_memory_bytes: totalmem(),
        filesystem_type: `0x${fileSystem.type.toString(16)}`,
        node_version: process.version,
        tool_name: "sdd-yo",
        tool_version: await toolVersion(),
      },
      workloads,
      target_status: overallTargetStatus(workloads),
    };
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

export async function writePerformanceBenchmarkReport(path: string, report: PerformanceBenchmarkReport): Promise<void> {
  await writeFile(resolve(path), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

function optionValue(argumentsValue: readonly string[], name: string): string | undefined {
  const index = argumentsValue.indexOf(name);
  return index === -1 ? undefined : argumentsValue[index + 1];
}

function positiveInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function workerScale(argumentsValue: readonly string[]): BenchmarkScale {
  const capabilityCount = positiveInteger(optionValue(argumentsValue, "--capabilities"), "--capabilities");
  const requirementsPerCapability = positiveInteger(
    optionValue(argumentsValue, "--requirements-per-capability"),
    "--requirements-per-capability",
  );
  return {
    capability_count: capabilityCount,
    requirements_per_capability: requirementsPerCapability,
    model_object_count: capabilityCount * (requirementsPerCapability + 1),
    specification_bytes: positiveInteger(optionValue(argumentsValue, "--specification-bytes"), "--specification-bytes"),
    test_node_count: positiveInteger(optionValue(argumentsValue, "--test-nodes"), "--test-nodes"),
  };
}

async function main(argumentsValue: readonly string[]): Promise<number> {
  if (argumentsValue[0] === "--worker") {
    const workload = argumentsValue[1];
    if (!(["validate", "test_index", "warm_inspect", "warm_trace"] as const).includes(workload as WorkloadName)) {
      throw new Error("Benchmark worker workload is invalid.");
    }
    const projectRoot = optionValue(argumentsValue, "--project-root");
    if (projectRoot === undefined) throw new Error("Benchmark worker requires --project-root.");
    const result = await executeWorker(workload as WorkloadName, projectRoot, workerScale(argumentsValue));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  }
  const profileValue = optionValue(argumentsValue, "--profile") ?? "full";
  if (profileValue !== "full" && profileValue !== "smoke") throw new Error("--profile must be full or smoke.");
  const samples = positiveInteger(optionValue(argumentsValue, "--samples") ?? "5", "--samples");
  const report = await runPerformanceBenchmark({ profile: profileValue, samples });
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const output = optionValue(argumentsValue, "--output");
  if (output === undefined) process.stdout.write(serialized);
  else await writePerformanceBenchmarkReport(output, report);
  return Object.values(report.workloads).some((workload) => workload.measurement_status === "ERROR") ? 1 : 0;
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  main(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : "Unknown benchmark failure."}\n`);
      process.exitCode = 1;
    },
  );
}
