import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";

import { isProjectPath, parseProjectConfiguration, resolveConfiguredPath, resolveProject } from "../src/index.ts";
import type { FileSystem, FileSystemEntryKind, ProjectPath } from "../src/index.ts";

const encoder = new TextEncoder();

const nodeFileSystem: FileSystem = {
  readFile: async (path) => readFile(path),
  readDirectory: async () => {
    throw new Error("readDirectory is not used by configuration resolution");
  },
  metadata: async (path) => {
    const value = await stat(path);
    const kind: FileSystemEntryKind = value.isFile() ? "file" : value.isDirectory() ? "directory" : "other";
    return { kind, size: value.size };
  },
  realPath: async (path) => realpath(path),
};

async function fixture(name: string): Promise<Uint8Array> {
  return readFile(join("fixtures", "v1", "configuration", name));
}

async function writeProject(root: string, fixtureName = "minimal-valid.yaml"): Promise<void> {
  const configPath = join(root, ".sdd", "config.yaml");
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, await fixture(fixtureName));
}

describe("REQ-0361538D project configuration", () => {
  test("strictly parses the minimal and representative version 1 schema", async () => {
    const minimal = parseProjectConfiguration(await fixture("minimal-valid.yaml"));
    assert.equal(minimal.ok, true);
    if (!minimal.ok) return;
    assert.equal(minimal.value.project_id, "SDD-17EF8B29");
    assert.deepEqual(minimal.value.tests.adapters, []);
    assert.deepEqual(minimal.value.tests.import_limits, {
      max_jsonl_bytes: 16_777_216,
      max_report_bytes: 16_777_216,
      max_xml_depth: 64,
      max_suite_count: 100_000,
      max_test_count: 100_000,
    });

    const representative = parseProjectConfiguration(await fixture("representative-valid.yaml"));
    assert.equal(representative.ok, true);
    if (!representative.ok) return;
    assert.deepEqual(
      representative.value.tests.adapters.map((adapter) => adapter.id),
      ["unit", "custom"],
    );
  });

  test("accepts command adapters that implement discovery, execution, or both", () => {
    for (const phases of ["discover", "execute", "both"] as const) {
      const result = parseProjectConfiguration(encoder.encode(commandAdapterSource(phases)));
      assert.equal(result.ok, true, phases);
    }

    const missingPhases = parseProjectConfiguration(encoder.encode(commandAdapterSource("neither")));
    assert.equal(missingPhases.ok, false);
    if (!missingPhases.ok) assert.equal(missingPhases.diagnostics[0]?.code, "SDD_CONFIG_INVALID_FIELD");
  });

  test("rejects duplicate keys, custom tags, aliases, unknown fields, and newer schemas", () => {
    const cases = [
      ["project_id: SDD-17EF8B29\nproject_id: SDD-AAAAAAAA\n", "SDD_CONFIG_DUPLICATE_KEY"],
      ["project_id: !include secret.yaml\n", "SDD_CONFIG_INVALID_YAML"],
      ["value: &value [one]\ncopy: *value\n", "SDD_CONFIG_YAML_ALIAS"],
      [
        new TextDecoder().decode(encoder.encode(validSource())).replace("schema_version: 1", "schema_version: 2"),
        "SDD_CONFIG_UNSUPPORTED_SCHEMA_VERSION",
      ],
      [validSource() + "unexpected: true\n", "SDD_CONFIG_UNKNOWN_FIELD"],
    ] as const;

    for (const [source, expectedCode] of cases) {
      const result = parseProjectConfiguration(encoder.encode(source));
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.diagnostics[0]?.code, expectedCode);
    }
  });

  test("rejects paths that could escape or vary across project platforms", () => {
    for (const unsafe of ["../spec", "/spec", "C:/spec", "spec\\README.md", ".git/config", "NUL/file"]) {
      const result = parseProjectConfiguration(encoder.encode(validSource().replace("root: spec", `root: ${unsafe}`)));
      assert.equal(result.ok, false, unsafe);
      if (!result.ok) assert.equal(result.diagnostics[0]?.code, "SDD_CONFIG_INVALID_FIELD");
    }
  });

  test("selects the nearest project when one repository contains nested configurations", async () => {
    const repository = await mkdtemp(join(tmpdir(), "sdd-config-nearest-"));
    const outer = join(repository, "outer");
    const inner = join(outer, "packages", "inner");
    const workingDirectory = join(inner, "src");
    await writeProject(outer);
    await writeProject(inner, "representative-valid.yaml");
    await mkdir(workingDirectory, { recursive: true });

    const result = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: workingDirectory });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.project_root, await realpath(inner));
    assert.equal(result.value.configuration.tests.adapters.length, 2);
  });

  test("uses an explicit exact config instead of the nearest project", async () => {
    const repository = await mkdtemp(join(tmpdir(), "sdd-config-explicit-"));
    const outer = join(repository, "outer");
    const inner = join(outer, "inner");
    await writeProject(outer, "representative-valid.yaml");
    await writeProject(inner);

    const result = await resolveProject(nodeFileSystem, {
      kind: "explicit",
      config_path: join("..", ".sdd", "config.yaml"),
      working_directory: inner,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.project_root, await realpath(outer));
    assert.equal(result.value.configuration.tests.adapters.length, 2);
  });

  test("reports no project and non-config explicit paths with stable diagnostics", async () => {
    const empty = await mkdtemp(join(tmpdir(), "sdd-config-empty-"));
    const missing = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: empty });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.diagnostics[0]?.code, "SDD_CONFIG_NOT_FOUND");

    const wrongPath = await resolveProject(nodeFileSystem, {
      kind: "explicit",
      config_path: "config.yaml",
      working_directory: empty,
    });
    assert.equal(wrongPath.ok, false);
    if (!wrongPath.ok) assert.equal(wrongPath.diagnostics[0]?.code, "SDD_CONFIG_PATH_INVALID");
  });

  test("resolves configured paths only against the selected project root", () => {
    const pathValue: unknown = "spec/README.md";
    assert.ok(isProjectPath(pathValue));
    const projectPath: ProjectPath = pathValue;
    assert.equal(resolveConfiguredPath("/repo/packages/a", projectPath), "/repo/packages/a/spec/README.md");
  });
});

function validSource(): string {
  return `schema_version: 1
project_id: SDD-17EF8B29
spec:
  root: spec
  entrypoint: spec/README.md
adoption:
  mode: incremental
git:
  default_target_ref: main
ids:
  suffix_length: 8
  alphabet: hex-uppercase
tests:
  adapters: []
evidence:
  allowed_issuers: []
`;
}

function commandAdapterSource(phases: "discover" | "execute" | "both" | "neither"): string {
  const discover =
    phases === "discover" || phases === "both" ? '      discover:\n        argv: ["node", "discover.mjs"]\n' : "";
  const execute =
    phases === "execute" || phases === "both" ? '      execute:\n        argv: ["node", "execute.mjs"]\n' : "";
  return validSource().replace(
    "  adapters: []\n",
    `  adapters:\n    - id: custom\n      type: command\n      protocol: jsonl-v1\n${discover}${execute}      timeout_ms: 1000\n      max_output_bytes: 1024\n`,
  );
}
