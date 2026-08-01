import type { Fingerprint, ProjectPath } from "../contracts/identifiers.ts";
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
  readonly base_tree_fingerprint: Fingerprint;
  readonly result_tree_fingerprint: Fingerprint;
  readonly operations: readonly SpecPatchOperation[];
};

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
