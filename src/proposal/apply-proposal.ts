import { relative, resolve, sep } from "node:path";

import type { ResolvedProject } from "../config/types.ts";
import type { Fingerprint, ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import { SpecificationWritePreconditionError } from "../platform/project-writer.ts";
import type { ProjectWriter, SpecificationWriteOperation } from "../platform/project-writer.ts";
import { buildSpecificationTree, loadCandidateSpecificationTree } from "./specification-tree.ts";
import { portablePatchPathKey } from "./spec-patch.ts";
import type { SpecPatch } from "./spec-patch.ts";

const encoder = new TextEncoder();

export class ProposalApplyError extends Error {
  readonly code: string;
  readonly technical: boolean;

  constructor(code: string, message: string, technical = false) {
    super(message);
    this.name = "ProposalApplyError";
    this.code = code;
    this.technical = technical;
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function contained(root: string, target: string): boolean {
  const value = relative(root, target);
  return value === "" || (value !== ".." && !value.startsWith(`..${sep}`));
}

async function validatePathComponents(
  fileSystem: FileSystem,
  root: string,
  path: ProjectPath,
  operation: SpecPatch["operations"][number]["operation"],
): Promise<void> {
  const segments = path.split("/");
  let missing = false;
  for (let index = 0; index < segments.length; index += 1) {
    const target = resolve(root, ...segments.slice(0, index + 1));
    if (!contained(root, target))
      throw new ProposalApplyError("SDD_APPLY_PATH_UNSAFE", "A patch target resolves outside the worktree.");
    if (missing) continue;
    try {
      const metadata = await fileSystem.metadata(target);
      if (metadata.kind === "symbolic-link" || metadata.kind === "other")
        throw new ProposalApplyError("SDD_APPLY_PATH_UNSAFE", "A patch target contains an unsafe entry.");
      if (index < segments.length - 1 && metadata.kind !== "directory")
        throw new ProposalApplyError("SDD_APPLY_PATH_UNSAFE", "A patch target parent is not a directory.");
      if (index === segments.length - 1) {
        if (operation === "create")
          throw new ProposalApplyError("SDD_APPLY_TARGET_EXISTS", "A create target already exists.");
        if (metadata.kind !== "file")
          throw new ProposalApplyError("SDD_APPLY_TARGET_INVALID", "A patch target is not a regular file.");
      }
    } catch (error) {
      if (error instanceof ProposalApplyError) throw error;
      if (!isNotFound(error))
        throw new ProposalApplyError("SDD_APPLY_PATH_UNAVAILABLE", "A patch target cannot be inspected.", true);
      missing = true;
      if (operation !== "create")
        throw new ProposalApplyError("SDD_APPLY_TARGET_MISSING", "A replace or delete target is missing.");
    }
  }
}

export type ProposalApplyResult = {
  readonly applied_paths: readonly ProjectPath[];
  readonly result_tree_fingerprint: Fingerprint;
};

export async function applyProposal(input: {
  readonly fileSystem: FileSystem;
  readonly writer: ProjectWriter;
  readonly project: ResolvedProject;
  readonly worktreeRoot: string;
  readonly patch: SpecPatch;
}): Promise<ProposalApplyResult> {
  if (input.patch.project_id !== input.project.configuration.project_id)
    throw new ProposalApplyError("SDD_APPLY_PROJECT_MISMATCH", "The SpecPatch belongs to another SDD Project.");

  let realRoot: string;
  try {
    if ((await input.fileSystem.metadata(input.worktreeRoot)).kind !== "directory")
      throw new ProposalApplyError("SDD_APPLY_WORKTREE_INVALID", "The selected worktree is not a directory.");
    realRoot = await input.fileSystem.realPath(input.worktreeRoot);
  } catch (error) {
    if (error instanceof ProposalApplyError) throw error;
    throw new ProposalApplyError("SDD_APPLY_WORKTREE_UNAVAILABLE", "The selected worktree is unavailable.", true);
  }

  const specRoot = input.project.configuration.spec.root;
  await validatePathComponents(input.fileSystem, realRoot, ".sdd/config.yaml" as ProjectPath, "replace");
  let current;
  try {
    current = (
      await loadCandidateSpecificationTree({
        fileSystem: input.fileSystem,
        candidatePath: realRoot,
        selected: input.project,
        baseFingerprint: input.patch.base_tree_fingerprint,
      })
    ).tree;
  } catch (error) {
    throw new ProposalApplyError(
      error instanceof Error && "code" in error && typeof error.code === "string"
        ? error.code
        : "SDD_APPLY_WORKTREE_INVALID",
      error instanceof Error ? error.message : "The current specification tree is invalid.",
      error instanceof Error && "technical" in error && error.technical === true,
    );
  }
  if (current.fingerprint !== input.patch.base_tree_fingerprint)
    throw new ProposalApplyError(
      "SDD_APPLY_BASE_MISMATCH",
      "The current specification tree does not match the patch base.",
    );

  const resultFiles = new Map(current.files.map((file) => [file.path, file]));
  const portablePaths = new Map<string, ProjectPath>();
  for (const file of current.files) {
    const key = portablePatchPathKey(file.path);
    const collision = portablePaths.get(key);
    if (collision !== undefined && collision !== file.path)
      throw new ProposalApplyError(
        "SDD_APPLY_PATH_COLLISION",
        "The current specification tree contains a portable path collision.",
      );
    portablePaths.set(key, file.path);
  }
  const writes: SpecificationWriteOperation[] = [];
  for (const operation of input.patch.operations) {
    if (operation.path === specRoot || !operation.path.startsWith(`${specRoot}/`))
      throw new ProposalApplyError("SDD_APPLY_PATH_OUTSIDE_SPEC", "A patch target is outside spec.root.");
    const portableCollision = portablePaths.get(portablePatchPathKey(operation.path));
    if (portableCollision !== undefined && portableCollision !== operation.path)
      throw new ProposalApplyError(
        "SDD_APPLY_PATH_COLLISION",
        "A patch target aliases a differently spelled existing specification path.",
      );
    await validatePathComponents(input.fileSystem, realRoot, operation.path, operation.operation);
    const before = resultFiles.get(operation.path);
    if (operation.operation === "create") {
      if (before !== undefined)
        throw new ProposalApplyError("SDD_APPLY_TARGET_EXISTS", "A create target already exists in the base tree.");
      const file = { path: operation.path, sha256: operation.after_sha256, content_utf8: operation.content_utf8 };
      resultFiles.set(operation.path, file);
      writes.push({
        operation: "create",
        target: resolve(realRoot, ...operation.path.split("/")),
        content: encoder.encode(operation.content_utf8),
      });
    } else {
      if (before === undefined || before.sha256 !== operation.before_sha256)
        throw new ProposalApplyError(
          "SDD_APPLY_BEFORE_MISMATCH",
          "A patch before hash does not match the current file.",
        );
      if (operation.operation === "delete") {
        resultFiles.delete(operation.path);
        writes.push({
          operation: "delete",
          target: resolve(realRoot, ...operation.path.split("/")),
          beforeSha256: operation.before_sha256,
        });
      } else {
        const file = { path: operation.path, sha256: operation.after_sha256, content_utf8: operation.content_utf8 };
        resultFiles.set(operation.path, file);
        writes.push({
          operation: "replace",
          target: resolve(realRoot, ...operation.path.split("/")),
          beforeSha256: operation.before_sha256,
          content: encoder.encode(operation.content_utf8),
        });
      }
    }
  }
  let result;
  try {
    result = buildSpecificationTree([...resultFiles.values()], input.project.configuration);
  } catch (error) {
    throw new ProposalApplyError(
      error instanceof Error && "code" in error && typeof error.code === "string"
        ? error.code
        : "SDD_APPLY_RESULT_INVALID",
      error instanceof Error ? error.message : "The patched specification tree is invalid.",
    );
  }
  if (result.fingerprint !== input.patch.result_tree_fingerprint)
    throw new ProposalApplyError(
      "SDD_APPLY_RESULT_MISMATCH",
      "The validated result tree does not match the patch binding.",
    );

  try {
    await input.writer.replaceSpecificationFilesAtomically(realRoot, writes);
  } catch (error) {
    if (error instanceof SpecificationWritePreconditionError) throw new ProposalApplyError(error.code, error.message);
    throw new ProposalApplyError(
      "SDD_APPLY_TRANSACTION_FAILED",
      "The specification transaction failed and was rolled back.",
      true,
    );
  }
  return {
    applied_paths: input.patch.operations.map((operation) => operation.path),
    result_tree_fingerprint: result.fingerprint,
  };
}
