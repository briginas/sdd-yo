import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { parseProposalPackage } from "../src/proposal/package-input.ts";
import type { ProposalPackage } from "../src/proposal/validate-proposal.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

const executeFile = promisify(execFile);

async function execute(argv: readonly string[], cwd: string) {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: (message) => standardError.push(message),
    writeOutputFile: () => {
      throw new Error("Unexpected output-file write.");
    },
  });
  return { exitCode, standardOutput: standardOutput.join(""), standardError: standardError.join("") };
}

async function repository(): Promise<{ readonly root: string; readonly base: string }> {
  const root = await mkdtemp(join(tmpdir(), "sdd-proposal-materialize-code-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  const initialized = await execute(["init", "--format", "json"], root);
  assert.equal(initialized.exitCode, 0, initialized.standardOutput);
  const index = `---\nsdd:\n  type: index\n---\n# Code proposal materialization\n\n## Capabilities <!-- sdd:capabilities -->\n\n- [CAP-A1000001 — Delivery](capabilities/delivery.md)\n\n## Domain concepts <!-- sdd:concepts -->\n`;
  const capability = `---\nsdd:\n  type: capability\n  id: CAP-A1000001\n---\n\n# Delivery\n\n## Purpose <!-- sdd:purpose -->\n\nDeliver one item.\n\n<a id="req-a1000001"></a>\n\n## REQ-A1000001 — Deliver item\n\n\`\`\`sdd\nkind: behavior\nverification: automated\n\`\`\`\n\n### Relations <!-- sdd:relations -->\n\n### Statement <!-- sdd:statement -->\n\nThe system shall deliver one item.\n\n### Acceptance criteria <!-- sdd:acceptance -->\n\n- Delivery is observable.\n`;
  await writeFile(join(root, "spec/README.md"), index);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capability);
  await writeFile(join(root, ".gitignore"), ".sdd-stage/\n");
  await mkdir(join(root, ".sdd-stage"));
  await executeFile("git", ["add", ".sdd/config.yaml", "spec", ".gitignore"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  return { root, base: (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim() };
}

function materializeCodeArgs(
  base: string,
  bundle: string,
  targets: readonly string[] = ["REQ-A1000001"],
): readonly string[] {
  return [
    "proposal",
    "materialize",
    "--mode",
    "code",
    "--base",
    base,
    ...targets.flatMap((target) => ["--code-target", target]),
    "--bundle",
    bundle,
    "--format",
    "json",
  ];
}

test("REQ-5FFEC13F code materialization retains only an immutable exact package without candidate or active-spec mutation", async () => {
  const { root, base } = await repository();
  const activeBefore = await readFile(join(root, "spec/capabilities/delivery.md"), "utf8");
  const gitBefore = (await executeFile("git", ["status", "--porcelain=v1"], { cwd: root })).stdout;
  const result = await execute(materializeCodeArgs(base, ".sdd-stage/code"), root);
  assert.equal(result.exitCode, 0, result.standardOutput);
  const response = JSON.parse(result.standardOutput) as {
    readonly status: string;
    readonly result: {
      readonly bundle_path: string;
      readonly package_path: string;
      readonly proposal: ProposalPackage;
    };
  };
  assert.equal(response.status, "ok");
  assert.deepEqual(
    { bundle_path: response.result.bundle_path, package_path: response.result.package_path },
    { bundle_path: ".sdd-stage/code", package_path: ".sdd-stage/code/proposal-package.json" },
  );
  assert.equal("candidate_path" in response.result, false);
  assert.deepEqual(await readdir(join(root, ".sdd-stage/code")), ["proposal-package.json"]);
  const retained = parseProposalPackage(JSON.parse(await readFile(join(root, response.result.package_path), "utf8")));
  assert.deepEqual(retained, response.result.proposal);
  assert.equal(retained.mode, "code");
  assert.equal(retained.base.git_ref, base);
  assert.equal(retained.candidate.source, "base");
  assert.equal(retained.candidate.tree_fingerprint, retained.base.tree_fingerprint);
  assert.deepEqual(retained.object_delta.added, []);
  assert.deepEqual(retained.object_delta.modified, []);
  assert.deepEqual(retained.object_delta.deleted, []);
  assert.deepEqual(
    retained.code_targets.map(({ requirement_id }) => requirement_id),
    ["REQ-A1000001"],
  );
  assert.equal(await readFile(join(root, "spec/capabilities/delivery.md"), "utf8"), activeBefore);
  assert.equal((await executeFile("git", ["status", "--porcelain=v1"], { cwd: root })).stdout, gitBefore);
});

test("REQ-5FFEC13F identical code inputs retain byte-for-byte reproducible packages", async () => {
  const { root, base } = await repository();
  for (const bundle of [".sdd-stage/one", ".sdd-stage/two"]) {
    const result = await execute(materializeCodeArgs(base, bundle), root);
    assert.equal(result.exitCode, 0, result.standardOutput);
  }
  assert.equal(
    await readFile(join(root, ".sdd-stage/one/proposal-package.json"), "utf8"),
    await readFile(join(root, ".sdd-stage/two/proposal-package.json"), "utf8"),
  );
});

test("REQ-5FFEC13F missing, malformed, and inactive targets do not publish a code package", async () => {
  const { root, base } = await repository();
  const attempts = [
    { bundle: ".sdd-stage/missing", argv: materializeCodeArgs(base, ".sdd-stage/missing", []) },
    { bundle: ".sdd-stage/malformed", argv: materializeCodeArgs(base, ".sdd-stage/malformed", ["not-a-requirement"]) },
    { bundle: ".sdd-stage/inactive", argv: materializeCodeArgs(base, ".sdd-stage/inactive", ["REQ-B1000001"]) },
  ];
  for (const attempt of attempts) {
    const result = await execute(attempt.argv, root);
    assert.notEqual(result.exitCode, 0, result.standardOutput);
    await assert.rejects(readdir(join(root, attempt.bundle)), /ENOENT/u);
  }
});

test("REQ-5FFEC13F code rejects an authored candidate and non-code routes still require one", async () => {
  const { root, base } = await repository();
  const authored = await mkdtemp(join(tmpdir(), "sdd-proposal-materialize-unneeded-candidate-"));
  const code = await execute([...materializeCodeArgs(base, ".sdd-stage/authored"), "--candidate", authored], root);
  assert.equal(code.exitCode, 3, code.standardOutput);
  await assert.rejects(readdir(join(root, ".sdd-stage/authored")), /ENOENT/u);
  const spec = await execute(
    ["proposal", "materialize", "--mode", "spec", "--base", base, "--bundle", ".sdd-stage/spec", "--format", "json"],
    root,
  );
  assert.equal(spec.exitCode, 3, spec.standardOutput);
  await assert.rejects(readdir(join(root, ".sdd-stage/spec")), /ENOENT/u);
});
