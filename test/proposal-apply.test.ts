import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, readFile, rename, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test, { describe } from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { resolveProject } from "../src/config/resolve-project.ts";
import type { Fingerprint, ProjectPath } from "../src/contracts/identifiers.ts";
import { applyProposal, ProposalApplyError } from "../src/proposal/apply-proposal.ts";
import { loadCandidateSpecificationTree } from "../src/proposal/specification-tree.ts";
import { generateSpecPatch, parseSpecPatch, SpecPatchInputError } from "../src/proposal/spec-patch.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { createNodeProjectWriter, nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

const executeFile = promisify(execFile);

function hash(content: string): Fingerprint {
  return `sha256:${createHash("sha256").update(content).digest("hex")}` as Fingerprint;
}

async function execute(argv: readonly string[], cwd: string) {
  const standardOutput: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: () => {},
    writeOutputFile: () => {
      throw new Error("Unexpected output write.");
    },
  });
  return { exitCode, standardOutput: standardOutput.join("") };
}

const indexSource = `---
sdd:
  type: index
---
# Apply test

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Delivery](capabilities/delivery.md)

## Domain concepts <!-- sdd:concepts -->
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Delivery

## Purpose <!-- sdd:purpose -->

Deliver safely.

<a id="req-a1000001"></a>

## REQ-A1000001 — Deliver item

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

### Statement <!-- sdd:statement -->

The system shall deliver one item.

### Acceptance criteria <!-- sdd:acceptance -->

- Delivery is observable.
`;

async function repository() {
  const root = await mkdtemp(join(tmpdir(), "sdd-apply-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  await execute(["init", "--format", "json"], root);
  await writeFile(join(root, "spec/README.md"), indexSource);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capabilitySource);
  await writeFile(join(root, "spec/old.txt"), "old\n");
  await writeFile(join(root, "unrelated.txt"), "keep me\n");
  await executeFile("git", ["add", "."], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const selected = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: root });
  assert.equal(selected.ok, true);
  if (!selected.ok) throw new Error("Project selection failed.");
  return { root, project: selected.value };
}

async function patchFixture() {
  const fixture = await repository();
  const current = (
    await loadCandidateSpecificationTree({
      fileSystem: nodeFileSystem,
      candidatePath: fixture.root,
      selected: fixture.project,
      baseFingerprint: `sha256:${"0".repeat(64)}` as Fingerprint,
    })
  ).tree;
  const candidate = await mkdtemp(join(tmpdir(), "sdd-apply-candidate-"));
  await cp(join(fixture.root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(fixture.root, "spec"), join(candidate, "spec"), { recursive: true });
  await writeFile(
    join(candidate, "spec/capabilities/delivery.md"),
    capabilitySource.replace("deliver one item", "deliver each item exactly once"),
  );
  await mkdir(join(candidate, "spec/new"));
  await writeFile(join(candidate, "spec/new/note.txt"), "new\n");
  await unlink(join(candidate, "spec/old.txt"));
  const prepared = (
    await loadCandidateSpecificationTree({
      fileSystem: nodeFileSystem,
      candidatePath: candidate,
      selected: fixture.project,
      baseFingerprint: current.fingerprint,
    })
  ).tree;
  const patch = generateSpecPatch({
    project_id: fixture.project.configuration.project_id,
    integration: current,
    prepared,
  });
  const patchPath = join(fixture.root, "patch.json");
  await writeFile(patchPath, JSON.stringify(patch));
  return { ...fixture, patch, patchPath };
}

async function visibleSpec(root: string): Promise<Readonly<Record<string, string>>> {
  const result: Record<string, string> = {};
  const visit = async (directory: string, prefix: string): Promise<void> => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).toSorted((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(directory, entry.name);
      const projectPath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await visit(path, projectPath);
      else result[projectPath] = await readFile(path, "utf8");
    }
  };
  await visit(join(root, "spec"), "");
  return result;
}

function hasTransactionDebris(snapshot: Readonly<Record<string, string>>): boolean {
  return Object.keys(snapshot).some((path) => /\.sdd-(?:stage|backup)-/u.test(path));
}

test("REQ-3BF12AAD strict SpecPatch input rejects unknown fields, duplicate targets, and after-hash mismatch", () => {
  const base = {
    schema_version: "1.0",
    artifact_type: "spec_patch",
    project_id: "SDD-A1000001",
    base_tree_fingerprint: `sha256:${"1".repeat(64)}`,
    result_tree_fingerprint: `sha256:${"2".repeat(64)}`,
  };
  const invalid = [
    { ...base, operations: [], unknown: true },
    {
      ...base,
      operations: [
        { operation: "delete", path: "spec/a.md", before_sha256: `sha256:${"3".repeat(64)}` },
        { operation: "delete", path: "spec/a.md", before_sha256: `sha256:${"3".repeat(64)}` },
      ],
    },
    {
      ...base,
      operations: [
        {
          operation: "create",
          path: "spec/a.md",
          after_sha256: `sha256:${"4".repeat(64)}`,
          content_utf8: "content",
        },
      ],
    },
  ];
  for (const value of invalid)
    assert.throws(() => parseSpecPatch(new TextEncoder().encode(JSON.stringify(value))), SpecPatchInputError);
});

describe("REQ-7AFE9904 proposal apply atomic and safe proof", () => {
  test("replaces the complete validated file set and preserves unrelated worktree state", async () => {
    const fixture = await patchFixture();
    await writeFile(join(fixture.root, "unrelated.txt"), "user change\n");
    const headBefore = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: fixture.root })).stdout;
    const result = await execute(["proposal", "apply", "--patch", fixture.patchPath, "--format", "json"], fixture.root);
    assert.equal(result.exitCode, 0, result.standardOutput);
    const envelope = JSON.parse(result.standardOutput) as { status: string; result: { applied_paths: string[] } };
    assert.equal(envelope.status, "ok");
    assert.deepEqual(
      envelope.result.applied_paths,
      fixture.patch.operations.map((operation) => operation.path),
    );
    assert.match(await readFile(join(fixture.root, "spec/capabilities/delivery.md"), "utf8"), /exactly once/u);
    assert.equal(await readFile(join(fixture.root, "spec/new/note.txt"), "utf8"), "new\n");
    await assert.rejects(readFile(join(fixture.root, "spec/old.txt")));
    assert.equal(await readFile(join(fixture.root, "unrelated.txt"), "utf8"), "user change\n");
    assert.equal((await executeFile("git", ["rev-parse", "HEAD"], { cwd: fixture.root })).stdout, headBefore);
    const status = (
      await executeFile("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: fixture.root })
    ).stdout;
    assert.doesNotMatch(status, /\.sdd-(?:stage|backup)-/u);
  });

  test("blocks stale bases and unsafe symlink targets before calling the transaction writer", async () => {
    const stale = await patchFixture();
    await writeFile(join(stale.root, "spec/old.txt"), "drift\n");
    const staleResult = await execute(
      ["proposal", "apply", "--patch", stale.patchPath, "--format", "json"],
      stale.root,
    );
    assert.equal(staleResult.exitCode, 1, staleResult.standardOutput);
    assert.equal(await readFile(join(stale.root, "spec/old.txt"), "utf8"), "drift\n");

    const unsafe = await patchFixture();
    await symlink(join(unsafe.root, "unrelated.txt"), join(unsafe.root, "spec/link"));
    const unsafePatch = {
      ...unsafe.patch,
      operations: [
        {
          operation: "create",
          path: "spec/link/escape.md" as ProjectPath,
          after_sha256: hash(""),
          content_utf8: "",
        },
      ],
    };
    await writeFile(unsafe.patchPath, JSON.stringify(unsafePatch));
    const unsafeResult = await execute(
      ["proposal", "apply", "--patch", unsafe.patchPath, "--format", "json"],
      unsafe.root,
    );
    assert.equal(unsafeResult.exitCode, 1, unsafeResult.standardOutput);
    assert.equal(await readFile(join(unsafe.root, "unrelated.txt"), "utf8"), "keep me\n");
  });

  test("rejects traversal, .git, hash mismatch, and portable case-colliding targets", () => {
    const base = {
      schema_version: "1.0",
      artifact_type: "spec_patch",
      project_id: "SDD-A1000001",
      base_tree_fingerprint: hash("base"),
      result_tree_fingerprint: hash("result"),
    };
    const before = hash("before");
    const invalidOperations = [
      [{ operation: "delete", path: "spec/../escape.md", before_sha256: before }],
      [{ operation: "delete", path: "spec/.git/config", before_sha256: before }],
      [{ operation: "create", path: "spec/a.md", after_sha256: hash("other"), content_utf8: "content" }],
      [
        { operation: "delete", path: "spec/A.md", before_sha256: before },
        { operation: "delete", path: "spec/a.md", before_sha256: before },
      ],
      [
        { operation: "delete", path: "spec/STRASSE.md", before_sha256: before },
        { operation: "delete", path: "spec/Straße.md", before_sha256: before },
      ],
    ];
    for (const operations of invalidOperations)
      assert.throws(
        () => parseSpecPatch(new TextEncoder().encode(JSON.stringify({ ...base, operations }))),
        SpecPatchInputError,
      );
  });

  test("blocks a create target that aliases a differently cased existing specification path", async () => {
    const fixture = await patchFixture();
    const current = (
      await loadCandidateSpecificationTree({
        fileSystem: nodeFileSystem,
        candidatePath: fixture.root,
        selected: fixture.project,
        baseFingerprint: fixture.patch.base_tree_fingerprint,
      })
    ).tree;
    await assert.rejects(
      () =>
        applyProposal({
          fileSystem: nodeFileSystem,
          writer: nodeProjectWriter,
          project: fixture.project,
          worktreeRoot: fixture.root,
          patch: {
            schema_version: "1.0",
            artifact_type: "spec_patch",
            project_id: fixture.project.configuration.project_id,
            base_tree_fingerprint: current.fingerprint,
            result_tree_fingerprint: hash("unreachable result"),
            operations: [
              {
                operation: "create",
                path: "spec/OLD.txt" as ProjectPath,
                after_sha256: hash("collision\n"),
                content_utf8: "collision\n",
              },
            ],
          },
        }),
      (error) => error instanceof ProposalApplyError && error.code === "SDD_APPLY_PATH_COLLISION",
    );
    assert.equal(await readFile(join(fixture.root, "spec/old.txt"), "utf8"), "old\n");
  });

  test("writer preflight preserves target drift introduced after core validation", async () => {
    const fixture = await patchFixture();
    const driftPath = join(fixture.root, "spec/old.txt");
    const writer = createNodeProjectWriter({
      phaseHook: async (phase) => {
        if (phase === "before-preflight") await writeFile(driftPath, "concurrent drift\n");
      },
    });
    await assert.rejects(
      () =>
        applyProposal({
          fileSystem: nodeFileSystem,
          writer,
          project: fixture.project,
          worktreeRoot: fixture.root,
          patch: fixture.patch,
        }),
      (error) => error instanceof ProposalApplyError && error.code === "SDD_APPLY_BEFORE_MISMATCH" && !error.technical,
    );
    assert.equal(await readFile(driftPath, "utf8"), "concurrent drift\n");
    assert.equal(await readFile(join(fixture.root, "spec/capabilities/delivery.md"), "utf8"), capabilitySource);
    await assert.rejects(readFile(join(fixture.root, "spec/new/note.txt")));
    assert.equal(hasTransactionDebris(await visibleSpec(fixture.root)), false);
  });

  for (const injected of [
    { name: "staging", phase: "before-staging" as const, operationIndex: 1 },
    { name: "first replacement", phase: "after-replacement" as const, operationIndex: 0 },
    { name: "multiple replacements", phase: "after-replacement" as const, operationIndex: 1 },
  ]) {
    test(`restores the exact original tree after injected ${injected.name} failure`, async () => {
      const fixture = await patchFixture();
      const before = await visibleSpec(fixture.root);
      const writer = createNodeProjectWriter({
        phaseHook: async (phase, operationIndex) => {
          if (phase === injected.phase && operationIndex === injected.operationIndex)
            throw new Error(`Injected ${injected.name} failure.`);
        },
      });
      await assert.rejects(() =>
        applyProposal({
          fileSystem: nodeFileSystem,
          writer,
          project: fixture.project,
          worktreeRoot: fixture.root,
          patch: fixture.patch,
        }),
      );
      const after = await visibleSpec(fixture.root);
      assert.deepEqual(after, before);
      assert.equal(hasTransactionDebris(after), false);
    });
  }

  test("retries a transient rollback rename and still restores the exact original tree", async () => {
    const fixture = await patchFixture();
    const before = await visibleSpec(fixture.root);
    let transientFailures = 0;
    const writer = createNodeProjectWriter({
      phaseHook: async (phase, operationIndex) => {
        if (phase === "after-replacement" && operationIndex === 1) throw new Error("Trigger rollback.");
      },
      rename: async (source, target) => {
        if (source.includes(".sdd-backup-") && transientFailures === 0) {
          transientFailures += 1;
          throw Object.assign(new Error("Transient rollback rename failure."), { code: "EINTR" });
        }
        await rename(source, target);
      },
    });
    await assert.rejects(() =>
      applyProposal({
        fileSystem: nodeFileSystem,
        writer,
        project: fixture.project,
        worktreeRoot: fixture.root,
        patch: fixture.patch,
      }),
    );
    const after = await visibleSpec(fixture.root);
    assert.equal(transientFailures, 1);
    assert.deepEqual(after, before);
    assert.equal(hasTransactionDebris(after), false);
  });
});
