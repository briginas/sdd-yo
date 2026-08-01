import { relative, resolve } from "node:path";

import { isFingerprint, isGitObjectId, isProjectId, isProjectPath, isRequirementId } from "../contracts/identifiers.ts";
import type { Fingerprint, GitObjectId, ProjectId, ProjectPath, RequirementId } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { ProposalMode } from "../proposal/validate-proposal.ts";

const MAX_CHANGE_BYTES = 1024 * 1024;

export type ChangeDescriptor = {
  readonly schema_version: "1.0";
  readonly artifact_type: "change_descriptor";
  readonly project_id: ProjectId;
  readonly mode: ProposalMode;
  readonly integration_ref: GitObjectId;
  readonly proposal_ref: GitObjectId;
  readonly approved_delta: { readonly semantic: Fingerprint; readonly structural: Fingerprint };
  readonly code_targets: readonly {
    readonly requirement_id: RequirementId;
    readonly semantic_fingerprint: Fingerprint;
    readonly structural_fingerprint: Fingerprint;
  }[];
  readonly created_at?: string;
  readonly producer?: { readonly name: string; readonly version: string };
};

export class MergeInputError extends Error {
  readonly code:
    | "SDD_GATE_INPUT_INVALID"
    | "SDD_GATE_INPUT_NOT_REGULAR"
    | "SDD_GATE_INPUT_OUT_OF_SCOPE"
    | "SDD_GATE_INPUT_READ_FAILED";

  constructor(code: MergeInputError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MergeInputError";
    this.code = code;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseProvenance(value: Record<string, unknown>): Pick<ChangeDescriptor, "created_at" | "producer"> {
  if (
    value.created_at !== undefined &&
    (typeof value.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value.created_at))
  ) {
    throw new MergeInputError("SDD_GATE_INPUT_INVALID", "ChangeDescriptor timestamp is invalid.");
  }
  if (
    value.producer !== undefined &&
    (!record(value.producer) ||
      !exact(value.producer, ["name", "version"]) ||
      !nonEmpty(value.producer.name) ||
      !nonEmpty(value.producer.version))
  ) {
    throw new MergeInputError("SDD_GATE_INPUT_INVALID", "ChangeDescriptor producer is invalid.");
  }
  return {
    ...(value.created_at === undefined ? {} : { created_at: value.created_at as string }),
    ...(value.producer === undefined
      ? {}
      : { producer: { name: value.producer.name as string, version: value.producer.version as string } }),
  };
}

export function parseChangeDescriptor(value: unknown): ChangeDescriptor {
  if (
    !record(value) ||
    !exact(
      value,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "mode",
        "integration_ref",
        "proposal_ref",
        "approved_delta",
        "code_targets",
      ],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "change_descriptor" ||
    !isProjectId(value.project_id) ||
    (value.mode !== "spec-code" && value.mode !== "spec" && value.mode !== "code") ||
    !isGitObjectId(value.integration_ref) ||
    !isGitObjectId(value.proposal_ref) ||
    !record(value.approved_delta) ||
    !exact(value.approved_delta, ["semantic", "structural"]) ||
    !isFingerprint(value.approved_delta.semantic) ||
    !isFingerprint(value.approved_delta.structural) ||
    !Array.isArray(value.code_targets)
  ) {
    throw new MergeInputError("SDD_GATE_INPUT_INVALID", "ChangeDescriptor is not a strict version 1 artifact.");
  }
  const codeTargets = value.code_targets.map((target) => {
    if (
      !record(target) ||
      !exact(target, ["requirement_id", "semantic_fingerprint", "structural_fingerprint"]) ||
      !isRequirementId(target.requirement_id) ||
      !isFingerprint(target.semantic_fingerprint) ||
      !isFingerprint(target.structural_fingerprint)
    ) {
      throw new MergeInputError("SDD_GATE_INPUT_INVALID", "ChangeDescriptor code target is invalid.");
    }
    return {
      requirement_id: target.requirement_id,
      semantic_fingerprint: target.semantic_fingerprint,
      structural_fingerprint: target.structural_fingerprint,
    };
  });
  if (
    (value.mode === "code") !== codeTargets.length > 0 ||
    codeTargets.some((target, index) => index > 0 && codeTargets[index - 1]!.requirement_id >= target.requirement_id)
  ) {
    throw new MergeInputError("SDD_GATE_INPUT_INVALID", "ChangeDescriptor mode or target ordering is invalid.");
  }
  return {
    schema_version: "1.0",
    artifact_type: "change_descriptor",
    project_id: value.project_id,
    ...parseProvenance(value),
    mode: value.mode,
    integration_ref: value.integration_ref,
    proposal_ref: value.proposal_ref,
    approved_delta: {
      semantic: value.approved_delta.semantic,
      structural: value.approved_delta.structural,
    },
    code_targets: codeTargets,
  };
}

function within(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !path.includes("\0"));
}

export async function importProjectJsonArtifact<Value>(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  parse: (value: unknown) => Value,
  maxBytes = MAX_CHANGE_BYTES,
): Promise<Value> {
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realFile = await fileSystem.realPath(resolve(realRoot, ...path.split("/")));
    if (!within(realRoot, realFile))
      throw new MergeInputError("SDD_GATE_INPUT_OUT_OF_SCOPE", "Artifact resolves outside the selected project.");
    const metadata = await fileSystem.metadata(realFile);
    if (metadata.kind !== "file" || metadata.size > maxBytes)
      throw new MergeInputError("SDD_GATE_INPUT_NOT_REGULAR", "Artifact is not a bounded regular file.");
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await fileSystem.readFile(realFile)));
    } catch (error) {
      throw new MergeInputError("SDD_GATE_INPUT_INVALID", "Artifact is not valid UTF-8 JSON.", { cause: error });
    }
    return parse(value);
  } catch (error) {
    if (error instanceof MergeInputError) throw error;
    throw new MergeInputError("SDD_GATE_INPUT_READ_FAILED", "Artifact could not be read.", { cause: error });
  }
}

export async function importChangeDescriptorFile(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
): Promise<ChangeDescriptor> {
  return importProjectJsonArtifact(fileSystem, projectRoot, path, parseChangeDescriptor);
}

export async function resolveProjectCandidatePath(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
): Promise<string> {
  if (!isProjectPath(path)) throw new MergeInputError("SDD_GATE_INPUT_INVALID", "Candidate path is invalid.");
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realCandidate = await fileSystem.realPath(resolve(realRoot, ...path.split("/")));
    if (!within(realRoot, realCandidate))
      throw new MergeInputError("SDD_GATE_INPUT_OUT_OF_SCOPE", "Candidate resolves outside the selected project.");
    return realCandidate;
  } catch (error) {
    if (error instanceof MergeInputError) throw error;
    throw new MergeInputError("SDD_GATE_INPUT_READ_FAILED", "Candidate path could not be resolved.", { cause: error });
  }
}
