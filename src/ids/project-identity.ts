import { join, relative, sep } from "node:path";

import { parseProjectConfiguration } from "../config/parse-config.ts";
import type { ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem, FileSystemMetadata } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";

export type CurrentProjectIdentityIndex = {
  readonly projectIdsByPath: ReadonlyMap<ProjectPath, ProjectId>;
  readonly duplicateProjectIds: ReadonlySet<ProjectId>;
};

export class ProjectIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectIdentityError";
  }
}

function isInsideRepository(repositoryRoot: string, candidate: string): boolean {
  const path = relative(repositoryRoot, candidate);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`));
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function buildCurrentProjectIdentityIndex(
  reader: GitReader,
  fileSystem: FileSystem,
): Promise<CurrentProjectIdentityIndex> {
  const repositoryRoot = await fileSystem.realPath(reader.repositoryRoot);
  const projectIdsByPath = new Map<ProjectPath, ProjectId>();
  const pathsByProjectId = new Map<ProjectId, ProjectPath[]>();

  for (const path of await reader.listWorkingTreeConfigPaths()) {
    const candidate = join(reader.repositoryRoot, ...path.split("/"));
    let metadata: FileSystemMetadata;
    try {
      metadata = await fileSystem.metadata(candidate);
    } catch (error) {
      if (isNotFound(error)) continue;
      throw error;
    }
    if (metadata.kind !== "file") throw new ProjectIdentityError("A repository project configuration is unsafe.");
    let realCandidate: string;
    let bytes: Uint8Array;
    try {
      realCandidate = await fileSystem.realPath(candidate);
      bytes = await fileSystem.readFile(realCandidate);
    } catch (error) {
      if (isNotFound(error)) continue;
      throw error;
    }
    if (!isInsideRepository(repositoryRoot, realCandidate)) {
      throw new ProjectIdentityError("A repository project configuration escapes the repository.");
    }
    const parsed = parseProjectConfiguration(bytes, path);
    if (!parsed.ok) throw new ProjectIdentityError("A repository project configuration is invalid.");
    const projectId = parsed.value.project_id;
    projectIdsByPath.set(path, projectId);
    const paths = pathsByProjectId.get(projectId) ?? [];
    paths.push(path);
    pathsByProjectId.set(projectId, paths);
  }

  return {
    projectIdsByPath,
    duplicateProjectIds: new Set(
      [...pathsByProjectId.entries()].filter(([, paths]) => paths.length > 1).map(([projectId]) => projectId),
    ),
  };
}
