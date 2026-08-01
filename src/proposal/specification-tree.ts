import { createHash } from "node:crypto";
import { dirname, join, relative, resolve, sep } from "node:path";

import { parseProjectConfiguration } from "../config/parse-config.ts";
import type { ProjectConfiguration, ResolvedProject } from "../config/types.ts";
import type { Fingerprint, GitObjectId, ProjectPath } from "../contracts/identifiers.ts";
import { isFingerprint, isProjectId, isProjectPath } from "../contracts/identifiers.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import { validateSpecificationGraph } from "../graph/validate-graph.ts";
import { parseSpecificationDocument } from "../markdown/parse-markdown.ts";
import type { SpecificationDocument } from "../markdown/types.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader, GitTreeEntry } from "../platform/git-reader.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const MAX_TREE_FILES = 100_000;
const MAX_TREE_BYTES = 64 * 1024 * 1024;

export type SpecificationTreeFile = {
  readonly path: ProjectPath;
  readonly sha256: Fingerprint;
  readonly content_utf8: string;
};

export type SpecificationTree = {
  readonly files: readonly SpecificationTreeFile[];
  readonly fingerprint: Fingerprint;
  readonly graph: ValidatedSpecificationGraph;
};

export class ProposalInputError extends Error {
  readonly code: string;
  readonly technical: boolean;

  constructor(code: string, message: string, technical = false) {
    super(message);
    this.name = "ProposalInputError";
    this.code = code;
    this.technical = technical;
  }
}

function hash(bytes: Uint8Array): Fingerprint {
  const value = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (!isFingerprint(value)) throw new Error("SHA-256 generation failed.");
  return value;
}

function decodeUtf8(bytes: Uint8Array, code = "SDD_PROPOSAL_FILE_NOT_UTF8"): string {
  try {
    return decoder.decode(bytes);
  } catch {
    throw new ProposalInputError(code, "A specification-tree file is not valid UTF-8.");
  }
}

export function fingerprintSpecificationTree(filesInput: readonly SpecificationTreeFile[]): Fingerprint {
  const files = [...filesInput].toSorted((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  const canonical = encoder.encode(
    JSON.stringify({
      canonicalization_version: "1",
      files: files.map(({ path, sha256 }) => ({ path, sha256 })),
    }),
  );
  return hash(canonical);
}

function validateTreeFiles(
  filesInput: readonly SpecificationTreeFile[],
  specRoot: ProjectPath,
): readonly SpecificationTreeFile[] {
  if (filesInput.length > MAX_TREE_FILES) {
    throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_LIMIT_EXCEEDED", "The candidate contains too many files.");
  }
  const files = [...filesInput].toSorted((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  let bytes = 0;
  let previous: string | undefined;
  for (const file of files) {
    if (!isProjectPath(file.path) || (file.path !== specRoot && !file.path.startsWith(`${specRoot}/`))) {
      throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_PATH_INVALID", "A candidate file is outside spec.root.");
    }
    if (file.path === previous) {
      throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_PATH_DUPLICATE", "The candidate repeats a file path.");
    }
    previous = file.path;
    const content = encoder.encode(file.content_utf8);
    bytes += content.byteLength;
    if (bytes > MAX_TREE_BYTES) {
      throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_LIMIT_EXCEEDED", "The candidate is too large.");
    }
    if (hash(content) !== file.sha256) {
      throw new ProposalInputError(
        "SDD_PROPOSAL_CANDIDATE_HASH_MISMATCH",
        "A candidate file hash does not match its exact UTF-8 bytes.",
      );
    }
  }
  return files;
}

function graphFromFiles(
  files: readonly SpecificationTreeFile[],
  config: ProjectConfiguration,
): ValidatedSpecificationGraph {
  const documents: SpecificationDocument[] = [];
  for (const file of files) {
    if (!file.path.endsWith(".md")) continue;
    const parsed = parseSpecificationDocument(file.path, encoder.encode(file.content_utf8));
    if (!parsed.ok)
      throw new ProposalInputError(
        parsed.diagnostics[0]?.code ?? "SDD_MARKDOWN_PARSE_FAILED",
        "A candidate Markdown document is invalid.",
      );
    documents.push(parsed.value);
  }
  const graph = validateSpecificationGraph(documents, config.spec.entrypoint);
  if (!graph.ok)
    throw new ProposalInputError(graph.diagnostics[0]?.code ?? "SDD_GRAPH_INVALID", "The candidate graph is invalid.");
  return graph.value;
}

function tree(filesInput: readonly SpecificationTreeFile[], config: ProjectConfiguration): SpecificationTree {
  const files = validateTreeFiles(filesInput, config.spec.root);
  return { files, fingerprint: fingerprintSpecificationTree(files), graph: graphFromFiles(files, config) };
}

function sameProjectConfiguration(left: ProjectConfiguration, right: ProjectConfiguration): boolean {
  return (
    left.project_id === right.project_id &&
    left.spec.root === right.spec.root &&
    left.spec.entrypoint === right.spec.entrypoint
  );
}

function repositoryProjectPrefix(configPath: ProjectPath): string {
  const value = dirname(dirname(configPath));
  return value === "." ? "" : value;
}

function repositoryPath(prefix: string, path: ProjectPath): ProjectPath {
  const value = prefix === "" ? path : join(prefix, path);
  if (!isProjectPath(value))
    throw new ProposalInputError("SDD_PROPOSAL_BASE_PATH_INVALID", "A base project path is invalid.", true);
  return value;
}

export async function loadBaseSpecificationTree(
  reader: GitReader,
  revision: GitObjectId,
  selected: ResolvedProject,
): Promise<SpecificationTree> {
  const entries = await reader.listEntriesAt(revision);
  const configs = entries.filter(
    (entry) => entry.kind === "file" && (entry.path === ".sdd/config.yaml" || entry.path.endsWith("/.sdd/config.yaml")),
  );
  const matches: { config: ProjectConfiguration; prefix: string }[] = [];
  for (const entry of configs) {
    const parsed = parseProjectConfiguration(await reader.readBlob(entry.objectId), entry.path);
    if (!parsed.ok) continue;
    if (parsed.value.project_id === selected.configuration.project_id) {
      matches.push({ config: parsed.value, prefix: repositoryProjectPrefix(entry.path) });
    }
  }
  if (matches.length !== 1 || !sameProjectConfiguration(matches[0]!.config, selected.configuration)) {
    throw new ProposalInputError(
      "SDD_PROPOSAL_BASE_PROJECT_MISMATCH",
      "The selected base does not contain the same SDD Project configuration.",
      true,
    );
  }
  const match = matches[0]!;
  const root = repositoryPath(match.prefix, match.config.spec.root);
  const files: SpecificationTreeFile[] = [];
  for (const entry of entries) {
    if (entry.path !== root && !entry.path.startsWith(`${root}/`)) continue;
    if (entry.kind !== "file") {
      throw new ProposalInputError(
        "SDD_PROPOSAL_BASE_ENTRY_UNSAFE",
        "The base specification tree contains a non-regular entry.",
        true,
      );
    }
    const local = match.prefix === "" ? entry.path : relative(match.prefix, entry.path);
    if (!isProjectPath(local))
      throw new ProposalInputError("SDD_PROPOSAL_BASE_PATH_INVALID", "A base file path is invalid.", true);
    const bytes = await reader.readBlob(entry.objectId);
    files.push({ path: local, sha256: hash(bytes), content_utf8: decodeUtf8(bytes) });
  }
  return tree(files, match.config);
}

async function walkDirectory(
  fileSystem: FileSystem,
  root: string,
  path: ProjectPath,
): Promise<readonly SpecificationTreeFile[]> {
  const absolute = resolve(root, ...path.split("/"));
  const entries = [...(await fileSystem.readDirectory(absolute))].toSorted((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
  const files: SpecificationTreeFile[] = [];
  for (const entry of entries) {
    const childValue = `${path}/${entry.name}`;
    if (!isProjectPath(childValue))
      throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_PATH_INVALID", "A candidate path is unsafe.");
    if (entry.kind === "symbolic-link" || entry.kind === "other") {
      throw new ProposalInputError(
        "SDD_PROPOSAL_CANDIDATE_ENTRY_UNSAFE",
        "The candidate specification tree contains a non-regular entry.",
      );
    }
    if (entry.kind === "directory") files.push(...(await walkDirectory(fileSystem, root, childValue)));
    else {
      const bytes = await fileSystem.readFile(resolve(root, ...childValue.split("/")));
      files.push({ path: childValue, sha256: hash(bytes), content_utf8: decodeUtf8(bytes) });
    }
  }
  return files;
}

async function loadCandidateDirectory(
  fileSystem: FileSystem,
  candidateRoot: string,
  selected: ResolvedProject,
): Promise<SpecificationTree> {
  const metadata = await fileSystem.metadata(candidateRoot);
  if (metadata.kind !== "directory")
    throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_NOT_DIRECTORY", "The candidate is not a project directory.");
  const realRoot = await fileSystem.realPath(candidateRoot);
  const configPath = resolve(realRoot, ".sdd", "config.yaml");
  if ((await fileSystem.metadata(configPath)).kind !== "file")
    throw new ProposalInputError(
      "SDD_PROPOSAL_CANDIDATE_CONFIG_INVALID",
      "The candidate configuration is not a regular file.",
    );
  const parsed = parseProjectConfiguration(await fileSystem.readFile(configPath), ".sdd/config.yaml" as ProjectPath);
  if (!parsed.ok || !sameProjectConfiguration(parsed.value, selected.configuration)) {
    throw new ProposalInputError(
      "SDD_PROPOSAL_CANDIDATE_PROJECT_MISMATCH",
      "The candidate project ID or specification root does not match the selected project.",
    );
  }
  const specRootPath = resolve(realRoot, ...parsed.value.spec.root.split("/"));
  let realSpecRoot: string;
  try {
    if ((await fileSystem.metadata(specRootPath)).kind !== "directory") {
      throw new ProposalInputError(
        "SDD_PROPOSAL_CANDIDATE_ENTRY_UNSAFE",
        "The candidate specification root is not a regular directory.",
      );
    }
    realSpecRoot = await fileSystem.realPath(specRootPath);
  } catch (error) {
    if (error instanceof ProposalInputError) throw error;
    throw new ProposalInputError(
      "SDD_PROPOSAL_CANDIDATE_UNAVAILABLE",
      "The candidate specification root is unavailable.",
      true,
    );
  }
  const containment = relative(realRoot, realSpecRoot);
  if (containment === ".." || containment.startsWith(`..${sep}`)) {
    throw new ProposalInputError(
      "SDD_PROPOSAL_CANDIDATE_ENTRY_UNSAFE",
      "The candidate specification root resolves outside the candidate project.",
    );
  }
  return tree(await walkDirectory(fileSystem, realRoot, parsed.value.spec.root), parsed.value);
}

type CandidateManifest = {
  readonly schema_version: "1.0";
  readonly artifact_type: "candidate_tree_manifest";
  readonly project_id: string;
  readonly base_tree_fingerprint: string;
  readonly files: readonly { readonly path: string; readonly sha256: string; readonly content_utf8: string }[];
};

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => key in value) && Object.keys(value).every((key) => allowed.has(key));
}

function parseManifest(bytes: Uint8Array): CandidateManifest {
  if (bytes.byteLength > MAX_MANIFEST_BYTES)
    throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_LIMIT_EXCEEDED", "The candidate manifest is too large.");
  let value: unknown;
  try {
    value = JSON.parse(decodeUtf8(bytes, "SDD_PROPOSAL_MANIFEST_NOT_UTF8"));
  } catch (error) {
    if (error instanceof ProposalInputError) throw error;
    throw new ProposalInputError("SDD_PROPOSAL_MANIFEST_INVALID", "The candidate manifest is not valid JSON.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new ProposalInputError("SDD_PROPOSAL_MANIFEST_INVALID", "The candidate manifest is invalid.");
  const record = value as Record<string, unknown>;
  if (
    !hasExactKeys(
      record,
      ["schema_version", "artifact_type", "project_id", "base_tree_fingerprint", "files"],
      ["created_at", "producer"],
    ) ||
    record.schema_version !== "1.0" ||
    record.artifact_type !== "candidate_tree_manifest" ||
    !isProjectId(record.project_id) ||
    !isFingerprint(record.base_tree_fingerprint) ||
    !Array.isArray(record.files)
  ) {
    throw new ProposalInputError("SDD_PROPOSAL_MANIFEST_INVALID", "The candidate manifest envelope is invalid.");
  }
  if (
    record.created_at !== undefined &&
    (typeof record.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(record.created_at))
  ) {
    throw new ProposalInputError("SDD_PROPOSAL_MANIFEST_INVALID", "The candidate manifest timestamp is invalid.");
  }
  if (record.producer !== undefined) {
    const producer = record.producer;
    if (
      typeof producer !== "object" ||
      producer === null ||
      Array.isArray(producer) ||
      !hasExactKeys(producer as Record<string, unknown>, ["name", "version"]) ||
      typeof (producer as Record<string, unknown>).name !== "string" ||
      (producer as Record<string, unknown>).name === "" ||
      typeof (producer as Record<string, unknown>).version !== "string" ||
      (producer as Record<string, unknown>).version === ""
    ) {
      throw new ProposalInputError("SDD_PROPOSAL_MANIFEST_INVALID", "The candidate manifest producer is invalid.");
    }
  }
  for (const item of record.files) {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item) ||
      !hasExactKeys(item as Record<string, unknown>, ["path", "sha256", "content_utf8"]) ||
      !isProjectPath((item as Record<string, unknown>).path) ||
      !isFingerprint((item as Record<string, unknown>).sha256) ||
      typeof (item as Record<string, unknown>).content_utf8 !== "string"
    ) {
      throw new ProposalInputError("SDD_PROPOSAL_MANIFEST_INVALID", "A candidate manifest file entry is invalid.");
    }
  }
  return value as CandidateManifest;
}

export async function loadCandidateSpecificationTree(input: {
  readonly fileSystem: FileSystem;
  readonly candidatePath: string;
  readonly selected: ResolvedProject;
  readonly baseFingerprint: Fingerprint;
}): Promise<{ readonly source: "directory" | "manifest"; readonly tree: SpecificationTree }> {
  let metadata;
  try {
    metadata = await input.fileSystem.metadata(input.candidatePath);
  } catch {
    throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_UNAVAILABLE", "The candidate path is unavailable.", true);
  }
  if (metadata.kind === "directory") {
    return {
      source: "directory",
      tree: await loadCandidateDirectory(input.fileSystem, input.candidatePath, input.selected),
    };
  }
  if (metadata.kind !== "file")
    throw new ProposalInputError("SDD_PROPOSAL_CANDIDATE_ENTRY_UNSAFE", "The candidate input is not a regular file.");
  const manifest = parseManifest(await input.fileSystem.readFile(input.candidatePath));
  if (manifest.project_id !== input.selected.configuration.project_id)
    throw new ProposalInputError(
      "SDD_PROPOSAL_CANDIDATE_PROJECT_MISMATCH",
      "The candidate manifest project does not match the selected project.",
    );
  if (manifest.base_tree_fingerprint !== input.baseFingerprint)
    throw new ProposalInputError(
      "SDD_PROPOSAL_BASE_FINGERPRINT_MISMATCH",
      "The candidate manifest is bound to a different base specification tree.",
    );
  const paths = manifest.files.map((file) => file.path);
  if (paths.some((path, index) => index > 0 && paths[index - 1]! >= path))
    throw new ProposalInputError(
      "SDD_PROPOSAL_MANIFEST_ORDER_INVALID",
      "Candidate manifest files must be strictly path-sorted.",
    );
  const files = manifest.files.map((file) => ({
    path: file.path as ProjectPath,
    sha256: file.sha256 as Fingerprint,
    content_utf8: file.content_utf8,
  }));
  return { source: "manifest", tree: tree(files, input.selected.configuration) };
}
