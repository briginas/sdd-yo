import assert from "node:assert/strict";
import test from "node:test";

import { runCli, TECHNICAL_UNAVAILABLE_EXIT_CODE } from "../src/cli/run-cli.ts";

test("bootstrap CLI adapter cannot report product success before commands exist", () => {
  const standardError: string[] = [];

  const exitCode = runCli({
    argv: ["validate", "--format", "json"],
    writeStandardError: (message) => standardError.push(message),
  });

  assert.equal(exitCode, TECHNICAL_UNAVAILABLE_EXIT_CODE);
  assert.deepEqual(standardError, ["sdd: no product commands are implemented in this bootstrap package.\n"]);
});
