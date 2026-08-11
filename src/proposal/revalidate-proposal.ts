import type { ResolvedProject } from "../config/types.ts";
import type { GitObjectId } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import { parseProposalPackage } from "./package-input.ts";
import { loadBaseSpecificationTree, loadCandidateSpecificationTree } from "./specification-tree.ts";
import type { SpecificationTree } from "./specification-tree.ts";
import type { ProposalPackage } from "./validate-proposal.ts";
import { validateProposal, validateProposalTrees } from "./validate-proposal.ts";

export class ProposalRevalidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProposalRevalidationError";
    this.code = code;
  }
}

function equalPackage(left: ProposalPackage, right: ProposalPackage): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export type RevalidatedProposal = {
  readonly package: ProposalPackage;
  readonly baseRef: GitObjectId;
  readonly base: SpecificationTree;
  readonly candidate: SpecificationTree;
};

export async function revalidateProposalPackage(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly package: unknown;
  readonly candidatePath?: string;
  readonly afterCandidateRevalidation?: () => Promise<void>;
}): Promise<RevalidatedProposal> {
  const packageValue = parseProposalPackage(input.package);
  if (packageValue.project_id !== input.project.configuration.project_id)
    throw new ProposalRevalidationError(
      "SDD_PREPARE_PACKAGE_PROJECT_MISMATCH",
      "The package project does not match the selected project.",
    );
  const baseRef = await input.gitReader.resolveRevision(packageValue.base.git_ref);
  if (baseRef !== packageValue.base.git_ref)
    throw new ProposalRevalidationError(
      "SDD_PREPARE_PACKAGE_BASE_UNBOUND",
      "The package base is not its resolved Git object ID.",
    );
  const base = await loadBaseSpecificationTree(input.gitReader, baseRef, input.project);
  if (packageValue.candidate.source === "base") {
    if (packageValue.mode !== "code" || input.candidatePath !== undefined)
      throw new ProposalRevalidationError(
        "SDD_PREPARE_CANDIDATE_SOURCE_MISMATCH",
        "A base-derived code proposal does not accept a candidate input.",
      );
    const revalidated = validateProposalTrees({
      project: input.project,
      baseRef,
      base,
      candidate: { source: "base", tree: base },
      mode: "code",
      codeTargets: packageValue.code_targets.map((target) => target.requirement_id),
    });
    if (!equalPackage(packageValue, revalidated))
      throw new ProposalRevalidationError(
        "SDD_PREPARE_PACKAGE_STALE",
        "The base or its derived bindings no longer match the ProposalPackage.",
      );
    await input.afterCandidateRevalidation?.();
    const currentBase = await loadBaseSpecificationTree(input.gitReader, baseRef, input.project);
    if (currentBase.fingerprint !== packageValue.candidate.tree_fingerprint)
      throw new ProposalRevalidationError(
        "SDD_PREPARE_CANDIDATE_CHANGED",
        "The base changed after package revalidation.",
      );
    return { package: packageValue, baseRef, base, candidate: currentBase };
  }
  if (input.candidatePath === undefined)
    throw new ProposalRevalidationError(
      "SDD_PREPARE_CANDIDATE_SOURCE_MISMATCH",
      "The retained specification proposal is missing its candidate input.",
    );
  const revalidated = await validateProposal({
    fileSystem: input.fileSystem,
    gitReader: input.gitReader,
    project: input.project,
    baseRef,
    candidatePath: input.candidatePath,
    mode: packageValue.mode,
    codeTargets: packageValue.code_targets.map((target) => target.requirement_id),
  });
  if (revalidated.candidate.source !== packageValue.candidate.source)
    throw new ProposalRevalidationError(
      "SDD_PREPARE_CANDIDATE_SOURCE_MISMATCH",
      "The candidate input kind differs from the package.",
    );
  if (!equalPackage(packageValue, revalidated))
    throw new ProposalRevalidationError(
      "SDD_PREPARE_PACKAGE_STALE",
      "The candidate or its derived bindings no longer match the ProposalPackage.",
    );
  await input.afterCandidateRevalidation?.();
  const candidate = await loadCandidateSpecificationTree({
    fileSystem: input.fileSystem,
    candidatePath: input.candidatePath,
    selected: input.project,
    baseFingerprint: base.fingerprint,
  });
  if (
    candidate.source !== packageValue.candidate.source ||
    candidate.tree.fingerprint !== packageValue.candidate.tree_fingerprint
  )
    throw new ProposalRevalidationError(
      "SDD_PREPARE_CANDIDATE_CHANGED",
      "The candidate changed after package revalidation.",
    );
  return { package: packageValue, baseRef, base, candidate: candidate.tree };
}
