import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { CLI_HELP_ENTRIES } from "../src/cli/help.ts";
import { loadCliCompatibilityIdentity } from "../src/cli/identity.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

async function execute(argv: readonly string[], workingDirectory: string) {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: (message) => standardError.push(message),
    writeOutputFile: () => {
      throw new Error("Version reporting must not write an output file.");
    },
  });
  return { exitCode, standardOutput: standardOutput.join(""), standardError: standardError.join("") };
}

test("REQ-D9CF3A46 loads the exact CLI version from the corresponding package manifest", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
    name: string;
    version: string;
  };
  const identity = loadCliCompatibilityIdentity();

  assert.equal(identity.package.name, manifest.name);
  assert.equal(identity.package.version, manifest.version);
  assert.equal(identity.cli.version, manifest.version);
});

test("REQ-97D96950 builds the exact version 1 compatibility identity", () => {
  const identity = loadCliCompatibilityIdentity();

  assert.deepEqual(identity, {
    package: { name: "sdd-yo", version: "0.5.0" },
    cli: { name: "sdd", version: "0.5.0" },
    json_schema: { version: "1.0", compatible_major: 1 },
    skill: { name: "sdd-yo", protocol_version: "1.0", compatible_major: 1 },
  });
  assert.deepEqual(Object.keys(identity), ["package", "cli", "json_schema", "skill"]);
  assert.deepEqual(Object.keys(identity.package), ["name", "version"]);
  assert.deepEqual(Object.keys(identity.cli), ["name", "version"]);
  assert.deepEqual(Object.keys(identity.json_schema), ["version", "compatible_major"]);
  assert.deepEqual(Object.keys(identity.skill), ["name", "protocol_version", "compatible_major"]);
});

test("REQ-D9CF3A46 reports the package version without selecting or mutating an SDD Project", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sdd-version-"));
  try {
    const first = await execute(["--version"], directory);
    const second = await execute(["--version"], directory);

    assert.deepEqual(first, { exitCode: 0, standardOutput: "0.5.0\n", standardError: "" });
    assert.deepEqual(second, first);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("REQ-97D96950 reports deterministic machine-readable compatibility identity without a project", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sdd-version-json-"));
  try {
    const first = await execute(["--version", "--format", "json"], directory);
    const second = await execute(["--version", "--format", "json"], directory);

    assert.equal(first.exitCode, 0);
    assert.equal(first.standardError, "");
    assert.equal(first.standardOutput, second.standardOutput);
    assert.deepEqual(JSON.parse(first.standardOutput), {
      schema_version: "1.0",
      command: "version",
      project_id: null,
      status: "ok",
      result: {
        package: { name: "sdd-yo", version: "0.5.0" },
        cli: { name: "sdd", version: "0.5.0" },
        json_schema: { version: "1.0", compatible_major: 1 },
        skill: { name: "sdd-yo", protocol_version: "1.0", compatible_major: 1 },
      },
      diagnostics: [],
    });
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("REQ-FFE60B5A provides deterministic top-level help without selecting or mutating a project", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sdd-help-"));
  try {
    const first = await execute(["--help"], directory);
    const second = await execute(["--help"], directory);

    assert.equal(first.exitCode, 0);
    assert.equal(first.standardError, "");
    assert.equal(first.standardOutput, second.standardOutput);
    assert.match(first.standardOutput, /^sdd - repository-native specification governance\n/u);
    for (const entry of CLI_HELP_ENTRIES) assert.match(first.standardOutput, new RegExp(`  ${entry.path}`, "u"));
    for (const option of ["--config", "--cwd", "--format", "--output", "--quiet", "--help", "--version"])
      assert.ok(first.standardOutput.includes(option), `missing global option ${option}`);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("REQ-FFE60B5A provides command-specific help for every supported simple and compound path", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sdd-command-help-"));
  try {
    for (const entry of CLI_HELP_ENTRIES) {
      const argv = [...entry.path.split(" "), "--help"];
      const result = await execute(argv, directory);
      assert.equal(result.exitCode, 0, entry.path);
      assert.equal(result.standardError, "", entry.path);
      assert.match(
        result.standardOutput,
        new RegExp(`^Usage: ${entry.usage.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\n`, "u"),
      );
      assert.ok(result.standardOutput.includes(entry.summary));
    }
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
