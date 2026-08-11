import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

const executeFile = promisify(execFile);
const index = `---\nsdd:\n  type: index\n---\n# End-to-end workflow\n\n## Capabilities <!-- sdd:capabilities -->\n\n- [CAP-A1000001 — Delivery](capabilities/delivery.md)\n\n## Domain concepts <!-- sdd:concepts -->\n`;
const capability = `---\nsdd:\n  type: capability\n  id: CAP-A1000001\n---\n\n# Delivery\n\n## Purpose <!-- sdd:purpose -->\n\nDeliver safely.\n\n<a id="req-a1000001"></a>\n\n## REQ-A1000001 — Deliver item\n\n\`\`\`sdd\nkind: behavior\nverification: automated\n\`\`\`\n\n### Relations <!-- sdd:relations -->\n\n### Statement <!-- sdd:statement -->\n\nThe system shall deliver one item.\n\n### Acceptance criteria <!-- sdd:acceptance -->\n\n- Delivery is observable.\n`;

async function cli(root: string, argv: readonly string[]) {
  const output: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: root,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (value) => output.push(value),
    writeStandardError: () => {},
    writeOutputFile: () => {
      throw new Error("Unexpected output write.");
    },
  });
  return { exitCode, value: JSON.parse(output.join("")) as any };
}

async function repository() {
  const root = await mkdtemp(join(tmpdir(), "sdd-workflow-e2e-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await cli(root, ["init", "--format", "json"])).exitCode, 0);
  await writeFile(join(root, "spec/README.md"), index);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capability);
  await writeFile(join(root, ".gitignore"), ".sdd-stage/\n");
  await mkdir(join(root, ".sdd-stage"));
  await writeFile(join(root, ".sdd-stage/reason.txt"), "it's ok\n");
  await executeFile("git", ["add", ".sdd/config.yaml", ".gitignore", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  return { root, base: (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim() };
}

async function approval(root: string, bundle: string, evidence: string) {
  const result = await cli(root, [
    "approval",
    "record",
    "--bundle",
    bundle,
    "--issuer",
    "product-review",
    "--actor",
    "auto-briginas",
    "--decision",
    "approved",
    "--reason",
    ".sdd-stage/reason.txt",
    "--evidence",
    evidence,
    "--format",
    "json",
  ]);
  assert.equal(result.exitCode, 0, JSON.stringify(result.value));
}

test("REQ-20D8EC8C REQ-32C76ED3 REQ-7AFE9904 actual CLI spec-code and spec routes retain, approve, prepare, and explicitly apply", async () => {
  for (const mode of ["spec-code", "spec"] as const) {
    const { root, base } = await repository();
    const candidate = await mkdtemp(join(tmpdir(), `sdd-workflow-${mode}-candidate-`));
    await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
    await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
    const candidateFile = join(candidate, "spec/capabilities/delivery.md");
    await writeFile(candidateFile, (await readFile(candidateFile, "utf8")).replace("one item", `${mode} item`));
    const bundle = `.sdd-stage/${mode}-bundle`;
    const retained = await cli(root, [
      "proposal",
      "materialize",
      "--mode",
      mode,
      "--base",
      base,
      "--candidate",
      candidate,
      "--bundle",
      bundle,
      "--format",
      "json",
    ]);
    assert.equal(retained.exitCode, 0, JSON.stringify(retained.value));
    const displayed = await cli(root, ["proposal", "validate", "--bundle", bundle, "--format", "json"]);
    assert.equal(displayed.exitCode, 0, JSON.stringify(displayed.value));
    assert.deepEqual(displayed.value.result, retained.value.result.proposal);
    const evidence = `.sdd-stage/${mode}-approval.json`;
    await approval(root, bundle, evidence);
    await executeFile("git", ["checkout", "--quiet", "-b", "change"], { cwd: root });
    await cp(join(candidate, "spec"), join(root, "spec"), { recursive: true, force: true });
    await executeFile("git", ["add", "spec"], { cwd: root });
    await executeFile("git", ["commit", "--quiet", "-m", "candidate"], { cwd: root });
    const prepared = await cli(root, [
      "proposal",
      "prepare",
      "--bundle",
      bundle,
      "--branch-head",
      "change",
      "--integration-ref",
      "main",
      "--approval",
      evidence,
      "--format",
      "json",
    ]);
    assert.equal(prepared.exitCode, 0, JSON.stringify(prepared.value));
    const patchPath = `.sdd-stage/${mode}-patch.json`;
    await writeFile(join(root, patchPath), `${JSON.stringify(prepared.value.result.spec_patch)}\n`);
    await executeFile("git", ["checkout", "--quiet", "main"], { cwd: root });
    const before = await readFile(join(root, "spec/capabilities/delivery.md"), "utf8");
    assert.match(before, /one item/u);
    assert.equal((await executeFile("git", ["status", "--porcelain=v1"], { cwd: root })).stdout, "");
    const applied = await cli(root, ["proposal", "apply", "--patch", patchPath, "--format", "json"]);
    assert.equal(applied.exitCode, 0, JSON.stringify(applied.value));
    assert.match(await readFile(join(root, "spec/capabilities/delivery.md"), "utf8"), new RegExp(`${mode} item`, "u"));
  }
});

test("REQ-5FFEC13F REQ-32C76ED3 actual CLI code route has no candidate, patch, or apply ceremony", async () => {
  const { root, base } = await repository();
  const bundle = ".sdd-stage/code-bundle";
  const retained = await cli(root, [
    "proposal",
    "materialize",
    "--mode",
    "code",
    "--base",
    base,
    "--code-target",
    "REQ-A1000001",
    "--bundle",
    bundle,
    "--format",
    "json",
  ]);
  assert.equal(retained.exitCode, 0, JSON.stringify(retained.value));
  assert.equal("candidate_path" in retained.value.result, false);
  assert.deepEqual(await (await import("node:fs/promises")).readdir(join(root, bundle)), ["proposal-package.json"]);
  const displayed = await cli(root, ["proposal", "validate", "--bundle", bundle, "--format", "json"]);
  assert.equal(displayed.exitCode, 0, JSON.stringify(displayed.value));
  await approval(root, bundle, ".sdd-stage/code-approval.json");
  assert.equal((await executeFile("git", ["status", "--porcelain=v1"], { cwd: root })).stdout, "");
  const preparation = await cli(root, [
    "proposal",
    "prepare",
    "--bundle",
    bundle,
    "--branch-head",
    "main",
    "--integration-ref",
    "main",
    "--approval",
    ".sdd-stage/code-approval.json",
    "--format",
    "json",
  ]);
  assert.notEqual(preparation.exitCode, 0, JSON.stringify(preparation.value));
  assert.equal(preparation.value.result, null);
  assert.equal(await readFile(join(root, "spec/capabilities/delivery.md"), "utf8"), capability);
});
