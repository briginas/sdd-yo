import type { GitObjectId, ProjectPath } from "../contracts/identifiers.ts";

export type GitReader = {
  resolveRevision(revision: string): Promise<GitObjectId>;
  findMergeBase(left: GitObjectId, right: GitObjectId): Promise<GitObjectId | undefined>;
  listFilesAt(revision: GitObjectId, root: ProjectPath): Promise<readonly ProjectPath[]>;
  readFileAt(revision: GitObjectId, path: ProjectPath): Promise<Uint8Array | undefined>;
};
