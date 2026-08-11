import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { ObjectId, ProjectPath } from "../src/contracts/index.ts";
import { fingerprintValidatedObject } from "../src/fingerprint/index.ts";
import { validateSpecificationGraph } from "../src/graph/index.ts";
import { loadSpecificationDocuments } from "../src/markdown/index.ts";
import { nodeFileSystem } from "../src/platform/index.ts";

const schemaVersion = "1.0" as const;
const suiteName = "sdd-macos-conformance" as const;

type DeterministicCase = {
  readonly name: string;
  readonly document_count: number;
  readonly object_count: number;
  readonly diagnostics: readonly string[];
  readonly objects: readonly {
    readonly object_id: ObjectId;
    readonly semantic_fingerprint: string | null;
    readonly structural_fingerprint: string;
  }[];
};

type DeterministicManifest = {
  readonly schema_version: typeof schemaVersion;
  readonly suite: typeof suiteName;
  readonly cases: readonly DeterministicCase[];
  readonly security_fixture_sha256: string;
};

export type MacosConformanceReport = {
  readonly schema_version: typeof schemaVersion;
  readonly suite: typeof suiteName;
  readonly status: "MET";
  readonly platform: "darwin";
  readonly architecture: string;
  readonly os_release: string;
  readonly node_version: string;
  readonly tool_version: string;
  readonly source_sha256: string;
  readonly deterministic_manifest_sha256: string;
  readonly external_run: {
    readonly provider: "github-actions" | "local";
    readonly run_id: string | null;
    readonly git_sha: string | null;
  };
  readonly checks: readonly ["product-and-security-tests", "package", "schemas", "build", "typecheck", "format"];
  readonly deterministic_manifest: DeterministicManifest;
};

function sha256(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sourceFingerprint(root: string): Promise<string> {
  const files = [
    "package.json",
    "package-lock.json",
    "scripts/macos-conformance.ts",
    "scripts/performance-benchmark.ts",
  ];
  const visit = async (relativeDirectory: string): Promise<void> => {
    const entries = await readdir(join(root, relativeDirectory), { withFileTypes: true });
    for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) await visit(relativePath);
      else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(relativePath);
    }
  };
  await visit("src");
  const hash = createHash("sha256");
  for (const path of files.toSorted((left, right) => left.localeCompare(right))) {
    hash.update(path, "utf8");
    hash.update("\0", "utf8");
    hash.update(await readFile(join(root, ...path.split("/"))));
  }
  return `sha256:${hash.digest("hex")}`;
}

async function toolVersion(root: string): Promise<string> {
  const value: unknown = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (typeof value !== "object" || value === null || !("version" in value) || typeof value.version !== "string") {
    throw new Error("package.json does not contain a string version.");
  }
  return value.version;
}

async function deterministicCase(
  root: string,
  name: string,
  specRoot: ProjectPath,
  entrypoint: ProjectPath,
): Promise<DeterministicCase> {
  const loaded = await loadSpecificationDocuments(nodeFileSystem, root, specRoot);
  if (!loaded.ok) throw new Error(`${name} load failed: ${loaded.diagnostics[0]?.code ?? "unknown"}`);
  const graph = validateSpecificationGraph(loaded.value, entrypoint);
  if (!graph.ok) throw new Error(`${name} graph failed: ${graph.diagnostics[0]?.code ?? "unknown"}`);
  return {
    name,
    document_count: graph.value.documents.size,
    object_count: graph.value.objects.size,
    diagnostics: graph.diagnostics.map((diagnostic) => diagnostic.code).toSorted(),
    objects: [...graph.value.objects.keys()].toSorted().map((objectId) => {
      const object = graph.value.objects.get(objectId);
      if (object === undefined) throw new Error(`Validated object ${objectId} disappeared.`);
      return {
        object_id: objectId,
        semantic_fingerprint:
          !("anchor" in object) && object.type === "capability"
            ? null
            : fingerprintValidatedObject(graph.value, objectId, "semantic"),
        structural_fingerprint: fingerprintValidatedObject(graph.value, objectId, "structural"),
      };
    }),
  };
}

async function deterministicManifest(root: string): Promise<DeterministicManifest> {
  return {
    schema_version: schemaVersion,
    suite: suiteName,
    cases: [
      await deterministicCase(root, "canonical-spec", "spec" as ProjectPath, "spec/README.md" as ProjectPath),
      await deterministicCase(
        root,
        "representative-fixture",
        "fixtures/v1/markdown/documents/representative-valid" as ProjectPath,
        "fixtures/v1/markdown/documents/representative-valid/README.md" as ProjectPath,
      ),
    ],
    security_fixture_sha256: sha256(await readFile(join(root, "fixtures/v1/security/cases.json"))),
  };
}

export async function createMacosConformanceReport(options: {
  readonly root: string;
  readonly runId?: string;
  readonly gitSha?: string;
  readonly platformName?: string;
}): Promise<MacosConformanceReport> {
  const platformName = options.platformName ?? platform();
  if (platformName !== "darwin") throw new Error("macOS conformance requires Darwin.");
  const manifest = await deterministicManifest(options.root);
  return {
    schema_version: schemaVersion,
    suite: suiteName,
    status: "MET",
    platform: "darwin",
    architecture: arch(),
    os_release: release(),
    node_version: process.version,
    tool_version: await toolVersion(options.root),
    source_sha256: await sourceFingerprint(options.root),
    deterministic_manifest_sha256: sha256(canonicalJson(manifest)),
    external_run: {
      provider: options.runId === undefined ? "local" : "github-actions",
      run_id: options.runId ?? null,
      git_sha: options.gitSha ?? null,
    },
    checks: ["product-and-security-tests", "package", "schemas", "build", "typecheck", "format"],
    deterministic_manifest: manifest,
  };
}

export async function writeNewJson(path: string, value: unknown): Promise<void> {
  await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

function optionValue(argumentsValue: readonly string[], name: string): string | undefined {
  const index = argumentsValue.indexOf(name);
  return index === -1 ? undefined : argumentsValue[index + 1];
}

async function main(argumentsValue: readonly string[]): Promise<void> {
  const output = optionValue(argumentsValue, "--output");
  if (output === undefined) throw new Error("macOS conformance requires a create-only --output path.");
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  await writeNewJson(
    output,
    await createMacosConformanceReport({
      root,
      ...(optionValue(argumentsValue, "--run-id") === undefined
        ? {}
        : { runId: optionValue(argumentsValue, "--run-id")! }),
      ...(optionValue(argumentsValue, "--git-sha") === undefined
        ? {}
        : { gitSha: optionValue(argumentsValue, "--git-sha")! }),
    }),
  );
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Unknown macOS conformance failure."}\n`);
    process.exitCode = 1;
  });
}
