import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import type { Fingerprint, ProjectPath } from "../src/contracts/identifiers.ts";
import { fingerprintSpecificationTree } from "../src/proposal/specification-tree.ts";
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
      throw new Error("Unexpected output write.");
    },
  });
  return { exitCode, standardOutput: standardOutput.join(""), standardError: standardError.join("") };
}

async function repository(): Promise<{ root: string; base: string; projectId: string }> {
  const root = await mkdtemp(join(tmpdir(), "sdd-proposal-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  const initialized = await execute(["init", "--format", "json"], root);
  const projectId = (JSON.parse(initialized.standardOutput) as { project_id: string }).project_id;
  const index = `---\nsdd:\n  type: index\n---\n# Proposal test\n\n## Capabilities <!-- sdd:capabilities -->\n\n- [CAP-A1000001 — Delivery](capabilities/delivery.md)\n\n## Domain concepts <!-- sdd:concepts -->\n`;
  const capability = `---\nsdd:\n  type: capability\n  id: CAP-A1000001\n---\n\n# Delivery\n\n## Purpose <!-- sdd:purpose -->\n\nDeliver one item.\n\n<a id="req-a1000001"></a>\n\n## REQ-A1000001 — Deliver item\n\n\`\`\`sdd\nkind: behavior\nverification: automated\n\`\`\`\n\n### Relations <!-- sdd:relations -->\n\n### Statement <!-- sdd:statement -->\n\nThe system shall deliver one item.\n\n### Acceptance criteria <!-- sdd:acceptance -->\n\n- Delivery is observable.\n`;
  await writeFile(join(root, "spec/README.md"), index);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capability);
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  return { root, base, projectId };
}

test("REQ-8DE9E078 specification-tree fingerprint hashes sorted project paths and exact UTF-8 bytes", () => {
  const files = [
    { path: "spec/z.md" as ProjectPath, sha256: `sha256:${"2".repeat(64)}` as Fingerprint, content_utf8: "ignored" },
    {
      path: "spec/a.md" as ProjectPath,
      sha256: `sha256:${"1".repeat(64)}` as Fingerprint,
      content_utf8: "ignored too",
    },
  ];
  const canonical = JSON.stringify({
    canonicalization_version: "1",
    files: [
      { path: "spec/a.md", sha256: `sha256:${"1".repeat(64)}` },
      { path: "spec/z.md", sha256: `sha256:${"2".repeat(64)}` },
    ],
  });
  assert.equal(fingerprintSpecificationTree(files), `sha256:${createHash("sha256").update(canonical).digest("hex")}`);
});

test("REQ-E26A859E REQ-8DE9E078 proposal validate deterministically emits directory and manifest packages without writes", async () => {
  const { root, base, projectId } = await repository();
  const candidate = await mkdtemp(join(tmpdir(), "sdd-proposal-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  const capabilityPath = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(
    capabilityPath,
    (await readFile(capabilityPath, "utf8")).replace("deliver one item.", "deliver each item exactly once."),
  );
  const before = await executeFile("git", ["status", "--porcelain=v1"], { cwd: root });
  const argv = [
    "proposal",
    "validate",
    "--mode",
    "spec-code",
    "--base",
    base,
    "--candidate",
    candidate,
    "--format",
    "json",
  ];
  const first = await execute(argv, root);
  const second = await execute(argv, root);
  assert.equal(first.exitCode, 0, first.standardOutput);
  assert.equal(first.standardOutput, second.standardOutput);
  const envelope = JSON.parse(first.standardOutput) as { status: string; result: Record<string, any> };
  assert.equal(envelope.status, "ok");
  assert.equal(envelope.result.artifact_type, "proposal_package");
  assert.equal(envelope.result.mode, "spec-code");
  assert.equal(envelope.result.base.git_ref, base);
  assert.equal(envelope.result.candidate.source, "directory");
  assert.equal(envelope.result.semantic_candidates.length, 0);
  assert.deepEqual(envelope.result.object_delta.modified, ["REQ-A1000001"]);
  assert.deepEqual(envelope.result.affected_scope.requirements, ["REQ-A1000001"]);
  assert.deepEqual(envelope.result.code_targets, []);
  assert.equal((await executeFile("git", ["status", "--porcelain=v1"], { cwd: root })).stdout, before.stdout);

  const files = await Promise.all(
    ["spec/README.md", "spec/capabilities/delivery.md"].map(async (path) => {
      const content_utf8 = await readFile(join(candidate, path), "utf8");
      return { path, sha256: `sha256:${createHash("sha256").update(content_utf8).digest("hex")}`, content_utf8 };
    }),
  );
  const manifestPath = join(candidate, "manifest.json");
  await writeFile(
    manifestPath,
    JSON.stringify({
      schema_version: "1.0",
      artifact_type: "candidate_tree_manifest",
      project_id: projectId,
      base_tree_fingerprint: envelope.result.base.tree_fingerprint,
      files,
    }),
  );
  const manifest = await execute(
    ["proposal", "validate", "--mode", "spec-code", "--base", base, "--candidate", manifestPath, "--format", "json"],
    root,
  );
  assert.equal(manifest.exitCode, 0, manifest.standardOutput);
  const manifestPackage = (JSON.parse(manifest.standardOutput) as { result: Record<string, any> }).result;
  assert.deepEqual(manifestPackage, {
    ...envelope.result,
    candidate: { ...envelope.result.candidate, source: "manifest" },
  });
});

test("REQ-E26A859E REQ-8DE9E078 proposal mechanical mode rules block invalid deltas and bind code targets", async () => {
  const { root, base } = await repository();
  const unsupportedMode = await execute(
    ["proposal", "validate", "--mode", "feature", "--base", base, "--candidate", root, "--format", "json"],
    root,
  );
  assert.equal(unsupportedMode.exitCode, 3);
  assert.equal((JSON.parse(unsupportedMode.standardOutput) as any).diagnostics[0].code, "SDD_PROPOSAL_MODE_INVALID");
  const emptySpec = await execute(
    ["proposal", "validate", "--mode", "spec", "--base", base, "--candidate", root, "--format", "json"],
    root,
  );
  assert.equal(emptySpec.exitCode, 1);
  assert.equal(
    (JSON.parse(emptySpec.standardOutput) as any).diagnostics[0].code,
    "SDD_PROPOSAL_SEMANTIC_DELTA_REQUIRED",
  );
  const missingTarget = await execute(
    ["proposal", "validate", "--mode", "code", "--base", base, "--candidate", root, "--format", "json"],
    root,
  );
  assert.equal(missingTarget.exitCode, 1);
  assert.equal(
    (JSON.parse(missingTarget.standardOutput) as any).diagnostics[0].code,
    "SDD_PROPOSAL_CODE_TARGET_REQUIRED",
  );
  const validCode = await execute(
    [
      "proposal",
      "validate",
      "--mode",
      "code",
      "--base",
      base,
      "--candidate",
      root,
      "--code-target",
      "REQ-A1000001",
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(validCode.exitCode, 0, validCode.standardOutput);
  const target = (JSON.parse(validCode.standardOutput) as any).result.code_targets[0];
  assert.equal(target.requirement_id, "REQ-A1000001");
  assert.match(target.semantic_fingerprint, /^sha256:[0-9a-f]{64}$/u);
  assert.match(target.structural_fingerprint, /^sha256:[0-9a-f]{64}$/u);
});

test("REQ-8DE9E078 proposal candidate boundaries block invalid manifests and symlinks while unavailable input is technical", async () => {
  const { root, base, projectId } = await repository();
  const code = await execute(
    [
      "proposal",
      "validate",
      "--mode",
      "code",
      "--base",
      base,
      "--candidate",
      root,
      "--code-target",
      "REQ-A1000001",
      "--format",
      "json",
    ],
    root,
  );
  const baseFingerprint = (JSON.parse(code.standardOutput) as any).result.base.tree_fingerprint;
  const manifestPath = join(root, "invalid-manifest.json");
  await writeFile(
    manifestPath,
    JSON.stringify({
      schema_version: "1.0",
      artifact_type: "candidate_tree_manifest",
      project_id: projectId,
      base_tree_fingerprint: baseFingerprint,
      files: [{ path: "spec/README.md", sha256: `sha256:${"0".repeat(64)}`, content_utf8: "wrong" }],
    }),
  );
  const invalid = await execute(
    ["proposal", "validate", "--mode", "spec-code", "--base", base, "--candidate", manifestPath, "--format", "json"],
    root,
  );
  assert.equal(invalid.exitCode, 1);
  assert.equal((JSON.parse(invalid.standardOutput) as any).diagnostics[0].code, "SDD_PROPOSAL_CANDIDATE_HASH_MISMATCH");

  const candidate = await mkdtemp(join(tmpdir(), "sdd-proposal-symlink-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  await symlink(join(root, "README.md"), join(candidate, "spec/escape.md"));
  const unsafe = await execute(
    [
      "proposal",
      "validate",
      "--mode",
      "code",
      "--base",
      base,
      "--candidate",
      candidate,
      "--code-target",
      "REQ-A1000001",
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(unsafe.exitCode, 1);
  assert.equal((JSON.parse(unsafe.standardOutput) as any).diagnostics[0].code, "SDD_PROPOSAL_CANDIDATE_ENTRY_UNSAFE");

  const rootLinkCandidate = await mkdtemp(join(tmpdir(), "sdd-proposal-root-link-"));
  await cp(join(root, ".sdd"), join(rootLinkCandidate, ".sdd"), { recursive: true });
  await symlink(join(root, "spec"), join(rootLinkCandidate, "spec"));
  const unsafeRoot = await execute(
    [
      "proposal",
      "validate",
      "--mode",
      "code",
      "--base",
      base,
      "--candidate",
      rootLinkCandidate,
      "--code-target",
      "REQ-A1000001",
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(unsafeRoot.exitCode, 1);
  assert.equal(
    (JSON.parse(unsafeRoot.standardOutput) as any).diagnostics[0].code,
    "SDD_PROPOSAL_CANDIDATE_ENTRY_UNSAFE",
  );

  const unavailable = await execute(
    ["proposal", "validate", "--mode", "spec", "--base", base, "--candidate", "missing-candidate", "--format", "json"],
    root,
  );
  assert.equal(unavailable.exitCode, 3);
  assert.equal(
    (JSON.parse(unavailable.standardOutput) as any).diagnostics[0].code,
    "SDD_PROPOSAL_CANDIDATE_UNAVAILABLE",
  );

  const extraTargetRef = await execute(
    [
      "proposal",
      "validate",
      "--mode",
      "code",
      "--base",
      base,
      "--target",
      base,
      "--candidate",
      root,
      "--code-target",
      "REQ-A1000001",
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(extraTargetRef.exitCode, 3);
  assert.equal(
    (JSON.parse(extraTargetRef.standardOutput) as any).diagnostics[0].code,
    "SDD_CONFIG_CLI_ARGUMENT_INVALID",
  );
});
