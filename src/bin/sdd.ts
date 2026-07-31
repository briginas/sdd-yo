#!/usr/bin/env node

import { runCli } from "../cli/run-cli.js";
import { nodeFileSystem } from "../platform/node-filesystem.js";
import { writeFileSync } from "node:fs";

process.exitCode = await runCli({
  argv: process.argv.slice(2),
  workingDirectory: process.cwd(),
  fileSystem: nodeFileSystem,
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
