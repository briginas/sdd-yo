import type { GitObjectId, ProjectPath } from "../contracts/identifiers.ts";

export type GitReader = {
  readonly repositoryRoot: string;
  resolveRevision(revision: string): Promise<GitObjectId>;
  findMergeBase(left: GitObjectId, right: GitObjectId): Promise<GitObjectId | undefined>;
  historyStatus(): Promise<"complete" | "incomplete">;
  listReachableRevisions(revision: GitObjectId): Promise<readonly GitObjectId[]>;
  listWorkingTreeConfigPaths(): Promise<readonly ProjectPath[]>;
  listEntriesAt(revision: GitObjectId, root?: ProjectPath): Promise<readonly GitTreeEntry[]>;
  listFilesAt(revision: GitObjectId, root: ProjectPath): Promise<readonly ProjectPath[]>;
  readBlob(objectId: GitObjectId): Promise<Uint8Array>;
  readFileAt(revision: GitObjectId, path: ProjectPath): Promise<Uint8Array | undefined>;
};

export type GitTreeEntry = {
  readonly path: ProjectPath;
  readonly kind: "file" | "symbolic-link" | "gitlink" | "other";
  readonly objectId: GitObjectId;
};
