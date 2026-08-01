import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { isGitObjectId, isProjectPath } from "../src/contracts/identifiers.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { createProcessGitReader, discoverProcessGitReader, GitReadError } from "../src/platform/process-git-reader.ts";
import type { ProcessRequest, ProcessResult, ProcessRunner } from "../src/platform/process-runner.ts";

const executeFile = promisify(execFile);
const encoder = new TextEncoder();

function result(output: string, exitCode = 0, error = ""): ProcessResult {
  return {
    exitCode,
    signal: null,
    standardOutput: encoder.encode(output),
    standardError: encoder.encode(error),
  };
}

test("REQ-8B656FC5 process Git reader treats object IDs as opaque and uses argv arrays", async () => {
  const requests: ProcessRequest[] = [];
  const runner: ProcessRunner = {
    run: async (request) => {
      requests.push(request);
      const operation = request.arguments[0];
      if (operation === "rev-parse" && request.arguments[1] === "--verify") return result("opaque-object-id\n");
      if (operation === "rev-parse") return result("true\n");
      if (operation === "rev-list") return result("opaque-object-id\nanother-opaque-id\n");
      if (operation === "merge-base") return result("merge-base-object\n");
      if (operation === "ls-tree") {
        const requestedPath = request.arguments.at(-1);
        if (requestedPath === "file.txt") return result("100644 blob file-object\tfile.txt\0");
        return result(
          "100644 blob z-object\tz.txt\0" + "120000 blob link-object\tlink\0" + "160000 commit module-object\tmodule\0",
        );
      }
      if (operation === "cat-file") return result("content\n");
      throw new Error(`Unexpected Git operation ${operation}.`);
    },
  };
  const reader = createProcessGitReader(runner, "/repo");
  const revision = await reader.resolveRevision("main;echo unsafe");
  assert.equal(revision, "opaque-object-id");
  assert.equal(await reader.historyStatus(), "incomplete");
  assert.deepEqual(await reader.listReachableRevisions(revision), ["opaque-object-id", "another-opaque-id"]);
  assert.equal(await reader.findMergeBase(revision, revision), "merge-base-object");
  const entries = await reader.listEntriesAt(revision);
  assert.deepEqual(
    entries.map((entry) => [entry.path, entry.kind, entry.objectId]),
    [
      ["link", "symbolic-link", "link-object"],
      ["module", "gitlink", "module-object"],
      ["z.txt", "file", "z-object"],
    ],
  );
  const pathValue: unknown = "file.txt";
  assert.ok(isProjectPath(pathValue));
  assert.equal(new TextDecoder().decode(await reader.readFileAt(revision, pathValue)), "content\n");
  assert.ok(requests.every((request) => request.executable === "git" && Array.isArray(request.arguments)));
  const resolveRequest = requests[0];
  assert.deepEqual(resolveRequest?.arguments, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    "main;echo unsafe^{commit}",
  ]);
});

test("REQ-8B656FC5 process Git reader rejects malformed tree and object output", async () => {
  const malformedTree: ProcessRunner = { run: async () => result("100644 blob object\t../escape\0") };
  const reader = createProcessGitReader(malformedTree, "/repo");
  const revisionValue: unknown = "opaque";
  assert.ok(isGitObjectId(revisionValue));
  await assert.rejects(reader.listEntriesAt(revisionValue), (error) => error instanceof GitReadError);

  const malformedRevision: ProcessRunner = { run: async () => result("one\ntwo\n") };
  await assert.rejects(
    createProcessGitReader(malformedRevision, "/repo").resolveRevision("main"),
    (error) => error instanceof GitReadError,
  );

  const missingRevision: ProcessRunner = { run: async () => result("", 128, "missing") };
  await assert.rejects(
    createProcessGitReader(missingRevision, "/repo").resolveRevision("missing"),
    (error) => error instanceof GitReadError && error.code === "GIT_REF_UNRESOLVED",
  );
});

test("REQ-8B656FC5 production Git boundary reads commits, trees, and blobs without mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-git-reader-"));
  await executeFile("git", ["init", "--quiet"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  await mkdir(join(root, "spec"));
  await writeFile(join(root, "spec/README.md"), "first\n");
  await executeFile("git", ["add", "spec/README.md"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "first"], { cwd: root });

  const reader = await discoverProcessGitReader(nodeProcessRunner, join(root, "spec"));
  assert.equal(await realpath(reader.repositoryRoot), await realpath(root));
  const first = await reader.resolveRevision("HEAD");
  assert.ok(isGitObjectId(first));
  assert.equal(await reader.historyStatus(), "complete");
  const specPath: unknown = "spec";
  const readmePath: unknown = "spec/README.md";
  assert.ok(isProjectPath(specPath));
  assert.ok(isProjectPath(readmePath));
  assert.deepEqual(await reader.listFilesAt(first, specPath), [readmePath]);
  assert.equal(new TextDecoder().decode(await reader.readFileAt(first, readmePath)), "first\n");

  await writeFile(join(root, "spec/README.md"), "second\n");
  await executeFile("git", ["add", "spec/README.md"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "second"], { cwd: root });
  const second = await reader.resolveRevision("HEAD");
  assert.notEqual(second, first);
  assert.equal(await reader.findMergeBase(first, second), first);
  assert.deepEqual(await reader.listReachableRevisions(second), [second, first]);
  assert.equal(await readFile(join(root, "spec/README.md"), "utf8"), "second\n");
});
