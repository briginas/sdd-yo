import { createHash } from "node:crypto";

import type { FileSystem } from "../platform/filesystem.ts";
import type { Fingerprint, ProjectPath } from "../contracts/identifiers.ts";
import { isFingerprint, isProjectId, isProjectPath } from "../contracts/identifiers.ts";
import type { SpecificationTree } from "./specification-tree.ts";
import { compareUnicodeCodePoints } from "./specification-tree.ts";

export type SpecPatchOperation =
  | {
      readonly operation: "create";
      readonly path: ProjectPath;
      readonly after_sha256: Fingerprint;
      readonly content_utf8: string;
    }
  | {
      readonly operation: "replace";
      readonly path: ProjectPath;
      readonly before_sha256: Fingerprint;
      readonly after_sha256: Fingerprint;
      readonly content_utf8: string;
    }
  | {
      readonly operation: "delete";
      readonly path: ProjectPath;
      readonly before_sha256: Fingerprint;
    };

export type SpecPatch = {
  readonly schema_version: "1.0";
  readonly artifact_type: "spec_patch";
  readonly project_id: string;
  readonly created_at?: string;
  readonly producer?: { readonly name: string; readonly version: string };
  readonly base_tree_fingerprint: Fingerprint;
  readonly result_tree_fingerprint: Fingerprint;
  readonly operations: readonly SpecPatchOperation[];
};

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const MAX_PATCH_BYTES = 16 * 1024 * 1024;
const MAX_PATCH_OPERATIONS = 100_000;

export class SpecPatchInputError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SpecPatchInputError";
    this.code = code;
  }
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => key in value) && Object.keys(value).every((key) => allowed.has(key));
}

function contentHash(content: string): Fingerprint {
  return `sha256:${createHash("sha256").update(encoder.encode(content)).digest("hex")}` as Fingerprint;
}

export function parseSpecPatch(bytes: Uint8Array): SpecPatch {
  if (bytes.byteLength > MAX_PATCH_BYTES)
    throw new SpecPatchInputError("SDD_APPLY_PATCH_LIMIT_EXCEEDED", "The SpecPatch file is too large.");
  let value: unknown;
  try {
    value = JSON.parse(decoder.decode(bytes));
  } catch {
    throw new SpecPatchInputError("SDD_APPLY_PATCH_INVALID", "The SpecPatch is not valid UTF-8 JSON.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new SpecPatchInputError("SDD_APPLY_PATCH_INVALID", "The SpecPatch envelope is invalid.");
  const record = value as Record<string, unknown>;
  if (
    !hasExactKeys(
      record,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "base_tree_fingerprint",
        "result_tree_fingerprint",
        "operations",
      ],
      ["created_at", "producer"],
    ) ||
    record.schema_version !== "1.0" ||
    record.artifact_type !== "spec_patch" ||
    !isProjectId(record.project_id) ||
    !isFingerprint(record.base_tree_fingerprint) ||
    !isFingerprint(record.result_tree_fingerprint) ||
    !Array.isArray(record.operations) ||
    record.operations.length > MAX_PATCH_OPERATIONS
  )
    throw new SpecPatchInputError("SDD_APPLY_PATCH_INVALID", "The SpecPatch envelope is invalid.");
  if (
    record.created_at !== undefined &&
    (typeof record.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(record.created_at))
  )
    throw new SpecPatchInputError("SDD_APPLY_PATCH_INVALID", "The SpecPatch timestamp is invalid.");
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
    )
      throw new SpecPatchInputError("SDD_APPLY_PATCH_INVALID", "The SpecPatch producer is invalid.");
  }
  let previous: string | undefined;
  for (const operationValue of record.operations) {
    if (typeof operationValue !== "object" || operationValue === null || Array.isArray(operationValue))
      throw new SpecPatchInputError("SDD_APPLY_PATCH_INVALID", "A SpecPatch operation is invalid.");
    const operation = operationValue as Record<string, unknown>;
    const kind = operation.operation;
    const keys =
      kind === "create"
        ? ["operation", "path", "after_sha256", "content_utf8"]
        : kind === "replace"
          ? ["operation", "path", "before_sha256", "after_sha256", "content_utf8"]
          : kind === "delete"
            ? ["operation", "path", "before_sha256"]
            : [];
    if (
      keys.length === 0 ||
      !hasExactKeys(operation, keys) ||
      !isProjectPath(operation.path) ||
      (kind !== "create" && !isFingerprint(operation.before_sha256)) ||
      (kind !== "delete" &&
        (!isFingerprint(operation.after_sha256) ||
          typeof operation.content_utf8 !== "string" ||
          contentHash(operation.content_utf8) !== operation.after_sha256)) ||
      (kind === "replace" && operation.before_sha256 === operation.after_sha256)
    )
      throw new SpecPatchInputError("SDD_APPLY_PATCH_INVALID", "A SpecPatch operation is invalid.");
    if (previous !== undefined && compareUnicodeCodePoints(previous, operation.path) >= 0)
      throw new SpecPatchInputError(
        "SDD_APPLY_PATCH_ORDER_INVALID",
        "SpecPatch operations must have unique strictly path-sorted targets.",
      );
    previous = operation.path;
  }
  return value as SpecPatch;
}

export async function importSpecPatch(fileSystem: FileSystem, path: string): Promise<SpecPatch> {
  let metadata;
  try {
    metadata = await fileSystem.metadata(path);
  } catch {
    throw new SpecPatchInputError("SDD_APPLY_PATCH_UNAVAILABLE", "The SpecPatch file is unavailable.");
  }
  if (metadata.kind !== "file")
    throw new SpecPatchInputError("SDD_APPLY_PATCH_UNSAFE", "The SpecPatch input is not a regular file.");
  return parseSpecPatch(await fileSystem.readFile(path));
}

export function generateSpecPatch(input: {
  readonly project_id: string;
  readonly integration: SpecificationTree;
  readonly prepared: SpecificationTree;
}): SpecPatch {
  const before = new Map(input.integration.files.map((file) => [file.path, file]));
  const after = new Map(input.prepared.files.map((file) => [file.path, file]));
  const paths = [...new Set([...before.keys(), ...after.keys()])].toSorted(compareUnicodeCodePoints);
  const operations: SpecPatchOperation[] = [];
  for (const path of paths) {
    const current = before.get(path);
    const result = after.get(path);
    if (current === undefined && result !== undefined) {
      operations.push({
        operation: "create",
        path,
        after_sha256: result.sha256,
        content_utf8: result.content_utf8,
      });
    } else if (current !== undefined && result === undefined) {
      operations.push({ operation: "delete", path, before_sha256: current.sha256 });
    } else if (current !== undefined && result !== undefined && current.sha256 !== result.sha256) {
      operations.push({
        operation: "replace",
        path,
        before_sha256: current.sha256,
        after_sha256: result.sha256,
        content_utf8: result.content_utf8,
      });
    }
  }
  return {
    schema_version: "1.0",
    artifact_type: "spec_patch",
    project_id: input.project_id,
    base_tree_fingerprint: input.integration.fingerprint,
    result_tree_fingerprint: input.prepared.fingerprint,
    operations,
  };
}
