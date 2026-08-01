import { dirname, join, relative } from "node:path/posix";

import { parseProjectConfiguration } from "../config/parse-config.ts";
import type { ObjectId, ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import { isProjectPath } from "../contracts/identifiers.ts";
import { validateSpecificationGraph } from "../graph/validate-graph.ts";
import { parseSpecificationDocument } from "../markdown/parse-markdown.ts";
import type { SpecificationDocument } from "../markdown/types.ts";
import type { GitObjectId } from "../contracts/identifiers.ts";
import type { GitReader, GitTreeEntry } from "../platform/git-reader.ts";

export type CanonicalHistoryIndex = {
  readonly historyTip: GitObjectId;
  readonly status: "complete" | "incomplete";
  readonly activeObjectIds: ReadonlySet<ObjectId>;
  readonly reservedObjectIds: ReadonlySet<ObjectId>;
  readonly reservedProjectIds: ReadonlySet<ProjectId>;
};

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
    const parsed = parseProjectConfiguration(bytes, entry.path);
    if (!parsed.ok) throw new HistoryIndexError("A reachable project configuration is invalid.");
    const prefixValue = dirname(dirname(entry.path));
    projects.push({
      projectId: parsed.value.project_id,
      projectPrefix: prefixValue === "." ? "" : prefixValue,
      specRoot: parsed.value.spec.root,
      entrypoint: parsed.value.spec.entrypoint,
    });
  }
  return projects;
}

function repositoryPath(project: VersionedProject, path: ProjectPath): ProjectPath {
  const value = project.projectPrefix.length === 0 ? path : join(project.projectPrefix, path);
  if (!isProjectPath(value)) throw new HistoryIndexError("A versioned project path is invalid.");
  return value;
}

async function graphObjectIds(
  reader: GitReader,
  entries: readonly GitTreeEntry[],
  project: VersionedProject,
): Promise<ReadonlySet<ObjectId>> {
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
  return new Set(graph.value.objects.keys());
}

export async function buildCanonicalHistoryIndex(
  reader: GitReader,
  historyTip: GitObjectId,
  selectedProjectId: ProjectId,
): Promise<CanonicalHistoryIndex> {
  const revisions = await reader.listReachableRevisions(historyTip);
  if (revisions[0] !== historyTip) throw new HistoryIndexError("Reachable history does not start at its resolved tip.");
  const reservedObjectIds = new Set<ObjectId>();
  const reservedProjectIds = new Set<ProjectId>();
  let activeObjectIds: ReadonlySet<ObjectId> | undefined;

  for (const [index, revision] of revisions.entries()) {
    const entries = await reader.listEntriesAt(revision);
    const projects = await projectsAt(reader, entries);
    for (const project of projects) reservedProjectIds.add(project.projectId);
    const selected = projects.filter((project) => project.projectId === selectedProjectId);
    if (selected.length > 1) throw new HistoryIndexError("A reachable tree duplicates the selected project ID.");
    if (selected.length === 0) {
      if (index === 0) activeObjectIds = new Set();
      continue;
    }
    const selectedProject = selected[0];
    if (selectedProject === undefined) throw new HistoryIndexError("Selected project lookup failed.");
    const objectIds = await graphObjectIds(reader, entries, selectedProject);
    for (const objectId of objectIds) reservedObjectIds.add(objectId);
    if (index === 0) activeObjectIds = objectIds;
  }

  return {
    historyTip,
    status: await reader.historyStatus(),
    activeObjectIds: activeObjectIds ?? new Set(),
    reservedObjectIds,
    reservedProjectIds,
  };
}
