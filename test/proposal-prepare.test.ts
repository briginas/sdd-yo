import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { resolveProject } from "../src/config/resolve-project.ts";
import type { Fingerprint, GitObjectId, ProjectPath } from "../src/contracts/identifiers.ts";
import type { SpecificationTree, SpecificationTreeFile } from "../src/proposal/specification-tree.ts";
import {
  importProposalPackage,
  parseProposalPackage,
  ProposalPackageInputError,
} from "../src/proposal/package-input.ts";
import {
  mergeSpecificationTrees,
  prepareProposal,
  ProposalPreparationError,
} from "../src/proposal/prepare-proposal.ts";
import { validateProposal } from "../src/proposal/validate-proposal.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { discoverProcessGitReader } from "../src/platform/process-git-reader.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";

const executeFile = promisify(execFile);

function hash(content: string): Fingerprint {
  return `sha256:${createHash("sha256").update(content).digest("hex")}` as Fingerprint;
}

function file(path: string, content_utf8: string): SpecificationTreeFile {
  return { path: path as ProjectPath, content_utf8, sha256: hash(content_utf8) };
}

function fakeTree(files: readonly SpecificationTreeFile[]): SpecificationTree {
  return { files, fingerprint: hash(JSON.stringify(files)), graph: {} as SpecificationTree["graph"] };
}

test("mechanical three-way merge allows independent line changes and classifies every file conflict kind", () => {
  const path = "spec/a.md";
  const base = fakeTree([file(path, "one\ntwo\nthree\n")]);
  const proposed = fakeTree([file(path, "ONE\ntwo\nthree\n")]);
  const integration = fakeTree([file(path, "one\ntwo\nTHREE\n")]);
  const clean = mergeSpecificationTrees(base, proposed, integration);
  assert.deepEqual(clean.conflicts, []);
  assert.equal(clean.files[0]?.content_utf8, "ONE\ntwo\nTHREE\n");

  const kinds = [
    mergeSpecificationTrees(fakeTree([]), fakeTree([file(path, "p")]), fakeTree([file(path, "m")])),
    mergeSpecificationTrees(base, fakeTree([file(path, "P\ntwo\nthree\n")]), fakeTree([file(path, "M\ntwo\nthree\n")])),
    mergeSpecificationTrees(base, proposed, fakeTree([])),
    mergeSpecificationTrees(base, fakeTree([]), integration),
  ].map((result) => result.conflicts[0]?.kind);
  assert.deepEqual(kinds, ["add_add", "modify_modify", "modify_delete", "delete_modify"]);
});

const indexSource = `---
sdd:
  type: index
---
# Prepare test

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
- Delivery is recorded.
`;

async function repository(empty = false) {
  const root = await mkdtemp(join(tmpdir(), "sdd-prepare-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  const { runCli } = await import("../src/cli/run-cli.ts");
  const { nodeProjectWriter } = await import("../src/platform/node-project-writer.ts");
  const { nodeRandomness } = await import("../src/platform/node-randomness.ts");
  await runCli({
    argv: ["init", "--format", "json"],
    workingDirectory: root,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: () => {},
    writeStandardError: () => {},
    writeOutputFile: () => {},
  });
  if (!empty) {
    await writeFile(join(root, "spec/README.md"), indexSource);
    await writeFile(join(root, "spec/capabilities/delivery.md"), capabilitySource);
  }
  await executeFile("git", ["add", ".sdd/config.yaml", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim() as GitObjectId;
  const selected = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: root });
  assert.equal(selected.ok, true);
  if (!selected.ok) throw new Error("Project resolution failed.");
  const reader = await discoverProcessGitReader(nodeProcessRunner, root);
  return { root, base, project: selected.value, reader };
}

async function candidateFrom(root: string): Promise<string> {
  const candidate = await mkdtemp(join(tmpdir(), "sdd-prepare-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  return candidate;
}

test("package-bound preparation is deterministic, read-only, detects stale packages and branch drift", async () => {
  const fixture = await repository();
  const candidate = await candidateFrom(fixture.root);
  const candidateFile = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(
    candidateFile,
    (await readFile(candidateFile, "utf8")).replace("deliver one item", "deliver each item exactly once"),
  );
  const packageValue = await validateProposal({
    fileSystem: nodeFileSystem,
    gitReader: fixture.reader,
    project: fixture.project,
    baseRef: fixture.base,
    candidatePath: candidate,
    mode: "spec-code",
    codeTargets: [],
  });
  assert.throws(
    () => parseProposalPackage({ ...packageValue, unknown: true }),
    (error) => error instanceof ProposalPackageInputError,
  );
  assert.throws(
    () => parseProposalPackage({ ...packageValue, created_at: "not-a-timestamp" }),
    (error) => error instanceof ProposalPackageInputError,
  );
  const packagePath = join(candidate, "proposal-package.json");
  await writeFile(packagePath, JSON.stringify(packageValue));
  assert.deepEqual(await importProposalPackage(nodeFileSystem, packagePath), packageValue);
  await cp(join(candidate, "spec"), join(fixture.root, "spec"), { recursive: true, force: true });
  await executeFile("git", ["add", "spec"], { cwd: fixture.root });
  await executeFile("git", ["commit", "--quiet", "-m", "candidate"], { cwd: fixture.root });
  const branchHead = (
    await executeFile("git", ["rev-parse", "HEAD"], { cwd: fixture.root })
  ).stdout.trim() as GitObjectId;
  const before = (await executeFile("git", ["status", "--porcelain=v1"], { cwd: fixture.root })).stdout;
  const input = {
    fileSystem: nodeFileSystem,
    gitReader: fixture.reader,
    project: fixture.project,
    package: packageValue,
    candidatePath: candidate,
    branchHead,
    integrationRef: fixture.base,
  };
  const first = await prepareProposal(input);
  const second = await prepareProposal(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.report.mechanical_conflicts, []);
  assert.ok(first.prepared_tree);
  assert.equal((await executeFile("git", ["status", "--porcelain=v1"], { cwd: fixture.root })).stdout, before);

  const stale = {
    ...structuredClone(packageValue),
    candidate: { ...packageValue.candidate, tree_fingerprint: `sha256:${"0".repeat(64)}` },
  };
  await assert.rejects(
    () => prepareProposal({ ...input, package: stale }),
    (error) => error instanceof ProposalPreparationError && error.code === "SDD_PREPARE_PACKAGE_STALE",
  );

  await writeFile(
    join(fixture.root, "spec/README.md"),
    `${await readFile(join(fixture.root, "spec/README.md"), "utf8")}\nBranch-only note.\n`,
  );
  await executeFile("git", ["add", "spec/README.md"], { cwd: fixture.root });
  await executeFile("git", ["commit", "--quiet", "-m", "branch drift"], { cwd: fixture.root });
  const driftHead = (
    await executeFile("git", ["rev-parse", "HEAD"], { cwd: fixture.root })
  ).stdout.trim() as GitObjectId;
  const drift = await prepareProposal({ ...input, branchHead: driftHead });
  assert.equal(drift.prepared_tree, undefined);
  assert.deepEqual(drift.report.mechanical_conflicts, [{ path: "spec/README.md", kind: "modify_modify" }]);
});

test("package-added active identity in integration emits sorted id_reuse and no prepared tree", async () => {
  const fixture = await repository(true);
  const candidate = await candidateFrom(fixture.root);
  await mkdir(join(candidate, "spec/capabilities"), { recursive: true });
  await writeFile(join(candidate, "spec/README.md"), indexSource);
  await writeFile(join(candidate, "spec/capabilities/delivery.md"), capabilitySource);
  const packageValue = await validateProposal({
    fileSystem: nodeFileSystem,
    gitReader: fixture.reader,
    project: fixture.project,
    baseRef: fixture.base,
    candidatePath: candidate,
    mode: "spec-code",
    codeTargets: [],
  });
  await cp(join(candidate, "spec"), join(fixture.root, "spec"), { recursive: true, force: true });
  await executeFile("git", ["add", "spec"], { cwd: fixture.root });
  await executeFile("git", ["commit", "--quiet", "-m", "candidate"], { cwd: fixture.root });
  const branchHead = (
    await executeFile("git", ["rev-parse", "HEAD"], { cwd: fixture.root })
  ).stdout.trim() as GitObjectId;
  await executeFile("git", ["checkout", "--quiet", "--detach", fixture.base], { cwd: fixture.root });
  await mkdir(join(fixture.root, "spec/capabilities"), { recursive: true });
  await writeFile(join(fixture.root, "spec/README.md"), indexSource);
  await writeFile(
    join(fixture.root, "spec/capabilities/delivery.md"),
    capabilitySource.replace("deliver one item", "deliver a conflicting item"),
  );
  await executeFile("git", ["add", "spec"], { cwd: fixture.root });
  await executeFile("git", ["commit", "--quiet", "-m", "integration reuse"], { cwd: fixture.root });
  const integrationRef = (
    await executeFile("git", ["rev-parse", "HEAD"], { cwd: fixture.root })
  ).stdout.trim() as GitObjectId;
  const result = await prepareProposal({
    fileSystem: nodeFileSystem,
    gitReader: fixture.reader,
    project: fixture.project,
    package: packageValue,
    candidatePath: candidate,
    branchHead,
    integrationRef,
  });
  assert.equal(result.prepared_tree, undefined);
  assert.ok(
    result.report.mechanical_conflicts.some(
      (conflict) => conflict.kind === "id_reuse" && conflict.object_id === "REQ-A1000001",
    ),
  );
  assert.deepEqual(
    result.report.mechanical_conflicts,
    [...result.report.mechanical_conflicts].toSorted(
      (left, right) =>
        left.path.localeCompare(right.path) ||
        left.kind.localeCompare(right.kind) ||
        (left.object_id ?? "").localeCompare(right.object_id ?? ""),
    ),
  );
});
