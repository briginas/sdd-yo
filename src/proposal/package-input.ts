import type { Diagnostic } from "../contracts/diagnostics.ts";
import {
  isCapabilityId,
  isFingerprint,
  isGitObjectId,
  isObjectId,
  isProjectId,
  isRequirementId,
} from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { SemanticCandidate } from "../verification/semantic-review.ts";
import type { ProposalPackage } from "./validate-proposal.ts";
import { parseProposalMode } from "./validate-proposal.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });
const MAX_PACKAGE_BYTES = 16 * 1024 * 1024;

export class ProposalPackageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalPackageInputError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => key in value) && Object.keys(value).every((key) => allowed.has(key));
}

function sortedUnique(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]! < value);
}

function fail(): never {
  throw new ProposalPackageInputError("The ProposalPackage is not a strict version 1 mechanical package.");
}

function parseSemanticCandidates(value: unknown): readonly SemanticCandidate[] {
  if (!Array.isArray(value)) return fail();
  const candidates = value.map((candidate): SemanticCandidate => {
    if (
      !record(candidate) ||
      !exact(candidate, ["objects", "reason"]) ||
      !Array.isArray(candidate.objects) ||
      candidate.objects.length === 0 ||
      !candidate.objects.every(isObjectId) ||
      !sortedUnique(candidate.objects) ||
      typeof candidate.reason !== "string" ||
      candidate.reason.length === 0
    )
      return fail();
    return { objects: candidate.objects, reason: candidate.reason };
  });
  if (!sortedUnique(candidates.map((candidate) => `${candidate.objects.join("\0")}\0${candidate.reason}`))) {
    return fail();
  }
  return candidates;
}

export function parseProposalPackage(value: unknown): ProposalPackage {
  if (
    !record(value) ||
    !exact(
      value,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "mode",
        "base",
        "candidate",
        "object_delta",
        "code_targets",
        "affected_scope",
        "diagnostics",
        "semantic_candidates",
      ],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "proposal_package" ||
    !isProjectId(value.project_id)
  )
    return fail();
  if (
    value.created_at !== undefined &&
    (typeof value.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value.created_at))
  )
    return fail();
  if (
    value.producer !== undefined &&
    (!record(value.producer) ||
      !exact(value.producer, ["name", "version"]) ||
      typeof value.producer.name !== "string" ||
      value.producer.name.length === 0 ||
      typeof value.producer.version !== "string" ||
      value.producer.version.length === 0)
  )
    return fail();
  const mode = parseProposalMode(value.mode);
  if (mode === undefined || !record(value.base) || !exact(value.base, ["git_ref", "tree_fingerprint"])) return fail();
  if (!isGitObjectId(value.base.git_ref) || !isFingerprint(value.base.tree_fingerprint)) return fail();
  if (!record(value.candidate) || !exact(value.candidate, ["source", "tree_fingerprint"])) return fail();
  if (
    (value.candidate.source !== "base" &&
      value.candidate.source !== "directory" &&
      value.candidate.source !== "manifest") ||
    !isFingerprint(value.candidate.tree_fingerprint)
  )
    return fail();
  if (
    !record(value.object_delta) ||
    !exact(value.object_delta, ["semantic_fingerprint", "structural_fingerprint", "added", "modified", "deleted"])
  )
    return fail();
  if (
    !isFingerprint(value.object_delta.semantic_fingerprint) ||
    !isFingerprint(value.object_delta.structural_fingerprint)
  )
    return fail();
  const deltaLists = [value.object_delta.added, value.object_delta.modified, value.object_delta.deleted];
  if (deltaLists.some((list) => !Array.isArray(list) || !list.every(isObjectId) || !sortedUnique(list))) return fail();
  const deltaIds = deltaLists.flat() as string[];
  if (new Set(deltaIds).size !== deltaIds.length) return fail();
  if (!Array.isArray(value.code_targets)) return fail();
  for (const target of value.code_targets) {
    if (
      !record(target) ||
      !exact(target, ["requirement_id", "semantic_fingerprint", "structural_fingerprint"]) ||
      !isRequirementId(target.requirement_id) ||
      !isFingerprint(target.semantic_fingerprint) ||
      !isFingerprint(target.structural_fingerprint)
    )
      return fail();
  }
  const targetIds = value.code_targets.map((target) => (target as Record<string, unknown>).requirement_id as string);
  if (!sortedUnique(targetIds)) return fail();
  if ((mode === "code") !== targetIds.length > 0) return fail();
  if (
    !record(value.affected_scope) ||
    !exact(value.affected_scope, ["fingerprint", "requirements", "capabilities"]) ||
    !isFingerprint(value.affected_scope.fingerprint) ||
    !Array.isArray(value.affected_scope.requirements) ||
    !value.affected_scope.requirements.every(isRequirementId) ||
    !sortedUnique(value.affected_scope.requirements) ||
    !Array.isArray(value.affected_scope.capabilities) ||
    !value.affected_scope.capabilities.every(isCapabilityId) ||
    !sortedUnique(value.affected_scope.capabilities)
  )
    return fail();
  if (!Array.isArray(value.diagnostics) || value.diagnostics.length !== 0) return fail();
  const semanticCandidates = parseSemanticCandidates(value.semantic_candidates);
  return {
    schema_version: "1.0",
    artifact_type: "proposal_package",
    project_id: value.project_id,
    mode,
    base: { git_ref: value.base.git_ref, tree_fingerprint: value.base.tree_fingerprint },
    candidate: { source: value.candidate.source, tree_fingerprint: value.candidate.tree_fingerprint },
    object_delta: {
      semantic_fingerprint: value.object_delta.semantic_fingerprint,
      structural_fingerprint: value.object_delta.structural_fingerprint,
      added: value.object_delta.added as ProposalPackage["object_delta"]["added"],
      modified: value.object_delta.modified as ProposalPackage["object_delta"]["modified"],
      deleted: value.object_delta.deleted as ProposalPackage["object_delta"]["deleted"],
    },
    code_targets: value.code_targets.map((target) => {
      const normalized = target as {
        readonly requirement_id: ProposalPackage["code_targets"][number]["requirement_id"];
        readonly semantic_fingerprint: ProposalPackage["code_targets"][number]["semantic_fingerprint"];
        readonly structural_fingerprint: ProposalPackage["code_targets"][number]["structural_fingerprint"];
      };
      return {
        requirement_id: normalized.requirement_id,
        semantic_fingerprint: normalized.semantic_fingerprint,
        structural_fingerprint: normalized.structural_fingerprint,
      };
    }),
    affected_scope: {
      fingerprint: value.affected_scope.fingerprint,
      requirements: value.affected_scope.requirements,
      capabilities: value.affected_scope.capabilities,
    },
    diagnostics: value.diagnostics as Diagnostic[],
    semantic_candidates: semanticCandidates,
  };
}

export async function importProposalPackage(fileSystem: FileSystem, path: string): Promise<ProposalPackage> {
  const metadata = await fileSystem.metadata(path);
  if (metadata.kind !== "file" || metadata.size > MAX_PACKAGE_BYTES)
    throw new ProposalPackageInputError("The ProposalPackage input is not a bounded regular file.");
  const bytes = await fileSystem.readFile(path);
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch {
    throw new ProposalPackageInputError("The ProposalPackage is not UTF-8.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ProposalPackageInputError("The ProposalPackage is not valid JSON.");
  }
  return parseProposalPackage(value);
}
