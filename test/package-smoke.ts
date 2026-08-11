import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
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
const documentedQuickstartCommands = [
  "npm exec --package=sdd-yo@0.5.0 -- sdd skill install --scope user --format json",
  "node ~/.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root /absolute/path/to/repository --adoption incremental",
  "node ~/.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd /absolute/path/to/repository",
  "cd /absolute/path/to/repository",
  "npm install --save-dev --save-exact sdd-yo@0.5.0",
  "npm exec -- sdd --version --format json",
  "node ./node_modules/sdd-yo/dist/bin/sdd.js skill install --root /absolute/path/to/repository --format json",
  "node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- init --root /absolute/path/to/repository --adoption incremental",
  "node ./.agents/skills/sdd-yo/scripts/check-cli-compatibility -- validate --cwd /absolute/path/to/repository",
  "npm exec --package=sdd-yo@0.5.0 -- sdd --version --format json",
  "npm exec --package=sdd-yo@0.5.0 -- sdd validate --cwd /absolute/path/to/repository --format json",
  "npm install --offline --no-audit --no-fund --save-exact <tarball-path>",
  "node ./node_modules/sdd-yo/dist/bin/sdd.js --version --format json",
  "mkdir .sdd-tooling",
  "mkdir .sdd-tooling/consumer",
  "cd .sdd-tooling/consumer",
  "npm init --yes",
  "node ./.sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js --version --format json",
  "node ./.sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js skill install --root <repository-root> --format json",
  "node ./node_modules/sdd-yo/dist/bin/sdd.js validate --cwd <repository-root> --format json",
  "node ./node_modules/sdd-yo/dist/bin/sdd.js skill update --root <repository-root> --format json",
  "node ./node_modules/sdd-yo/dist/bin/sdd.js skill remove --root <repository-root> --format json",
  "node ./node_modules/sdd-yo/dist/bin/sdd.js skill update --scope user --format json",
  "node ./node_modules/sdd-yo/dist/bin/sdd.js skill remove --scope user --format json",
] as const;
const documentedLibrarySnippets = [
  'import { JSON_SCHEMA_VERSION_V1 } from "sdd-yo";',
  "sdd-yo/schemas/v1/common.schema.json",
] as const;
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
  return ["LICENSE", "README.md", "package.json", ...generatedFiles, ...schemaFiles, ...skillFiles].sort();
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

test("REQ-B0B35D6D REQ-A2199BC2 REQ-43B4311E REQ-0163273A REQ-3F19778B REQ-CF3A1070 REQ-A0456614 REQ-DAF21960 REQ-8DC50806 REQ-AA165BDE REQ-FFE60B5A REQ-D9CF3A46 REQ-97D96950 REQ-382BBBD6 REQ-7C848ED0 REQ-778099C0 REQ-C975AE17 REQ-05CABE17 REQ-2B49D454 REQ-DEB23207 REQ-C18AEE90 REQ-50351033 package builds, verifies public and offline quickstarts, manages repository and macOS user Skills, and completes first use offline", async () => {
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
      readonly description: string;
      readonly private: boolean;
      readonly publishConfig: Readonly<{ access: string; provenance: boolean }>;
      readonly license: string;
      readonly repository: Readonly<{ type: string; url: string }>;
      readonly bugs: Readonly<{ url: string }>;
      readonly homepage: string;
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
    assert.equal(
      sourceManifest.description,
      "Repository-native specification governance with a deterministic CLI and optional Agent Skill.",
    );
    assert.equal(sourceManifest.name, "sdd-yo");
    assert.equal(sourceManifest.version, "0.5.0");
    assert.equal(sourceManifest.private, false);
    assert.deepEqual(sourceManifest.publishConfig, { access: "public", provenance: true });
    assert.equal(sourceManifest.license, "Apache-2.0");
    assert.deepEqual(sourceManifest.repository, {
      type: "git",
      url: "git+https://github.com/briginas/sdd-yo.git",
    });
    assert.deepEqual(sourceManifest.bugs, { url: "https://github.com/briginas/sdd-yo/issues" });
    assert.equal(sourceManifest.homepage, "https://github.com/briginas/sdd-yo#readme");
    assert.deepEqual([...sourceManifest.bundleDependencies].sort(), Object.keys(sourceManifest.dependencies).sort());
    for (const hook of forbiddenLifecycleScripts) assert.equal(sourceManifest.scripts[hook], undefined);
    const quickstart = await readFile(join(repositoryRoot, "README.md"), "utf8");
    for (const command of documentedQuickstartCommands) assert.ok(quickstart.includes(command), command);
    for (const snippet of documentedLibrarySnippets) assert.ok(quickstart.includes(snippet), snippet);
    for (const diagnostic of [
      "SDD_CONFIG_NOT_FOUND",
      "SDD_INIT_TARGET_CONFLICT",
      "SDD_INIT_ROOT_INVALID",
      "SDD_INIT_TARGET_UNSAFE",
      "SDD_GIT_HISTORY_INCOMPLETE",
      "SDD_GIT_REF_UNRESOLVED",
      "SDD_USER_SKILL_PLATFORM_UNSUPPORTED",
      "SDD_USER_SKILL_PACKAGE_INVALID",
      "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "SDD_USER_SKILL_RECOVERY_REQUIRED",
    ])
      assert.ok(quickstart.includes(`\`${diagnostic}\``), diagnostic);
    assert.match(quickstart, /use `\$sdd-yo`/u);
    assert.match(quickstart, /do not create or imply human approval, semantic\nreview, QA/u);

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
      ["install", "--no-audit", "--no-fund", "--save-exact", tarballPath],
      consumerRoot,
      installCache,
      { npm_config_update_notifier: "false" },
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
      readonly description: string;
      readonly private: boolean;
      readonly publishConfig: Readonly<{ access: string; provenance: boolean }>;
      readonly license: string;
      readonly repository: Readonly<{ type: string; url: string }>;
      readonly bugs: Readonly<{ url: string }>;
      readonly homepage: string;
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
    assert.equal(installedManifest.description, sourceManifest.description);
    assert.equal(installedManifest.private, false);
    assert.deepEqual(installedManifest.publishConfig, sourceManifest.publishConfig);
    assert.equal(installedManifest.license, sourceManifest.license);
    assert.deepEqual(installedManifest.repository, sourceManifest.repository);
    assert.deepEqual(installedManifest.bugs, sourceManifest.bugs);
    assert.equal(installedManifest.homepage, sourceManifest.homepage);
    assert.equal(installedManifest.type, sourceManifest.type);
    assert.deepEqual(installedManifest.exports, sourceManifest.exports);
    assert.equal(installedManifest.types, sourceManifest.types);
    assert.deepEqual(installedManifest.bin, sourceManifest.bin);
    assert.deepEqual(installedManifest.files, sourceManifest.files);
    assert.deepEqual(installedManifest.engines, { node: ">=22.18.0" });
    assert.deepEqual(installedManifest.bundleDependencies, sourceManifest.bundleDependencies);
    for (const hook of forbiddenLifecycleScripts) assert.equal(installedManifest.scripts[hook], undefined);
    assert.deepEqual(
      await readFile(join(installedPackageRoot, "README.md")),
      await readFile(join(repositoryRoot, "README.md")),
    );
    assert.deepEqual(
      await readFile(join(installedPackageRoot, "LICENSE")),
      await readFile(join(repositoryRoot, "LICENSE")),
    );

    assert.ok((await stat(join(installedPackageRoot, "dist/index.d.ts"))).isFile());
    assert.ok((await stat(join(installedPackageRoot, "dist/schemas/v1/artifacts.generated.d.ts"))).isFile());
    assert.ok((await stat(join(installedPackageRoot, "contracts/v1/schemas/common.schema.json"))).isFile());

    const sourceSkillRoot = join(repositoryRoot, "skills/sdd-yo");
    const installedSkillRoot = join(installedPackageRoot, "skills/sdd-yo");
    const skillFiles = await listFiles(sourceSkillRoot);
    assert.deepEqual(await listFiles(installedSkillRoot), skillFiles);
    for (const path of skillFiles)
      assert.deepEqual(await readFile(join(installedSkillRoot, path)), await readFile(join(sourceSkillRoot, path)));
    assert.match(await readFile(join(installedSkillRoot, "agents/openai.yaml"), "utf8"), /Use \$sdd-yo/u);

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
    for (const path of [
      "skill install",
      "skill update",
      "skill remove",
      "validate",
      "proposal prepare",
      "tests discover",
      "merge check",
    ])
      assert.match(help.standardOutput, new RegExp(`  ${path}`, "u"));

    const commandHelp = await runCommand(process.execPath, [binTarget, "proposal", "prepare", "--help"], consumerRoot);
    assert.equal(commandHelp.exitCode, 0, commandHelp.standardError);
    assert.equal(commandHelp.standardError, "");
    assert.match(commandHelp.standardOutput, /^Usage: sdd proposal prepare /u);

    for (const lifecycle of ["install", "update", "remove"] as const) {
      const lifecycleHelp = await runCommand(process.execPath, [binTarget, "skill", lifecycle, "--help"], consumerRoot);
      assert.equal(lifecycleHelp.exitCode, 0, lifecycleHelp.standardError);
      assert.ok(
        lifecycleHelp.standardOutput.startsWith(
          `Usage: sdd skill ${lifecycle} (--root <repository-root> | --scope user)\n`,
        ),
      );
      assert.doesNotMatch(lifecycleHelp.standardOutput, /--scope user --root/u);
    }

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

    const gitInitialization = await runCommand("git", ["init", "--quiet", "--initial-branch", "main"], consumerRoot);
    assert.equal(gitInitialization.exitCode, 0, gitInitialization.standardError);
    for (const [key, value] of [
      ["user.name", "SDD Package Smoke"],
      ["user.email", "sdd-package-smoke@example.invalid"],
    ] as const) {
      const configured = await runCommand("git", ["config", key, value], consumerRoot);
      assert.equal(configured.exitCode, 0, configured.standardError);
    }
    const stagedConsumer = await runCommand("git", ["add", "package.json", "package-lock.json"], consumerRoot);
    assert.equal(stagedConsumer.exitCode, 0, stagedConsumer.standardError);
    const committedConsumer = await runCommand("git", ["commit", "--quiet", "-m", "initial consumer"], consumerRoot);
    assert.equal(committedConsumer.exitCode, 0, committedConsumer.standardError);
    const skillInstallation = await runCommand(
      process.execPath,
      [binTarget, "skill", "install", "--root", consumerRoot, "--format", "json"],
      consumerRoot,
    );
    assert.equal(skillInstallation.exitCode, 0, skillInstallation.standardError || skillInstallation.standardOutput);
    const installationResponse = JSON.parse(skillInstallation.standardOutput) as {
      readonly command: string;
      readonly project_id: null;
      readonly status: string;
      readonly result: {
        readonly destination: string;
        readonly installed_paths: readonly string[];
        readonly payload_fingerprint: string;
      };
    };
    assert.equal(installationResponse.command, "skill.install");
    assert.equal(installationResponse.project_id, null);
    assert.equal(installationResponse.status, "ok");
    assert.equal(installationResponse.result.destination, ".agents/skills/sdd-yo");
    assert.match(installationResponse.result.payload_fingerprint, /^sha256:[0-9a-f]{64}$/u);

    const repositorySkillRoot = join(consumerRoot, installationResponse.result.destination);
    assert.deepEqual(
      (await listFiles(repositorySkillRoot)).filter((path) => path !== "installation.json"),
      skillFiles,
    );
    for (const path of skillFiles)
      assert.deepEqual(await readFile(join(repositorySkillRoot, path)), await readFile(join(installedSkillRoot, path)));
    const binding = JSON.parse(await readFile(join(repositorySkillRoot, "installation.json"), "utf8")) as {
      readonly cli: { readonly path: string; readonly version: string };
      readonly skill: { readonly payload_fingerprint: string };
    };
    assert.equal(binding.cli.path, "node_modules/sdd-yo/dist/bin/sdd.js");
    assert.equal(binding.cli.version, installedManifest.version);
    assert.equal(binding.skill.payload_fingerprint, installationResponse.result.payload_fingerprint);

    const skillUpdate = await runCommand(
      process.execPath,
      [binTarget, "skill", "update", "--root", consumerRoot, "--format", "json"],
      consumerRoot,
    );
    assert.equal(skillUpdate.exitCode, 0, skillUpdate.standardError || skillUpdate.standardOutput);
    const updateResponse = JSON.parse(skillUpdate.standardOutput) as {
      readonly command: string;
      readonly status: string;
      readonly result: { readonly outcome: string; readonly owned_paths: readonly string[] };
    };
    assert.equal(updateResponse.command, "skill.update");
    assert.equal(updateResponse.status, "ok");
    assert.equal(updateResponse.result.outcome, "unchanged");
    assert.deepEqual(updateResponse.result.owned_paths, installationResponse.result.installed_paths);

    const repositoryWrapper = join(repositorySkillRoot, "scripts/check-cli-compatibility");
    const firstInit = await runCommand(
      process.execPath,
      [repositoryWrapper, "--", "init", "--root", consumerRoot, "--adoption", "incremental"],
      consumerRoot,
    );
    assert.equal(firstInit.exitCode, 0, firstInit.standardError || firstInit.standardOutput);
    assert.equal(JSON.parse(firstInit.standardOutput).command, "init");
    const firstValidate = await runCommand(
      process.execPath,
      [repositoryWrapper, "--", "validate", "--cwd", consumerRoot],
      consumerRoot,
    );
    assert.equal(firstValidate.exitCode, 0, firstValidate.standardError || firstValidate.standardOutput);
    const firstValidateResponse = JSON.parse(firstValidate.standardOutput) as {
      readonly command: string;
      readonly status: string;
      readonly project_id: string;
    };
    assert.equal(firstValidateResponse.command, "validate");
    assert.equal(firstValidateResponse.status, "ok");
    assert.match(firstValidateResponse.project_id, /^SDD-[0-9A-F]{8}$/u);

    const automationValidate = await runCommand(
      process.execPath,
      [binTarget, "validate", "--cwd", consumerRoot, "--format", "json"],
      consumerRoot,
    );
    assert.equal(automationValidate.exitCode, 0, automationValidate.standardError || automationValidate.standardOutput);
    const automationResponse = JSON.parse(automationValidate.standardOutput) as {
      readonly schema_version: string;
      readonly command: string;
      readonly project_id: string;
      readonly status: string;
      readonly result: { readonly valid: boolean; readonly adoption: { readonly mode: string } };
      readonly diagnostics: readonly unknown[];
    };
    assert.equal(automationResponse.schema_version, "1.0");
    assert.equal(automationResponse.command, "validate");
    assert.equal(automationResponse.project_id, firstValidateResponse.project_id);
    assert.equal(automationResponse.status, "ok");
    assert.equal(automationResponse.result.valid, true);
    assert.equal(automationResponse.result.adoption.mode, "incremental");
    assert.deepEqual(automationResponse.diagnostics, []);

    const skillRemoval = await runCommand(
      process.execPath,
      [binTarget, "skill", "remove", "--root", consumerRoot, "--format", "json"],
      consumerRoot,
    );
    assert.equal(skillRemoval.exitCode, 0, skillRemoval.standardError || skillRemoval.standardOutput);
    const removalResponse = JSON.parse(skillRemoval.standardOutput) as {
      readonly command: string;
      readonly status: string;
      readonly result: { readonly removed_paths: readonly string[] };
    };
    assert.equal(removalResponse.command, "skill.remove");
    assert.equal(removalResponse.status, "ok");
    assert.deepEqual(removalResponse.result.removed_paths, installationResponse.result.installed_paths);
    await assert.rejects(readFile(join(repositorySkillRoot, "installation.json")), /ENOENT/u);
    assert.equal(await readFile(sentinelPath, "utf8"), "outside consumer\n");

    if (process.platform === "darwin") {
      const userHome = join(temporaryRoot, "user-home");
      const applicationSupport = join(userHome, "Library", "Application Support");
      await mkdir(applicationSupport, { recursive: true });
      const canonicalUserHome = await realpath(userHome);
      const canonicalApplicationSupport = await realpath(applicationSupport);
      const userEnvironment = { ...process.env, HOME: userHome, PATH: process.env["PATH"] ?? "" };
      const consumerLockBeforeUserLifecycle = await readFile(join(consumerRoot, "package-lock.json"));
      const consumerStatusBeforeUserLifecycle = await runCommand(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        consumerRoot,
      );

      const userInstallation = await runCommand(
        process.execPath,
        [binTarget, "skill", "install", "--scope", "user", "--format", "json"],
        consumerRoot,
        userEnvironment,
      );
      assert.equal(userInstallation.exitCode, 0, userInstallation.standardError || userInstallation.standardOutput);
      const userInstallationResponse = JSON.parse(userInstallation.standardOutput) as {
        readonly command: string;
        readonly project_id: null;
        readonly status: string;
        readonly result: {
          readonly scope: string;
          readonly skill_destination: string;
          readonly cli_destination: string;
          readonly owned_paths: readonly string[];
          readonly package_fingerprint: string;
          readonly payload_fingerprint: string;
        };
      };
      assert.equal(userInstallationResponse.command, "skill.install");
      assert.equal(userInstallationResponse.project_id, null);
      assert.equal(userInstallationResponse.status, "ok");
      assert.equal(userInstallationResponse.result.scope, "user");
      assert.equal(userInstallationResponse.result.skill_destination, join(canonicalUserHome, ".agents/skills/sdd-yo"));
      assert.equal(
        userInstallationResponse.result.cli_destination,
        join(canonicalApplicationSupport, "sdd-yo/cli", installedManifest.version),
      );
      assert.deepEqual(
        [...userInstallationResponse.result.owned_paths].sort(),
        userInstallationResponse.result.owned_paths,
      );
      assert.match(userInstallationResponse.result.package_fingerprint, /^sha256:[0-9a-f]{64}$/u);
      assert.match(userInstallationResponse.result.payload_fingerprint, /^sha256:[0-9a-f]{64}$/u);

      const userBindingPath = join(userInstallationResponse.result.skill_destination, "installation.json");
      const userBindingBytes = await readFile(userBindingPath, "utf8");
      const userBinding = JSON.parse(userBindingBytes) as {
        readonly schema_version: string;
        readonly artifact_type: string;
        readonly scope: string;
        readonly package: { readonly name: string; readonly version: string };
        readonly cli: { readonly path: string; readonly name: string; readonly version: string };
        readonly package_fingerprint: string;
        readonly package_files: readonly { readonly path: string; readonly sha256: string }[];
        readonly skill_files: readonly { readonly path: string; readonly sha256: string }[];
      };
      assert.equal(userBindingBytes, `${JSON.stringify(userBinding, null, 2)}\n`);
      assert.equal(userBinding.schema_version, "1.0");
      assert.equal(userBinding.artifact_type, "sdd_yo_user_skill_installation");
      assert.equal(userBinding.scope, "user");
      assert.deepEqual(userBinding.package, { name: installedManifest.name, version: installedManifest.version });
      assert.deepEqual(userBinding.cli, {
        name: "sdd",
        version: installedManifest.version,
        path: join(userInstallationResponse.result.cli_destination, "dist/bin/sdd.js"),
      });
      assert.equal(userBinding.package_fingerprint, userInstallationResponse.result.package_fingerprint);
      assert.deepEqual(
        userBinding.package_files.map((entry) => entry.path),
        await listFiles(installedPackageRoot),
      );
      assert.deepEqual(
        userBinding.skill_files.map((entry) => entry.path),
        await listFiles(installedSkillRoot),
      );

      const userWrapper = join(userInstallationResponse.result.skill_destination, "scripts/check-cli-compatibility");
      const userFirstUse = await runCommand(
        process.execPath,
        [userWrapper, "--", "validate", "--cwd", consumerRoot],
        consumerRoot,
        userEnvironment,
      );
      assert.equal(userFirstUse.exitCode, 0, userFirstUse.standardError || userFirstUse.standardOutput);
      const userFirstUseResponse = JSON.parse(userFirstUse.standardOutput) as {
        readonly status: string;
        readonly project_id: string;
      };
      assert.equal(userFirstUseResponse.status, "ok");
      assert.equal(userFirstUseResponse.project_id, firstValidateResponse.project_id);

      const noSelector = await runCommand(process.execPath, [userWrapper, "--", "validate"], consumerRoot, {
        ...userEnvironment,
        PATH: "",
      });
      assert.notEqual(noSelector.exitCode, 0);
      const explicitCli = await runCommand(
        process.execPath,
        [userWrapper, "--cli", binTarget, "--", "validate", "--cwd", consumerRoot],
        consumerRoot,
        { ...userEnvironment, PATH: "" },
      );
      assert.notEqual(explicitCli.exitCode, 0);

      const bindingBeforeUpdate = await readFile(userBindingPath);
      const userUpdate = await runCommand(
        process.execPath,
        [binTarget, "skill", "update", "--scope", "user", "--format", "json"],
        consumerRoot,
        userEnvironment,
      );
      assert.equal(userUpdate.exitCode, 0, userUpdate.standardError || userUpdate.standardOutput);
      assert.equal(JSON.parse(userUpdate.standardOutput).result.outcome, "unchanged");
      assert.deepEqual(await readFile(userBindingPath), bindingBeforeUpdate);

      const tamperPath = join(userInstallationResponse.result.cli_destination, "undeclared.txt");
      await writeFile(tamperPath, "foreign bytes\n");
      const refusedRemoval = await runCommand(
        process.execPath,
        [binTarget, "skill", "remove", "--scope", "user", "--format", "json"],
        consumerRoot,
        userEnvironment,
      );
      assert.equal(refusedRemoval.exitCode, 3);
      const refusedRemovalResponse = JSON.parse(refusedRemoval.standardOutput) as {
        readonly status: string;
        readonly diagnostics: readonly { readonly code: string }[];
      };
      assert.equal(refusedRemovalResponse.status, "error");
      assert.equal(refusedRemovalResponse.diagnostics[0]?.code, "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID");
      assert.equal(await pathExists(userBindingPath), true);
      assert.equal(await pathExists(tamperPath), true);
      await rm(tamperPath);

      const userRemoval = await runCommand(
        process.execPath,
        [binTarget, "skill", "remove", "--scope", "user", "--format", "json"],
        consumerRoot,
        userEnvironment,
      );
      assert.equal(userRemoval.exitCode, 0, userRemoval.standardError || userRemoval.standardOutput);
      assert.equal(JSON.parse(userRemoval.standardOutput).status, "ok");
      assert.equal(await pathExists(userInstallationResponse.result.skill_destination), false);
      assert.equal(await pathExists(userInstallationResponse.result.cli_destination), false);
      assert.deepEqual(await readFile(join(consumerRoot, "package-lock.json")), consumerLockBeforeUserLifecycle);
      assert.deepEqual(
        await runCommand("git", ["status", "--porcelain=v1", "--untracked-files=all"], consumerRoot),
        consumerStatusBeforeUserLifecycle,
      );
      assert.equal(await readFile(sentinelPath, "utf8"), "outside consumer\n");
    }

    const yarnPnpRoot = join(temporaryRoot, "yarn-pnp-consumer");
    const isolatedConsumerRoot = join(yarnPnpRoot, ".sdd-tooling/consumer");
    await mkdir(yarnPnpRoot);
    await writeFile(join(yarnPnpRoot, ".gitignore"), ".sdd-tooling/\n");
    await writeFile(join(yarnPnpRoot, ".pnp.cjs"), "module.exports = {};\n");
    await writeFile(
      join(yarnPnpRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "sdd-yo-yarn-pnp-consumer",
          version: "1.0.0",
          private: true,
          type: "module",
          packageManager: "yarn@4.9.2",
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(join(yarnPnpRoot, "yarn.lock"), "# retained Yarn Plug'n'Play baseline\n");
    const yarnGitInitialization = await runCommand("git", ["init", "--quiet", "--initial-branch", "main"], yarnPnpRoot);
    assert.equal(yarnGitInitialization.exitCode, 0, yarnGitInitialization.standardError);
    for (const [key, value] of [
      ["user.name", "SDD Package Smoke"],
      ["user.email", "sdd-package-smoke@example.invalid"],
    ] as const) {
      const configured = await runCommand("git", ["config", key, value], yarnPnpRoot);
      assert.equal(configured.exitCode, 0, configured.standardError);
    }
    const stagedYarnConsumer = await runCommand(
      "git",
      ["add", ".gitignore", ".pnp.cjs", "package.json", "yarn.lock"],
      yarnPnpRoot,
    );
    assert.equal(stagedYarnConsumer.exitCode, 0, stagedYarnConsumer.standardError);
    const committedYarnConsumer = await runCommand(
      "git",
      ["commit", "--quiet", "-m", "initial Yarn PnP consumer"],
      yarnPnpRoot,
    );
    assert.equal(committedYarnConsumer.exitCode, 0, committedYarnConsumer.standardError);

    await mkdir(join(yarnPnpRoot, ".sdd-tooling"));
    await mkdir(isolatedConsumerRoot);
    const isolatedInit = await runNpm(["init", "--yes"], isolatedConsumerRoot, installCache);
    assert.equal(isolatedInit.exitCode, 0, isolatedInit.standardError || isolatedInit.standardOutput);
    const isolatedInstall = await runNpm(
      ["install", "--offline", "--no-audit", "--no-fund", "--save-exact", tarballPath],
      isolatedConsumerRoot,
      installCache,
      {
        npm_config_registry: "http://127.0.0.1:9/",
        npm_config_update_notifier: "false",
      },
    );
    assert.equal(isolatedInstall.exitCode, 0, isolatedInstall.standardError || isolatedInstall.standardOutput);
    const isolatedBinTarget = join(isolatedConsumerRoot, "node_modules/sdd-yo/dist/bin/sdd.js");
    const isolatedIdentity = await runCommand(
      process.execPath,
      [isolatedBinTarget, "--version", "--format", "json"],
      yarnPnpRoot,
    );
    assert.equal(isolatedIdentity.exitCode, 0, isolatedIdentity.standardError || isolatedIdentity.standardOutput);
    assert.deepEqual(JSON.parse(isolatedIdentity.standardOutput), JSON.parse(jsonVersion.standardOutput));
    const yarnStatusBeforeSkill = await runCommand(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      yarnPnpRoot,
    );
    assert.deepEqual(yarnStatusBeforeSkill, {
      exitCode: 0,
      signal: null,
      standardOutput: "",
      standardError: "",
    });
    const isolatedSkillInstallation = await runCommand(
      process.execPath,
      [isolatedBinTarget, "skill", "install", "--root", yarnPnpRoot, "--format", "json"],
      yarnPnpRoot,
    );
    assert.equal(
      isolatedSkillInstallation.exitCode,
      0,
      isolatedSkillInstallation.standardError || isolatedSkillInstallation.standardOutput,
    );
    const isolatedInstallationResponse = JSON.parse(isolatedSkillInstallation.standardOutput) as {
      readonly status: string;
      readonly result: { readonly destination: string };
    };
    assert.equal(isolatedInstallationResponse.status, "ok");
    const isolatedSkillRoot = join(yarnPnpRoot, isolatedInstallationResponse.result.destination);
    const isolatedBinding = JSON.parse(await readFile(join(isolatedSkillRoot, "installation.json"), "utf8")) as {
      readonly cli: { readonly path: string };
    };
    assert.equal(isolatedBinding.cli.path, ".sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js");
    const isolatedWrapper = join(isolatedSkillRoot, "scripts/check-cli-compatibility");
    const isolatedFirstInit = await runCommand(
      process.execPath,
      [isolatedWrapper, "--", "init", "--root", yarnPnpRoot, "--adoption", "incremental"],
      yarnPnpRoot,
    );
    assert.equal(isolatedFirstInit.exitCode, 0, isolatedFirstInit.standardError || isolatedFirstInit.standardOutput);
    const isolatedFirstValidate = await runCommand(
      process.execPath,
      [isolatedWrapper, "--", "validate", "--cwd", yarnPnpRoot],
      yarnPnpRoot,
    );
    assert.equal(
      isolatedFirstValidate.exitCode,
      0,
      isolatedFirstValidate.standardError || isolatedFirstValidate.standardOutput,
    );
    const isolatedValidateResponse = JSON.parse(isolatedFirstValidate.standardOutput) as {
      readonly project_id: string;
      readonly status: string;
      readonly result: { readonly valid: boolean; readonly adoption: { readonly mode: string } };
    };
    assert.equal(isolatedValidateResponse.status, "ok");
    assert.equal(isolatedValidateResponse.result.valid, true);
    assert.equal(isolatedValidateResponse.result.adoption.mode, "incremental");
    assert.match(isolatedValidateResponse.project_id, /^SDD-[0-9A-F]{8}$/u);

    if (process.platform === "darwin") {
      const offlineUserHome = join(temporaryRoot, "offline-user-home");
      await mkdir(join(offlineUserHome, "Library", "Application Support"), { recursive: true });
      const offlineUserEnvironment = { ...process.env, HOME: offlineUserHome };
      const offlineStatusBeforeUser = await runCommand(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        yarnPnpRoot,
      );
      const offlineUserInstall = await runCommand(
        process.execPath,
        [isolatedBinTarget, "skill", "install", "--scope", "user", "--format", "json"],
        yarnPnpRoot,
        offlineUserEnvironment,
      );
      assert.equal(
        offlineUserInstall.exitCode,
        0,
        offlineUserInstall.standardError || offlineUserInstall.standardOutput,
      );
      const offlineUserInstallResponse = JSON.parse(offlineUserInstall.standardOutput) as {
        readonly result: { readonly skill_destination: string; readonly cli_destination: string };
      };
      const offlineUserWrapper = join(
        offlineUserInstallResponse.result.skill_destination,
        "scripts/check-cli-compatibility",
      );
      const offlineUserFirstUse = await runCommand(
        process.execPath,
        [offlineUserWrapper, "--", "validate", "--cwd", yarnPnpRoot],
        yarnPnpRoot,
        offlineUserEnvironment,
      );
      assert.equal(
        offlineUserFirstUse.exitCode,
        0,
        offlineUserFirstUse.standardError || offlineUserFirstUse.standardOutput,
      );
      assert.equal(JSON.parse(offlineUserFirstUse.standardOutput).project_id, isolatedValidateResponse.project_id);
      const offlineUserUpdate = await runCommand(
        process.execPath,
        [isolatedBinTarget, "skill", "update", "--scope", "user", "--format", "json"],
        yarnPnpRoot,
        offlineUserEnvironment,
      );
      assert.equal(offlineUserUpdate.exitCode, 0, offlineUserUpdate.standardError || offlineUserUpdate.standardOutput);
      assert.equal(JSON.parse(offlineUserUpdate.standardOutput).result.outcome, "unchanged");
      const offlineUserRemove = await runCommand(
        process.execPath,
        [isolatedBinTarget, "skill", "remove", "--scope", "user", "--format", "json"],
        yarnPnpRoot,
        offlineUserEnvironment,
      );
      assert.equal(offlineUserRemove.exitCode, 0, offlineUserRemove.standardError || offlineUserRemove.standardOutput);
      assert.equal(await pathExists(offlineUserInstallResponse.result.skill_destination), false);
      assert.equal(await pathExists(offlineUserInstallResponse.result.cli_destination), false);
      assert.deepEqual(
        await runCommand("git", ["status", "--porcelain=v1", "--untracked-files=all"], yarnPnpRoot),
        offlineStatusBeforeUser,
      );
    }
    assert.equal(await readFile(join(yarnPnpRoot, "yarn.lock"), "utf8"), "# retained Yarn Plug'n'Play baseline\n");
    assert.equal(await readFile(join(yarnPnpRoot, ".pnp.cjs"), "utf8"), "module.exports = {};\n");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
