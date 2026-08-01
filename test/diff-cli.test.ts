import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";
import type { ProcessRunner } from "../src/platform/process-runner.ts";

const executeFile = promisify(execFile);

async function execute(argv: readonly string[], cwd: string, processRunner: ProcessRunner = nodeProcessRunner) {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: (message) => standardError.push(message),
    writeOutputFile: () => {
      throw new Error("Unexpected output file write.");
    },
  });
  return { exitCode, standardOutput: standardOutput.join(""), standardError: standardError.join("") };
}

const indexSource = `---
sdd:
  type: index
---
# Delta project

## Capabilities <!-- sdd:capabilities -->

- [CAP-C1000001 — Delivery](capabilities/delivery.md)

## Domain concepts <!-- sdd:concepts -->
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-C1000001
---

# Delivery

## Purpose <!-- sdd:purpose -->

Deliver one governed behavior.

<a id="req-c1000001"></a>

## REQ-C1000001 — Deliver once

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

### Statement <!-- sdd:statement -->

The system shall deliver the item once.

### Acceptance criteria <!-- sdd:acceptance -->

- A delivered item is recorded.
`;

async function createComparisonRepository(): Promise<{ root: string; base: string; target: string }> {
  const root = await mkdtemp(join(tmpdir(), "sdd-cli-diff-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "empty graph"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();

  await mkdir(join(root, "spec/capabilities"), { recursive: true });
  await writeFile(join(root, "spec/README.md"), indexSource);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capabilitySource);
  await executeFile("git", ["add", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "add delivery"], { cwd: root });
  const target = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  return { root, base, target };
}

test("REQ-24A372E7 diff reports deterministic Git-ref semantic and structural classes", async () => {
  const { root, base, target } = await createComparisonRepository();
  const first = await execute(["diff", "--base", base, "--target", target, "--format", "json"], root);
  const second = await execute(["diff", "--base", base, "--target", target, "--format", "json"], root);
  assert.equal(first.exitCode, 0, first.standardOutput);
  assert.equal(first.standardOutput, second.standardOutput);
  const value = JSON.parse(first.standardOutput) as {
    status: string;
    result: {
      base_ref: string;
      target_ref: string;
      available_classes: readonly string[];
      unavailable_classes: readonly string[];
      deltas: {
        semantic: {
          entries: readonly { type: string; id: string }[];
          canonical_json_utf8: string;
          fingerprint: string;
        };
        structural: {
          entries: readonly { type: string; id: string }[];
          canonical_json_utf8: string;
          fingerprint: string;
        };
      };
    };
  };
  assert.equal(value.status, "ok");
  assert.equal(value.result.base_ref, base);
  assert.equal(value.result.target_ref, target);
  assert.deepEqual(value.result.available_classes, ["semantic", "structural"]);
  assert.deepEqual(value.result.unavailable_classes, ["verification"]);
  assert.deepEqual(
    value.result.deltas.semantic.entries.map((entry) => entry.id),
    ["REQ-C1000001"],
  );
  assert.deepEqual(
    value.result.deltas.structural.entries.map((entry) => entry.id),
    ["CAP-C1000001", "REQ-C1000001"],
  );
  assert.equal(value.result.deltas.semantic.canonical_json_utf8, JSON.stringify(value.result.deltas.semantic.entries));
  assert.match(value.result.deltas.semantic.fingerprint, /^sha256:[0-9a-f]{64}$/u);
  assert.equal("approval" in value.result, false);
  assert.equal("gate" in value.result, false);
  assert.equal("review" in value.result, false);

  const human = await execute(["diff", "--base", base, "--target", target], root);
  assert.equal(human.exitCode, 0);
  assert.match(human.standardOutput, new RegExp(`^diff: ok\\nproject: SDD-[0-9A-F]{8}\\nbase: ${base}`, "u"));
});

test("REQ-24A372E7 validate --changed-from compares a ref to worktree and keeps empty available classes", async () => {
  const { root, base, target } = await createComparisonRepository();
  const changed = await execute(["validate", "--changed-from", base, "--format", "json"], root);
  assert.equal(changed.exitCode, 0, changed.standardOutput);
  const changedValue = JSON.parse(changed.standardOutput) as {
    result: {
      comparison: {
        changed_from_ref: string;
        available_classes: readonly string[];
        unavailable_classes: readonly string[];
        deltas: { semantic: { entries: readonly unknown[] }; structural: { entries: readonly unknown[] } };
      };
    };
  };
  assert.equal(changedValue.result.comparison.changed_from_ref, base);
  assert.ok(changedValue.result.comparison.deltas.semantic.entries.length > 0);
  assert.ok(changedValue.result.comparison.deltas.structural.entries.length > 0);

  await writeFile(
    join(root, "spec/capabilities/delivery.md"),
    `${capabilitySource}\n### Rationale <!-- sdd:rationale -->\n\nThis explanation does not change behavior.\n`,
  );
  const gitEvents: string[] = [];
  const countingRunner: ProcessRunner = {
    run: async (request) => {
      if (request.executable === "git" && request.arguments[0] === "rev-parse" && request.arguments[1] === "--verify")
        gitEvents.push(`resolve:${request.arguments.at(-1)}`);
      if (request.executable === "git" && request.arguments[0] === "ls-tree") gitEvents.push("snapshot");
      return nodeProcessRunner.run(request);
    },
  };
  const explanatory = await execute(["validate", "--changed-from", "main", "--format", "json"], root, countingRunner);
  assert.equal(explanatory.exitCode, 0, explanatory.standardOutput);
  const explanatoryValue = JSON.parse(explanatory.standardOutput) as {
    result: {
      comparison: {
        unavailable_classes: readonly string[];
        deltas: {
          semantic: { entries: readonly unknown[]; canonical_json_utf8: string };
          structural: { entries: readonly unknown[]; canonical_json_utf8: string };
        };
      };
    };
  };
  assert.deepEqual(explanatoryValue.result.comparison.deltas.semantic.entries, []);
  assert.deepEqual(explanatoryValue.result.comparison.deltas.structural.entries, []);
  assert.equal(explanatoryValue.result.comparison.deltas.semantic.canonical_json_utf8, "[]");
  assert.equal(explanatoryValue.result.comparison.deltas.structural.canonical_json_utf8, "[]");
  assert.deepEqual(explanatoryValue.result.comparison.unavailable_classes, ["verification"]);
  assert.equal(gitEvents.filter((event) => event === "resolve:main^{commit}").length, 1);
  const firstSnapshot = gitEvents.indexOf("snapshot");
  assert.notEqual(firstSnapshot, -1);
  assert.ok(gitEvents.indexOf("resolve:main^{commit}") < firstSnapshot);
  assert.ok(gitEvents.indexOf("resolve:HEAD^{commit}") < firstSnapshot);

  const human = await execute(["validate", "--changed-from", "main"], root);
  assert.equal(human.exitCode, 0, human.standardOutput);
  assert.match(human.standardOutput, new RegExp(`changed from: ${target}`, "u"));
  assert.match(human.standardOutput, /^semantic: sha256:[0-9a-f]{64}$/mu);
  assert.match(human.standardOutput, /^structural: sha256:[0-9a-f]{64}$/mu);
  assert.match(human.standardOutput, /^verification: unavailable$/mu);
});

test("REQ-24A372E7 unresolved diff refs produce a stable technical failure", async () => {
  const { root, target } = await createComparisonRepository();
  const missing = await execute(["diff", "--base", "missing", "--target", target, "--format", "json"], root);
  assert.equal(missing.exitCode, 3);
  assert.equal(
    (JSON.parse(missing.standardOutput) as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code,
    "SDD_GIT_REF_UNRESOLVED",
  );
});
