import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { parseProposalPackage } from "../src/proposal/package-input.ts";
import type { ProposalPackage } from "../src/proposal/validate-proposal.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { createNodeProjectWriter, nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import type { ProjectWriter } from "../src/platform/project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

const executeFile = promisify(execFile);

async function execute(argv: readonly string[], cwd: string, projectWriter: ProjectWriter = nodeProjectWriter) {
  const standardOutput: string[] = [];
  const standardError: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    projectWriter,
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

async function repository(): Promise<{ readonly root: string; readonly base: string; readonly candidate: string }> {
  const root = await mkdtemp(join(tmpdir(), "sdd-proposal-materialize-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  const initialized = await execute(["init", "--format", "json"], root);
  assert.equal(initialized.exitCode, 0, initialized.standardOutput);
  const index = `---\nsdd:\n  type: index\n---\n# Proposal materialization\n\n## Capabilities <!-- sdd:capabilities -->\n\n- [CAP-A1000001 — Delivery](capabilities/delivery.md)\n\n## Domain concepts <!-- sdd:concepts -->\n`;
  const capability = `---\nsdd:\n  type: capability\n  id: CAP-A1000001\n---\n\n# Delivery\n\n## Purpose <!-- sdd:purpose -->\n\nDeliver one item.\n\n<a id="req-a1000001"></a>\n\n## REQ-A1000001 — Deliver item\n\n\`\`\`sdd\nkind: behavior\nverification: automated\n\`\`\`\n\n### Relations <!-- sdd:relations -->\n\n### Statement <!-- sdd:statement -->\n\nThe system shall deliver one item.\n\n### Acceptance criteria <!-- sdd:acceptance -->\n\n- Delivery is observable.\n`;
  await writeFile(join(root, "spec/README.md"), index);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capability);
  await writeFile(join(root, ".gitignore"), ".sdd-stage/\n");
  await mkdir(join(root, ".sdd-stage"));
  await executeFile("git", ["add", ".sdd/config.yaml", "spec", ".gitignore"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  const candidate = await mkdtemp(join(tmpdir(), "sdd-proposal-materialize-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  const capabilityPath = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(
    capabilityPath,
    (await readFile(capabilityPath, "utf8")).replace("deliver one item", "deliver each item exactly once"),
  );
  return { root, base, candidate };
}

test("REQ-20D8EC8C proposal materialize atomically retains a complete spec-code candidate and exact package", async () => {
  const { root, base, candidate } = await repository();
  const activeBefore = await readFile(join(root, "spec/capabilities/delivery.md"), "utf8");
  const statusBefore = (await executeFile("git", ["status", "--porcelain=v1"], { cwd: root })).stdout;
  const result = await execute(
    [
      "proposal",
      "materialize",
      "--mode",
      "spec-code",
      "--base",
      base,
      "--candidate",
      candidate,
      "--bundle",
      ".sdd-stage/first",
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(result.exitCode, 0, result.standardOutput);
  const response = JSON.parse(result.standardOutput) as {
    readonly status: string;
    readonly result: {
      readonly bundle_path: string;
      readonly candidate_path: string;
      readonly package_path: string;
      readonly proposal: ProposalPackage;
    };
  };
  assert.equal(response.status, "ok");
  assert.deepEqual(
    {
      bundle_path: response.result.bundle_path,
      candidate_path: response.result.candidate_path,
      package_path: response.result.package_path,
    },
    {
      bundle_path: ".sdd-stage/first",
      candidate_path: ".sdd-stage/first/candidate-tree.json",
      package_path: ".sdd-stage/first/proposal-package.json",
    },
  );
  assert.deepEqual((await readdir(join(root, ".sdd-stage/first"))).toSorted(), [
    "candidate-tree.json",
    "proposal-package.json",
  ]);
  const sourceManifest = JSON.parse(await readFile(join(root, response.result.candidate_path), "utf8")) as {
    readonly artifact_type: string;
    readonly base_tree_fingerprint: string;
    readonly files: readonly { readonly path: string; readonly content_utf8: string }[];
  };
  const retainedPackage = parseProposalPackage(
    JSON.parse(await readFile(join(root, response.result.package_path), "utf8")),
  );
  assert.equal(sourceManifest.artifact_type, "candidate_tree_manifest");
  assert.equal(sourceManifest.files.length, 2);
  assert.deepEqual(
    sourceManifest.files.map(({ path }) => path),
    ["spec/README.md", "spec/capabilities/delivery.md"],
  );
  assert.match(sourceManifest.files[1]!.content_utf8, /each item exactly once/u);
  assert.deepEqual(retainedPackage, response.result.proposal);
  assert.equal(retainedPackage.mode, "spec-code");
  assert.equal(retainedPackage.base.git_ref, base);
  assert.equal(retainedPackage.candidate.source, "manifest");
  assert.equal(retainedPackage.candidate.tree_fingerprint, response.result.proposal.candidate.tree_fingerprint);
  assert.equal(await readFile(join(root, "spec/capabilities/delivery.md"), "utf8"), activeBefore);
  assert.equal((await executeFile("git", ["status", "--porcelain=v1"], { cwd: root })).stdout, statusBefore);
});

test("REQ-20D8EC8C identical candidate inputs retain byte-for-byte reproducible bundle members", async () => {
  const { root, base, candidate } = await repository();
  for (const bundle of [".sdd-stage/one", ".sdd-stage/two"]) {
    const result = await execute(
      [
        "proposal",
        "materialize",
        "--mode",
        "spec",
        "--base",
        base,
        "--candidate",
        candidate,
        "--bundle",
        bundle,
        "--format",
        "json",
      ],
      root,
    );
    assert.equal(result.exitCode, 0, result.standardOutput);
  }
  for (const file of ["candidate-tree.json", "proposal-package.json"]) {
    assert.equal(
      await readFile(join(root, ".sdd-stage/one", file), "utf8"),
      await readFile(join(root, ".sdd-stage/two", file), "utf8"),
    );
  }
});

test("REQ-20D8EC8C collision leaves the prior bundle and active specification untouched", async () => {
  const { root, base, candidate } = await repository();
  await mkdir(join(root, ".sdd-stage/existing"));
  await writeFile(join(root, ".sdd-stage/existing/sentinel"), "preserve\n");
  const activeBefore = await readFile(join(root, "spec/capabilities/delivery.md"), "utf8");
  const result = await execute(
    [
      "proposal",
      "materialize",
      "--mode",
      "spec-code",
      "--base",
      base,
      "--candidate",
      candidate,
      "--bundle",
      ".sdd-stage/existing",
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(result.exitCode, 3, result.standardOutput);
  const response = JSON.parse(result.standardOutput) as { readonly diagnostics: readonly { readonly code: string }[] };
  assert.equal(response.diagnostics[0]?.code, "SDD_PROPOSAL_BUNDLE_TARGET_EXISTS");
  assert.equal(await readFile(join(root, ".sdd-stage/existing/sentinel"), "utf8"), "preserve\n");
  assert.deepEqual((await readdir(join(root, ".sdd-stage/existing"))).toSorted(), ["sentinel"]);
  assert.equal(await readFile(join(root, "spec/capabilities/delivery.md"), "utf8"), activeBefore);
});

test("REQ-20D8EC8C an interrupted bundle write leaves no partial output", async () => {
  const { root, base, candidate } = await repository();
  const writer = createNodeProjectWriter({
    phaseHook: async (phase, index) => {
      if (phase === "after-staging" && index === 0) throw new Error("interrupted");
    },
  });
  const result = await execute(
    [
      "proposal",
      "materialize",
      "--mode",
      "spec-code",
      "--base",
      base,
      "--candidate",
      candidate,
      "--bundle",
      ".sdd-stage/interrupted",
      "--format",
      "json",
    ],
    root,
    writer,
  );
  assert.equal(result.exitCode, 3, result.standardOutput);
  await assert.rejects(readdir(join(root, ".sdd-stage/interrupted")), /ENOENT/u);
  assert.deepEqual(
    (await readdir(join(root, ".sdd-stage"))).filter((entry) => entry.includes(".sdd-stage-")).toSorted(),
    [],
  );
});

test("REQ-20D8EC8C unsafe and unignored bundle paths are rejected before publication", async () => {
  const { root, base, candidate } = await repository();
  await mkdir(join(root, "not-ignored"));
  const external = await mkdtemp(join(tmpdir(), "sdd-proposal-materialize-external-"));
  await symlink(external, join(root, ".sdd-stage/link"));
  for (const [bundle, code] of [
    ["spec/bundle", "SDD_PROPOSAL_BUNDLE_TARGET_IN_SPEC"],
    ["not-ignored/bundle", "SDD_PROPOSAL_BUNDLE_TARGET_NOT_IGNORED"],
    [".sdd-stage/link/bundle", "SDD_CONFIG_CLI_OUTPUT_UNSAFE"],
  ] as const) {
    const result = await execute(
      [
        "proposal",
        "materialize",
        "--mode",
        "spec-code",
        "--base",
        base,
        "--candidate",
        candidate,
        "--bundle",
        bundle,
        "--format",
        "json",
      ],
      root,
    );
    assert.equal(result.exitCode, 3, result.standardOutput);
    const response = JSON.parse(result.standardOutput) as {
      readonly diagnostics: readonly { readonly code: string }[];
    };
    assert.equal(response.diagnostics[0]?.code, code);
  }
  assert.deepEqual(await readdir(external), []);
});

test("REQ-20D8EC8C malformed candidates and unresolved bases leave no bundle", async () => {
  const { root, candidate } = await repository();
  await writeFile(join(candidate, "spec/capabilities/delivery.md"), "not a specification document\n");
  for (const [base, bundle, expectedStatus] of [
    ["main", ".sdd-stage/malformed", "error"],
    ["refs/heads/missing", ".sdd-stage/unresolved", "error"],
  ] as const) {
    const result = await execute(
      [
        "proposal",
        "materialize",
        "--mode",
        "spec-code",
        "--base",
        base,
        "--candidate",
        candidate,
        "--bundle",
        bundle,
        "--format",
        "json",
      ],
      root,
    );
    assert.notEqual(result.exitCode, 0, result.standardOutput);
    const response = JSON.parse(result.standardOutput) as { readonly status: string };
    assert.equal(response.status, expectedStatus);
    await assert.rejects(readdir(join(root, bundle)), /ENOENT/u);
  }
});

test("REQ-20D8EC8C materialization rejects code mode before publishing a bundle", async () => {
  const { root, base, candidate } = await repository();
  const result = await execute(
    [
      "proposal",
      "materialize",
      "--mode",
      "code",
      "--base",
      base,
      "--candidate",
      candidate,
      "--bundle",
      ".sdd-stage/code",
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(result.exitCode, 3, result.standardOutput);
  const response = JSON.parse(result.standardOutput) as { readonly diagnostics: readonly { readonly code: string }[] };
  assert.equal(response.diagnostics[0]?.code, "SDD_PROPOSAL_MATERIALIZE_MODE_INVALID");
  await assert.rejects(readdir(join(root, ".sdd-stage/code")), /ENOENT/u);
});
