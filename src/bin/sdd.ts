#!/usr/bin/env node

import { runCli } from "../cli/run-cli.js";
import { nodeFileSystem } from "../platform/node-filesystem.js";
import { nodeProjectWriter } from "../platform/node-project-writer.js";
import { nodeRandomness } from "../platform/node-randomness.js";
import { nodeProcessRunner } from "../platform/node-process-runner.js";
import { nodeSkillInstaller } from "../platform/node-skill-installer.js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(import.meta.url);
const packageRoot = fileURLToPath(new URL("../..", import.meta.url));

process.exitCode = await runCli({
  argv: process.argv.slice(2),
  workingDirectory: process.cwd(),
  fileSystem: nodeFileSystem,
  projectWriter: nodeProjectWriter,
  randomness: nodeRandomness,
  processRunner: nodeProcessRunner,
  skillInstaller: nodeSkillInstaller,
  packageRoot,
  cliPath,
  adapterEnvironment: Object.fromEntries(
    ["PATH", "PATHEXT", "SystemRoot", "SYSTEMROOT"]
      .map((name) => [name, process.env[name]] as const)
      .filter((entry): entry is readonly [string, string] => entry[1] !== undefined),
  ),
  writeStandardOutput: (message: string): void => {
    process.stdout.write(message);
  },
  writeStandardError: (message: string): void => {
    process.stderr.write(message);
  },
  writeOutputFile: (path: string, message: string): void => {
    writeFileSync(path, message, "utf8");
  },
});
