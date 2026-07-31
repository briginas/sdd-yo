import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
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
};

type PackResult = {
  readonly filename: string;
  readonly files: readonly PackedFile[];
};

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

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

async function runNpm(argv: readonly string[], cwd: string, cache: string): Promise<CommandResult> {
  const npmExecPath = process.env["npm_execpath"];
  assert.ok(npmExecPath, "package smoke must run through npm so its CLI path is explicit");
  return await runCommand(process.execPath, [npmExecPath, ...argv], cwd, {
    ...process.env,
    npm_config_cache: cache,
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

async function expectedPackedFiles(): Promise<readonly string[]> {
  const sourceFiles = (await listFiles(join(repositoryRoot, "src"))).filter((path) => path.endsWith(".ts"));
  const generatedFiles = sourceFiles.flatMap((path) => {
    const base = `dist/${path.slice(0, -3)}`;
    return [`${base}.d.ts`, `${base}.d.ts.map`, `${base}.js`, `${base}.js.map`];
  });
  const schemaFiles = (await listFiles(join(repositoryRoot, "contracts/v1/schemas"))).map(
    (path) => `contracts/v1/schemas/${path}`,
  );
  return ["package.json", ...generatedFiles, ...schemaFiles].sort();
}

function parsePackResult(standardOutput: string): PackResult {
  const value: unknown = JSON.parse(standardOutput);
  assert.ok(Array.isArray(value) && value.length === 1, "npm pack must describe exactly one artifact");
  const result: unknown = value[0];
  assert.ok(result && typeof result === "object");
  assert.ok("filename" in result && typeof result.filename === "string");
  assert.ok("files" in result && Array.isArray(result.files));
  return result as PackResult;
}

test("bootstrap package builds, packs, stages, imports, and wires sdd offline", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "sdd-yo-package-smoke-"));
  const npmCache = join(temporaryRoot, "npm-cache");

  try {
    const build = await runNpm(["run", "build"], repositoryRoot, npmCache);
    assert.equal(build.exitCode, 0, build.standardError || build.standardOutput);
    assert.equal(build.signal, null);

    const pack = await runNpm(["pack", "--json", "--pack-destination", temporaryRoot], repositoryRoot, npmCache);
    assert.equal(pack.exitCode, 0, pack.standardError || pack.standardOutput);
    const packResult = parsePackResult(pack.standardOutput);
    assert.deepEqual(packResult.files.map((file) => file.path).sort(), await expectedPackedFiles());

    const tarballPath = join(temporaryRoot, packResult.filename);
    assert.ok((await stat(tarballPath)).isFile());

    const consumerRoot = join(temporaryRoot, "consumer");
    const installedPackageRoot = join(consumerRoot, "node_modules/sdd-yo");
    await mkdir(installedPackageRoot, { recursive: true });
    const extract = await runCommand(
      "tar",
      ["-xzf", tarballPath, "-C", installedPackageRoot, "--strip-components=1"],
      consumerRoot,
    );
    assert.equal(extract.exitCode, 0, extract.standardError);
    const installedManifest = JSON.parse(await readFile(join(installedPackageRoot, "package.json"), "utf8")) as {
      readonly bin?: Readonly<Record<string, string>>;
    };
    assert.deepEqual(installedManifest.bin, { sdd: "./dist/bin/sdd.js" });
    assert.ok((await stat(join(installedPackageRoot, "dist/index.d.ts"))).isFile());
    assert.ok((await stat(join(installedPackageRoot, "dist/schemas/v1/artifacts.generated.d.ts"))).isFile());
    assert.ok((await stat(join(installedPackageRoot, "contracts/v1/schemas/common.schema.json"))).isFile());

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
    const cli = await runCommand(process.execPath, [binTarget, "validate"], consumerRoot);
    assert.equal(cli.exitCode, 3);
    assert.equal(cli.signal, null);
    assert.equal(cli.standardOutput, "");
    assert.equal(cli.standardError, "sdd: no product commands are implemented in this bootstrap package.\n");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
