import { dirname, join, relative } from "node:path/posix";

import { parseHistoricalProjectLocator } from "../config/parse-historical-project.ts";
import type { ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import { isProjectPath } from "../contracts/identifiers.ts";
import { validateSpecificationGraph } from "../graph/validate-graph.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import { parseSpecificationDocument } from "../markdown/parse-markdown.ts";
import type { SpecificationDocument } from "../markdown/types.ts";
import type { GitObjectId } from "../contracts/identifiers.ts";
import type { GitReader, GitTreeEntry } from "../platform/git-reader.ts";

export class HistoryIndexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HistoryIndexError";
  }
}

type VersionedProject = {
  readonly projectId: ProjectId;
  readonly projectPrefix: string;
  readonly specRoot: ProjectPath;
  readonly entrypoint: ProjectPath;
};

function configPath(entry: GitTreeEntry): boolean {
  return entry.kind === "file" && (entry.path === ".sdd/config.yaml" || entry.path.endsWith("/.sdd/config.yaml"));
}

async function projectsAt(reader: GitReader, entries: readonly GitTreeEntry[]): Promise<readonly VersionedProject[]> {
  const projects: VersionedProject[] = [];
  for (const entry of entries.filter(configPath)) {
    const bytes = await reader.readBlob(entry.objectId);
    const parsed = parseHistoricalProjectLocator(bytes);
    if (parsed === undefined) throw new HistoryIndexError("A reachable project configuration is invalid.");
    const prefixValue = dirname(dirname(entry.path));
    projects.push({
      projectId: parsed.projectId,
      projectPrefix: prefixValue === "." ? "" : prefixValue,
      specRoot: parsed.specRoot,
      entrypoint: parsed.entrypoint,
    });
  }
  return projects;
}

function repositoryPath(project: VersionedProject, path: ProjectPath): ProjectPath {
  const value = project.projectPrefix.length === 0 ? path : join(project.projectPrefix, path);
  if (!isProjectPath(value)) throw new HistoryIndexError("A versioned project path is invalid.");
  return value;
}

async function projectGraph(
  reader: GitReader,
  entries: readonly GitTreeEntry[],
  project: VersionedProject,
): Promise<ValidatedSpecificationGraph> {
  const repositorySpecRoot = repositoryPath(project, project.specRoot);
  const documents: SpecificationDocument[] = [];
  for (const entry of entries) {
    if (entry.path !== repositorySpecRoot && !entry.path.startsWith(`${repositorySpecRoot}/`)) continue;
    if (entry.kind === "symbolic-link") throw new HistoryIndexError("A reachable specification contains a symlink.");
    if (entry.kind !== "file" || !entry.path.endsWith(".md")) continue;
    const localValue = project.projectPrefix.length === 0 ? entry.path : relative(project.projectPrefix, entry.path);
    if (!isProjectPath(localValue)) throw new HistoryIndexError("A versioned specification path is invalid.");
    const bytes = await reader.readBlob(entry.objectId);
    const parsed = parseSpecificationDocument(localValue, bytes);
    if (!parsed.ok) throw new HistoryIndexError("A reachable specification document is invalid.");
    documents.push(parsed.value);
  }
  const graph = validateSpecificationGraph(documents, project.entrypoint);
  if (!graph.ok) throw new HistoryIndexError("A reachable canonical specification graph is invalid.");
  return graph.value;
}

export async function loadCanonicalProjectGraphAt(
  reader: GitReader,
  revision: GitObjectId,
  selectedProjectId: ProjectId,
): Promise<ValidatedSpecificationGraph | undefined> {
  const entries = await reader.listEntriesAt(revision);
  const selected = (await projectsAt(reader, entries)).filter((project) => project.projectId === selectedProjectId);
  if (selected.length > 1) throw new HistoryIndexError("A reachable tree duplicates the selected project ID.");
  const project = selected[0];
  return project === undefined ? undefined : projectGraph(reader, entries, project);
}
