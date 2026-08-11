import assert from "node:assert/strict";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

async function execute(argv: readonly string[]) {
  const standardOutput: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: process.cwd(),
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: () => {},
    writeOutputFile: () => {
      throw new Error("Unexpected output-file write.");
    },
  });
  return { exitCode, value: JSON.parse(standardOutput.join("")) as any };
}

test("REQ-A3C3B779 candidate snapshot command and options are no longer supported", async () => {
  const command = await execute([
    "candidate",
    "snapshot",
    "--base",
    "main",
    "--candidate-ref",
    "HEAD",
    "--manifest",
    ".sdd/staging/candidate.json",
    "--format",
    "json",
  ]);
  assert.equal(command.exitCode, 3);
  assert.equal(command.value.diagnostics[0].code, "SDD_CONFIG_CLI_COMMAND_INVALID");

  const option = await execute(["proposal", "materialize", "--candidate-ref", "HEAD", "--format", "json"]);
  assert.equal(option.exitCode, 3);
  assert.equal(option.value.diagnostics[0].code, "SDD_CONFIG_CLI_ARGUMENT_INVALID");
});

test("REQ-E80F09C6 proposal validation accepts only one exact retained bundle", async () => {
  for (const argv of [
    [
      "proposal",
      "validate",
      "--mode",
      "spec-code",
      "--base",
      "main",
      "--candidate",
      ".sdd/staging/candidate",
      "--format",
      "json",
    ],
    ["proposal", "validate", "--package", ".sdd/staging/proposal-package.json", "--format", "json"],
    [
      "proposal",
      "validate",
      "--bundle",
      ".sdd/staging/bundle",
      "--package",
      ".sdd/staging/proposal-package.json",
      "--format",
      "json",
    ],
  ]) {
    const result = await execute(argv);
    assert.equal(result.exitCode, 3, JSON.stringify(result.value));
    assert.equal(result.value.diagnostics[0].code, "SDD_PROPOSAL_INPUTS_REQUIRED");
  }
});
