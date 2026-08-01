import type { ResolvedProject } from "../config/types.ts";
import type { Diagnostic } from "../contracts/diagnostics.ts";
import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { GitObjectId, ObjectId, RequirementId } from "../contracts/identifiers.ts";
import { isRequirementId } from "../contracts/identifiers.ts";
import { computeGraphObjectDelta } from "../fingerprint/object-delta.ts";
import { fingerprintValidatedObject } from "../fingerprint/object-fingerprint.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import { computeAffectedScope } from "../verification/affected-scope.ts";
import { generateSemanticCandidates } from "../verification/semantic-review.ts";
import type { SemanticCandidate } from "../verification/semantic-review.ts";
import { loadBaseSpecificationTree, loadCandidateSpecificationTree, ProposalInputError } from "./specification-tree.ts";

export type ProposalMode = "spec-code" | "spec" | "code";

export type ProposalPackage = {
  readonly schema_version: "1.0";
  readonly artifact_type: "proposal_package";
  readonly project_id: string;
  readonly mode: ProposalMode;
  readonly base: { readonly git_ref: string; readonly tree_fingerprint: string };
  readonly candidate: { readonly source: "directory" | "manifest"; readonly tree_fingerprint: string };
  readonly object_delta: {
    readonly semantic_fingerprint: string;
    readonly structural_fingerprint: string;
    readonly added: readonly ObjectId[];
    readonly modified: readonly ObjectId[];
    readonly deleted: readonly ObjectId[];
  };
  readonly code_targets: readonly {
    readonly requirement_id: RequirementId;
    readonly semantic_fingerprint: string;
    readonly structural_fingerprint: string;
  }[];
  readonly affected_scope: {
    readonly fingerprint: string;
    readonly requirements: readonly string[];
    readonly capabilities: readonly string[];
  };
  readonly diagnostics: readonly Diagnostic[];
  readonly semantic_candidates: readonly SemanticCandidate[];
};

export class ProposalValidationError extends Error {
  readonly diagnostic: Diagnostic;
  readonly technical: boolean;

  constructor(diagnostic: Diagnostic, technical = false) {
    super(diagnostic.message);
    this.name = "ProposalValidationError";
    this.diagnostic = diagnostic;
    this.technical = technical;
  }
}

function diagnostic(code: string, message: string, remediation: string): Diagnostic {
  if (!isDiagnosticCode(code)) throw new Error("Invalid proposal diagnostic code.");
  return { code, severity: "error", message, details: { remediation } };
}

function inputFailure(error: ProposalInputError): ProposalValidationError {
  return new ProposalValidationError(
    diagnostic(error.code, error.message, "Correct the selected base or candidate and run proposal validation again."),
    error.technical,
  );
}

export async function validateProposal(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly baseRef: GitObjectId;
  readonly candidatePath: string;
  readonly mode: ProposalMode;
  readonly codeTargets: readonly RequirementId[];
}): Promise<ProposalPackage> {
  try {
    const base = await loadBaseSpecificationTree(input.gitReader, input.baseRef, input.project);
    const candidate = await loadCandidateSpecificationTree({
      fileSystem: input.fileSystem,
      candidatePath: input.candidatePath,
      selected: input.project,
      baseFingerprint: base.fingerprint,
    });
    const delta = computeGraphObjectDelta(base.graph, candidate.tree.graph);
    const targets = [...new Set(input.codeTargets)].toSorted();
    if (targets.length !== input.codeTargets.length) {
      throw new ProposalValidationError(
        diagnostic(
          "SDD_PROPOSAL_CODE_TARGET_DUPLICATE",
          "A code target is repeated.",
          "Supply each Requirement target once.",
        ),
      );
    }
    if (input.mode !== "code" && targets.length > 0) {
      throw new ProposalValidationError(
        diagnostic(
          "SDD_PROPOSAL_CODE_TARGET_MODE_INVALID",
          "Code targets are permitted only in code mode.",
          "Remove --code-target or select code mode.",
        ),
      );
    }
    if ((input.mode === "spec" || input.mode === "spec-code") && delta.semantic.entries.length === 0) {
      throw new ProposalValidationError(
        diagnostic(
          "SDD_PROPOSAL_SEMANTIC_DELTA_REQUIRED",
          `${input.mode} mode requires a non-empty semantic specification delta.`,
          "Change normative specification meaning or select the correct synchronization mode.",
        ),
      );
    }
    if (input.mode === "code" && (delta.semantic.entries.length > 0 || delta.structural.entries.length > 0)) {
      throw new ProposalValidationError(
        diagnostic(
          "SDD_PROPOSAL_CODE_DELTA_NOT_EMPTY",
          "Code mode requires empty semantic and structural specification deltas.",
          "Restore the specification graph or select spec-code mode.",
        ),
      );
    }
    if (input.mode === "code" && targets.length === 0) {
      throw new ProposalValidationError(
        diagnostic(
          "SDD_PROPOSAL_CODE_TARGET_REQUIRED",
          "Code mode requires at least one active Requirement target.",
          "Supply --code-target REQ-XXXXXXXX.",
        ),
      );
    }
    for (const target of targets) {
      const object = candidate.tree.graph.objects.get(target);
      if (object === undefined || !("anchor" in object)) {
        throw new ProposalValidationError(
          diagnostic(
            "SDD_GRAPH_CODE_TARGET_UNKNOWN",
            `Code target ${target} is not an active Requirement.`,
            "Supply an active Requirement ID from the candidate graph.",
          ),
        );
      }
    }
    const scope = computeAffectedScope({ before: base.graph, after: candidate.tree.graph, code_targets: targets });
    const combined = new Map<ObjectId, "add" | "modify" | "delete">();
    for (const entry of [...delta.semantic.entries, ...delta.structural.entries])
      combined.set(entry.id, entry.operation);
    const byOperation = (operation: "add" | "modify" | "delete") =>
      [...combined]
        .filter(([, value]) => value === operation)
        .map(([id]) => id)
        .toSorted();
    return {
      schema_version: "1.0",
      artifact_type: "proposal_package",
      project_id: input.project.configuration.project_id,
      mode: input.mode,
      base: { git_ref: input.baseRef, tree_fingerprint: base.fingerprint },
      candidate: { source: candidate.source, tree_fingerprint: candidate.tree.fingerprint },
      object_delta: {
        semantic_fingerprint: delta.semantic.fingerprint,
        structural_fingerprint: delta.structural.fingerprint,
        added: byOperation("add"),
        modified: byOperation("modify"),
        deleted: byOperation("delete"),
      },
      code_targets: targets.map((requirement_id) => ({
        requirement_id,
        semantic_fingerprint: fingerprintValidatedObject(candidate.tree.graph, requirement_id, "semantic"),
        structural_fingerprint: fingerprintValidatedObject(candidate.tree.graph, requirement_id, "structural"),
      })),
      affected_scope: {
        fingerprint: scope.fingerprint,
        requirements: scope.affected_requirements,
        capabilities: scope.affected_capabilities,
      },
      diagnostics: [],
      semantic_candidates: generateSemanticCandidates({ base: base.graph, candidate: candidate.tree.graph }),
    };
  } catch (error) {
    if (error instanceof ProposalValidationError) throw error;
    if (error instanceof ProposalInputError) throw inputFailure(error);
    throw error;
  }
}

export function parseProposalMode(value: unknown): ProposalMode | undefined {
  return value === "spec-code" || value === "spec" || value === "code" ? value : undefined;
}

export function parseCodeTarget(value: unknown): RequirementId | undefined {
  return isRequirementId(value) ? value : undefined;
}
