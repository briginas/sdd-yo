import { parseDocument } from "yaml";

import { isProjectId, isProjectPath } from "../contracts/identifiers.ts";
import type { ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import { CONFIG_SCHEMA_VERSION_V1 } from "../contracts/versions.ts";

export type HistoricalProjectLocator = {
  readonly projectId: ProjectId;
  readonly specRoot: ProjectPath;
  readonly entrypoint: ProjectPath;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseHistoricalProjectLocator(bytes: Uint8Array): HistoricalProjectLocator | undefined {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }

  const document = parseDocument(source, { customTags: [], uniqueKeys: true, version: "1.2" });
  if (document.errors.length > 0 || document.warnings.length > 0) return undefined;

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    return undefined;
  }
  if (
    !isRecord(value) ||
    value.schema_version !== CONFIG_SCHEMA_VERSION_V1 ||
    !isProjectId(value.project_id) ||
    !isRecord(value.spec) ||
    !isProjectPath(value.spec.root) ||
    !isProjectPath(value.spec.entrypoint)
  ) {
    return undefined;
  }
  return {
    projectId: value.project_id,
    specRoot: value.spec.root,
    entrypoint: value.spec.entrypoint,
  };
}
