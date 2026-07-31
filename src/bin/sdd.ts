#!/usr/bin/env node

import { runCli } from "../cli/run-cli.js";

process.exitCode = runCli({
  argv: process.argv.slice(2),
  writeStandardError: (message: string): void => {
    process.stderr.write(message);
  },
});
