import { isGitObjectId, isProjectPath } from "../contracts/identifiers.ts";
import type { GitObjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { GitReader, GitTreeEntry } from "./git-reader.ts";
import type { ProcessResult, ProcessRunner } from "./process-runner.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });

export class GitReadError extends Error {
  readonly code: "GIT_COMMAND_FAILED" | "GIT_OUTPUT_INVALID" | "GIT_REF_UNRESOLVED";

  constructor(code: GitReadError["code"], message: string) {
    super(message);
    this.name = "GitReadError";
    this.code = code;
  }
}

function decode(bytes: Uint8Array): string {
  try {
    return decoder.decode(bytes);
  } catch {
    throw new GitReadError("GIT_OUTPUT_INVALID", "Git emitted invalid UTF-8 output.");
  }
}

function failure(result: ProcessResult): GitReadError {
  const detail = decode(result.standardError).trim();
  return new GitReadError("GIT_COMMAND_FAILED", detail.length === 0 ? "Git command failed." : detail);
}

async function runGit(
  runner: ProcessRunner,
  repositoryRoot: string,
  arguments_: readonly string[],
): Promise<ProcessResult> {
  return runner.run({
    executable: "git",
    arguments: arguments_,
    workingDirectory: repositoryRoot,
    environment: { GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" },
    timeoutMilliseconds: 30_000,
    maxOutputBytes: 64 * 1024 * 1024,
  });
}

function oneObjectId(result: ProcessResult): GitObjectId {
  if (result.exitCode !== 0) throw failure(result);
  const value = decode(result.standardOutput).trim();
  if (value.includes("\n") || !isGitObjectId(value)) {
    throw new GitReadError("GIT_OUTPUT_INVALID", "Git did not emit one object ID.");
  }
  return value;
}

function parseTreeEntries(bytes: Uint8Array): readonly GitTreeEntry[] {
  const records = decode(bytes).split("\0");
  if (records.at(-1) === "") records.pop();
  const entries = records.map((record): GitTreeEntry => {
    const tab = record.indexOf("\t");
    if (tab < 0) throw new GitReadError("GIT_OUTPUT_INVALID", "Git tree record has no path separator.");
    const header = record.slice(0, tab).split(" ");
    const path = record.slice(tab + 1);
    if (header.length !== 3 || !isGitObjectId(header[2]) || !isProjectPath(path)) {
      throw new GitReadError("GIT_OUTPUT_INVALID", "Git tree record is invalid.");
    }
    const [mode, type, objectId] = header as [string, string, GitObjectId];
    const kind =
      mode === "120000" ? "symbolic-link" : type === "blob" ? "file" : type === "commit" ? "gitlink" : "other";
    return { path, kind, objectId };
  });
  return entries.toSorted((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

export function createProcessGitReader(runner: ProcessRunner, repositoryRoot: string): GitReader {
  const listEntriesAt = async (revision: GitObjectId, root?: ProjectPath): Promise<readonly GitTreeEntry[]> => {
    const result = await runGit(runner, repositoryRoot, [
      "ls-tree",
      "-r",
      "-z",
      "--full-tree",
      revision,
      "--",
      ...(root === undefined ? [] : [root]),
    ]);
    if (result.exitCode !== 0) throw failure(result);
    return parseTreeEntries(result.standardOutput);
  };

  return {
    repositoryRoot,
    resolveRevision: async (revision) => {
      if (revision.length === 0 || revision.includes("\0")) {
        throw new GitReadError("GIT_OUTPUT_INVALID", "Git revision input is invalid.");
      }
      const result = await runGit(runner, repositoryRoot, [
        "rev-parse",
        "--verify",
        "--end-of-options",
        `${revision}^{commit}`,
      ]);
      if (result.exitCode !== 0) {
        throw new GitReadError("GIT_REF_UNRESOLVED", "Git revision could not be resolved.");
      }
      return oneObjectId(result);
    },
    findMergeBase: async (left, right) => {
      const result = await runGit(runner, repositoryRoot, ["merge-base", "--", left, right]);
      if (result.exitCode === 1) return undefined;
      return oneObjectId(result);
    },
    historyStatus: async () => {
      const result = await runGit(runner, repositoryRoot, ["rev-parse", "--is-shallow-repository"]);
      if (result.exitCode !== 0) throw failure(result);
      const value = decode(result.standardOutput).trim();
      if (value !== "true" && value !== "false") {
        throw new GitReadError("GIT_OUTPUT_INVALID", "Git shallow status is invalid.");
      }
      return value === "true" ? "incomplete" : "complete";
    },
    listReachableRevisions: async (revision) => {
      const result = await runGit(runner, repositoryRoot, ["rev-list", "--topo-order", revision]);
      if (result.exitCode !== 0) throw failure(result);
      const output = decode(result.standardOutput);
      const values = output.length === 0 ? [] : output.trimEnd().split("\n");
      if (!values.every(isGitObjectId)) {
        throw new GitReadError("GIT_OUTPUT_INVALID", "Git history contains an invalid object ID.");
      }
      return values;
    },
    listEntriesAt,
    listFilesAt: async (revision, root) =>
      (await listEntriesAt(revision, root)).filter((entry) => entry.kind === "file").map((entry) => entry.path),
    readFileAt: async (revision, path) => {
      const entries = await listEntriesAt(revision, path);
      const entry = entries.find((candidate) => candidate.path === path);
      if (entry === undefined) return undefined;
      if (entry.kind !== "file" && entry.kind !== "symbolic-link") {
        throw new GitReadError("GIT_OUTPUT_INVALID", "Requested Git path is not a blob.");
      }
      const result = await runGit(runner, repositoryRoot, ["cat-file", "blob", entry.objectId]);
      if (result.exitCode !== 0) throw failure(result);
      return result.standardOutput;
    },
  };
}

export async function discoverProcessGitReader(runner: ProcessRunner, startDirectory: string): Promise<GitReader> {
  const result = await runGit(runner, startDirectory, ["rev-parse", "--show-toplevel"]);
  if (result.exitCode !== 0) throw failure(result);
  const repositoryRoot = decode(result.standardOutput).trim();
  if (repositoryRoot.length === 0 || repositoryRoot.includes("\0") || repositoryRoot.includes("\n")) {
    throw new GitReadError("GIT_OUTPUT_INVALID", "Git repository root is invalid.");
  }
  return createProcessGitReader(runner, repositoryRoot);
}
