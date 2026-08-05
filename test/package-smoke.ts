import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";

type CommandResult = {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly standardOutput: string;
  readonly standardError: string;
};

type PackedFile = {
  readonly path: string;
  readonly size: number;
  readonly mode: number;
};

type PackResult = {
  readonly filename: string;
  readonly files: readonly PackedFile[];
  readonly shasum: string;
  readonly integrity: string;
  readonly size: number;
  readonly unpackedSize: number;
  readonly entryCount: number;
  readonly bundled: readonly string[];
};

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const forbiddenLifecycleScripts = [
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
  "prepublish",
  "prepublishOnly",
];

async function runCommand(
  executable: string,
  argv: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<CommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, argv, {
      cwd,
      env: environment,
      shell: false,
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
    child.once("error", reject);
    child.once("close", (exitCode, signal) => {
      resolve({ exitCode, signal, standardOutput, standardError });
    });
  });
}

async function runNpm(
  argv: readonly string[],
  cwd: string,
  cache: string,
  environment: NodeJS.ProcessEnv = {},
): Promise<CommandResult> {
  const npmExecPath = process.env["npm_execpath"];
  assert.ok(npmExecPath, "package smoke must run through npm so its CLI path is explicit");
  return await runCommand(process.execPath, [npmExecPath, ...argv], cwd, {
    ...process.env,
    npm_config_cache: cache,
    ...environment,
  });
}

async function listFiles(directory: string): Promise<readonly string[]> {
  const files: string[] = [];

  async function visit(currentDirectory: string): Promise<void> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        files.push(relative(directory, path).split(sep).join("/"));
      }
    }
  }

  await visit(directory);
  return files.sort();
}

async function expectedPackedProductFiles(): Promise<readonly string[]> {
  const sourceFiles = (await listFiles(join(repositoryRoot, "src"))).filter((path) => path.endsWith(".ts"));
  const generatedFiles = sourceFiles.flatMap((path) => {
    const base = `dist/${path.slice(0, -3)}`;
    return [`${base}.d.ts`, `${base}.d.ts.map`, `${base}.js`, `${base}.js.map`];
  });
  const schemaFiles = (await listFiles(join(repositoryRoot, "contracts/v1/schemas"))).map(
    (path) => `contracts/v1/schemas/${path}`,
  );
  const skillFiles = (await listFiles(join(repositoryRoot, "skills/sdd-yo"))).map((path) => `skills/sdd-yo/${path}`);
  return ["package.json", ...generatedFiles, ...schemaFiles, ...skillFiles].sort();
}

async function expectedBundledPackages(): Promise<readonly string[]> {
  const lock = JSON.parse(await readFile(join(repositoryRoot, "package-lock.json"), "utf8")) as {
    readonly packages: Readonly<Record<string, { readonly dev?: boolean; readonly link?: boolean }>>;
  };
  return Object.entries(lock.packages)
    .filter(([path, value]) => path.startsWith("node_modules/") && value.dev !== true && value.link !== true)
    .map(([path]) => path.slice("node_modules/".length))
    .sort();
}

function bundledPackageName(path: string): string {
  const segments = path.split("/");
  assert.equal(segments[0], "node_modules");
  assert.ok(segments[1]);
  if (!segments[1].startsWith("@")) return segments[1];
  assert.ok(segments[2]);
  return `${segments[1]}/${segments[2]}`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

function parsePackResult(standardOutput: string): PackResult {
  const value: unknown = JSON.parse(standardOutput);
  assert.ok(Array.isArray(value) && value.length === 1, "npm pack must describe exactly one artifact");
  const result: unknown = value[0];
  assert.ok(result && typeof result === "object");
  assert.ok("filename" in result && typeof result.filename === "string");
  assert.ok("files" in result && Array.isArray(result.files));
  assert.ok("bundled" in result && Array.isArray(result.bundled));
  return result as PackResult;
}

test("REQ-B0B35D6D REQ-A2199BC2 REQ-43B4311E REQ-FFE60B5A REQ-D9CF3A46 REQ-97D96950 package builds, packs, installs, imports, and runs sdd offline", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "sdd-yo-package-smoke-"));
  const buildCache = join(temporaryRoot, "build-cache");
  const installCache = join(temporaryRoot, "install-cache");
  const firstPackRoot = join(temporaryRoot, "pack-first");
  const secondPackRoot = join(temporaryRoot, "pack-second");
  const sentinelPath = join(temporaryRoot, "external-sentinel.txt");

  try {
    await mkdir(firstPackRoot);
    await mkdir(secondPackRoot);
    await writeFile(sentinelPath, "outside consumer\n");

    const build = await runNpm(["run", "build"], repositoryRoot, buildCache);
    assert.equal(build.exitCode, 0, build.standardError || build.standardOutput);
    assert.equal(build.signal, null);

    const firstPack = await runNpm(["pack", "--json", "--pack-destination", firstPackRoot], repositoryRoot, buildCache);
    const secondPack = await runNpm(
      ["pack", "--json", "--pack-destination", secondPackRoot],
      repositoryRoot,
      buildCache,
    );
    assert.equal(firstPack.exitCode, 0, firstPack.standardError || firstPack.standardOutput);
    assert.equal(secondPack.exitCode, 0, secondPack.standardError || secondPack.standardOutput);
    const firstPackResult = parsePackResult(firstPack.standardOutput);
    const secondPackResult = parsePackResult(secondPack.standardOutput);
    assert.deepEqual(firstPackResult, secondPackResult);

    const packedPaths = firstPackResult.files.map((file) => file.path);
    const packedProductPaths = packedPaths.filter((path) => !path.startsWith("node_modules/"));
    const bundledPaths = packedPaths.filter((path) => path.startsWith("node_modules/"));
    const bundledPackages = await expectedBundledPackages();
    assert.deepEqual(packedProductPaths.sort(), await expectedPackedProductFiles());
    assert.deepEqual([...firstPackResult.bundled].sort(), bundledPackages);
    assert.deepEqual([...new Set(bundledPaths.map(bundledPackageName))].sort(), bundledPackages);
    assert.equal(firstPackResult.entryCount, packedPaths.length);
    assert.equal(
      firstPackResult.unpackedSize,
      firstPackResult.files.reduce((total, file) => total + file.size, 0),
    );

    const tarballPath = join(firstPackRoot, firstPackResult.filename);
    const secondTarballPath = join(secondPackRoot, secondPackResult.filename);
    const tarballBytes = await readFile(tarballPath);
    assert.deepEqual(tarballBytes, await readFile(secondTarballPath));
    assert.equal(createHash("sha1").update(tarballBytes).digest("hex"), firstPackResult.shasum);
    assert.equal(`sha512-${createHash("sha512").update(tarballBytes).digest("base64")}`, firstPackResult.integrity);
    assert.equal(tarballBytes.byteLength, firstPackResult.size);

    const sourceManifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8")) as {
      readonly name: string;
      readonly version: string;
      readonly private: boolean;
      readonly type: string;
      readonly exports: Readonly<Record<string, unknown>>;
      readonly types: string;
      readonly bin: Readonly<Record<string, string>>;
      readonly files: readonly string[];
      readonly engines: Readonly<Record<string, string>>;
      readonly scripts: Readonly<Record<string, string>>;
      readonly dependencies: Readonly<Record<string, string>>;
      readonly bundleDependencies: readonly string[];
    };
    assert.equal(sourceManifest.private, true);
    assert.deepEqual([...sourceManifest.bundleDependencies].sort(), Object.keys(sourceManifest.dependencies).sort());
    for (const hook of forbiddenLifecycleScripts) assert.equal(sourceManifest.scripts[hook], undefined);

    const repositoryStatusBeforeInstall = await runCommand(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      repositoryRoot,
    );
    assert.equal(repositoryStatusBeforeInstall.exitCode, 0, repositoryStatusBeforeInstall.standardError);

    const consumerRoot = join(temporaryRoot, "consumer");
    await mkdir(consumerRoot);
    await writeFile(
      join(consumerRoot, "package.json"),
      `${JSON.stringify({ name: "sdd-yo-consumer", version: "1.0.0", private: true, type: "module" }, null, 2)}\n`,
    );
    const install = await runNpm(
      ["install", "--offline", "--no-audit", "--no-fund", "--save-exact", tarballPath],
      consumerRoot,
      installCache,
      {
        npm_config_registry: "http://127.0.0.1:9/",
        npm_config_update_notifier: "false",
      },
    );
    assert.equal(install.exitCode, 0, install.standardError || install.standardOutput);
    assert.equal(install.signal, null);
    assert.equal(await readFile(sentinelPath, "utf8"), "outside consumer\n");
    assert.equal(await pathExists(join(consumerRoot, ".agents")), false);
    assert.equal(await pathExists(join(consumerRoot, ".sdd")), false);

    const repositoryStatusAfterInstall = await runCommand(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      repositoryRoot,
    );
    assert.deepEqual(repositoryStatusAfterInstall, repositoryStatusBeforeInstall);

    const installedPackageRoot = join(consumerRoot, "node_modules/sdd-yo");
    const installedManifest = JSON.parse(await readFile(join(installedPackageRoot, "package.json"), "utf8")) as {
      readonly name: string;
      readonly version: string;
      readonly private: boolean;
      readonly type: string;
      readonly exports: Readonly<Record<string, unknown>>;
      readonly types: string;
      readonly bin: Readonly<Record<string, string>>;
      readonly files: readonly string[];
      readonly engines: Readonly<Record<string, string>>;
      readonly scripts: Readonly<Record<string, string>>;
      readonly bundleDependencies: readonly string[];
    };
    assert.equal(installedManifest.name, sourceManifest.name);
    assert.equal(installedManifest.version, sourceManifest.version);
    assert.equal(installedManifest.private, true);
    assert.equal(installedManifest.type, sourceManifest.type);
    assert.deepEqual(installedManifest.exports, sourceManifest.exports);
    assert.equal(installedManifest.types, sourceManifest.types);
    assert.deepEqual(installedManifest.bin, sourceManifest.bin);
    assert.deepEqual(installedManifest.files, sourceManifest.files);
    assert.deepEqual(installedManifest.engines, { node: ">=22.18.0" });
    assert.deepEqual(installedManifest.bundleDependencies, sourceManifest.bundleDependencies);
    for (const hook of forbiddenLifecycleScripts) assert.equal(installedManifest.scripts[hook], undefined);

    assert.ok((await stat(join(installedPackageRoot, "dist/index.d.ts"))).isFile());
    assert.ok((await stat(join(installedPackageRoot, "dist/schemas/v1/artifacts.generated.d.ts"))).isFile());
    assert.ok((await stat(join(installedPackageRoot, "contracts/v1/schemas/common.schema.json"))).isFile());

    const sourceSkillRoot = join(repositoryRoot, "skills/sdd-yo");
    const installedSkillRoot = join(installedPackageRoot, "skills/sdd-yo");
    const skillFiles = await listFiles(sourceSkillRoot);
    assert.deepEqual(await listFiles(installedSkillRoot), skillFiles);
    for (const path of skillFiles)
      assert.deepEqual(await readFile(join(installedSkillRoot, path)), await readFile(join(sourceSkillRoot, path)));

    const schemaFiles = await listFiles(join(repositoryRoot, "contracts/v1/schemas"));
    for (const path of schemaFiles)
      assert.deepEqual(
        await readFile(join(installedPackageRoot, "contracts/v1/schemas", path)),
        await readFile(join(repositoryRoot, "contracts/v1/schemas", path)),
      );

    const importProbe = await runCommand(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        [
          'import { readFile } from "node:fs/promises";',
          'import { JSON_SCHEMA_VERSION_V1 } from "sdd-yo";',
          'const schemaUrl = import.meta.resolve("sdd-yo/schemas/v1/common.schema.json");',
          'const schema = JSON.parse(await readFile(new URL(schemaUrl), "utf8"));',
          "process.stdout.write(`${JSON_SCHEMA_VERSION_V1} ${schema.$schema}`);",
        ].join(""),
      ],
      consumerRoot,
    );
    assert.equal(importProbe.exitCode, 0, importProbe.standardError);
    assert.equal(importProbe.standardOutput, "1.0 https://json-schema.org/draft/2020-12/schema");

    const binTarget = join(installedPackageRoot, installedManifest.bin.sdd ?? "");
    assert.match(await readFile(binTarget, "utf8"), /^#!\/usr\/bin\/env node\n/);

    const consumerFilesBeforeIdentity = await listFiles(consumerRoot);
    const help = await runCommand(process.execPath, [binTarget, "--help"], consumerRoot);
    assert.equal(help.exitCode, 0, help.standardError);
    assert.equal(help.standardError, "");
    assert.match(help.standardOutput, /^sdd - repository-native specification governance\n/u);
    for (const path of ["validate", "proposal prepare", "tests discover", "merge check"])
      assert.match(help.standardOutput, new RegExp(`  ${path}`, "u"));

    const commandHelp = await runCommand(process.execPath, [binTarget, "proposal", "prepare", "--help"], consumerRoot);
    assert.equal(commandHelp.exitCode, 0, commandHelp.standardError);
    assert.equal(commandHelp.standardError, "");
    assert.match(commandHelp.standardOutput, /^Usage: sdd proposal prepare /u);

    const version = await runCommand(process.execPath, [binTarget, "--version"], consumerRoot);
    assert.deepEqual(version, {
      exitCode: 0,
      signal: null,
      standardOutput: `${installedManifest.version}\n`,
      standardError: "",
    });

    const jsonVersion = await runCommand(process.execPath, [binTarget, "--version", "--format", "json"], consumerRoot);
    assert.equal(jsonVersion.exitCode, 0, jsonVersion.standardError);
    assert.equal(jsonVersion.standardError, "");
    assert.deepEqual(JSON.parse(jsonVersion.standardOutput), {
      schema_version: "1.0",
      command: "version",
      project_id: null,
      status: "ok",
      result: {
        package: { name: installedManifest.name, version: installedManifest.version },
        cli: { name: "sdd", version: installedManifest.version },
        json_schema: { version: "1.0", compatible_major: 1 },
        skill: { name: "sdd-yo", protocol_version: "1.0", compatible_major: 1 },
      },
      diagnostics: [],
    });
    assert.deepEqual(await listFiles(consumerRoot), consumerFilesBeforeIdentity);

    const cli = await runCommand(process.execPath, [binTarget, "validate"], consumerRoot);
    assert.equal(cli.exitCode, 3);
    assert.equal(cli.signal, null);
    assert.equal(
      cli.standardOutput,
      "validate: error\nERROR SDD_CONFIG_NOT_FOUND: No .sdd/config.yaml was found for the requested project.\n",
    );
    assert.equal(cli.standardError, "");

    const validCli = await runCommand(
      process.execPath,
      [binTarget, "validate", "--cwd", repositoryRoot, "--format", "json"],
      consumerRoot,
    );
    assert.equal(validCli.exitCode, 0, validCli.standardError || validCli.standardOutput);
    const validResponse = JSON.parse(validCli.standardOutput) as {
      schema_version: string;
      status: string;
      project_id: string;
      result: { fingerprints: readonly unknown[] };
    };
    assert.equal(validResponse.schema_version, "1.0");
    assert.equal(validResponse.status, "ok");
    assert.equal(validResponse.project_id, "SDD-17EF8B29");
    assert.ok(validResponse.result.fingerprints.length > 0);

    const compatibilityWrapper = join(installedSkillRoot, "scripts/check-cli-compatibility");
    const compatibleSkill = await runCommand(
      process.execPath,
      [compatibilityWrapper, "--cli", binTarget, "--", "validate", "--cwd", repositoryRoot],
      consumerRoot,
    );
    assert.equal(compatibleSkill.exitCode, 0, compatibleSkill.standardError || compatibleSkill.standardOutput);
    const compatibleResponse = JSON.parse(compatibleSkill.standardOutput) as {
      readonly schema_version: string;
      readonly project_id: string;
      readonly status: string;
    };
    assert.equal(compatibleResponse.schema_version, "1.0");
    assert.equal(compatibleResponse.project_id, "SDD-17EF8B29");
    assert.equal(compatibleResponse.status, "ok");
    assert.deepEqual(await listFiles(consumerRoot), consumerFilesBeforeIdentity);
    assert.equal(await readFile(sentinelPath, "utf8"), "outside consumer\n");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
