import type { ResolvedProject } from "../config/types.ts";
import type { DiagnosticCode } from "../contracts/diagnostics.ts";
import type { GitObjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import {
  createCandidateTreeManifest,
  loadBaseSpecificationTree,
  loadCandidateSpecificationTree,
  serializeCandidateTreeManifest,
} from "./specification-tree.ts";
import type { ProposalMode, ProposalPackage } from "./validate-proposal.ts";
import { ProposalValidationError, validateProposalTrees } from "./validate-proposal.ts";

const encoder = new TextEncoder();

export const PROPOSAL_BUNDLE_CANDIDATE_PATH = "candidate-tree.json" as ProjectPath;
export const PROPOSAL_BUNDLE_PACKAGE_PATH = "proposal-package.json" as ProjectPath;

export type MaterializedProposalBundle = {
  readonly package: ProposalPackage;
  readonly files: readonly { readonly path: ProjectPath; readonly content: Uint8Array }[];
};

export async function materializeProposalBundle(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly baseRef: GitObjectId;
  readonly candidatePath?: string;
  readonly mode: ProposalMode;
  readonly codeTargets: readonly import("../contracts/identifiers.ts").RequirementId[];
}): Promise<MaterializedProposalBundle> {
  const base = await loadBaseSpecificationTree(input.gitReader, input.baseRef, input.project);
  if (input.mode === "code") {
    const packageValue = validateProposalTrees({
      project: input.project,
      baseRef: input.baseRef,
      base,
      candidate: { source: "base", tree: base },
      mode: input.mode,
      codeTargets: input.codeTargets,
    });
    return {
      package: packageValue,
      files: [
        {
          path: PROPOSAL_BUNDLE_PACKAGE_PATH,
          content: encoder.encode(`${JSON.stringify(packageValue)}\n`),
        },
      ],
    };
  }
  if (input.candidatePath === undefined) {
    throw new ProposalValidationError({
      code: "SDD_PROPOSAL_MATERIALIZE_INPUTS_REQUIRED" as DiagnosticCode,
      severity: "error",
      message: "Specification-changing proposal materialization requires an authored candidate.",
      details: { remediation: "Supply one complete candidate SDD Project directory." },
    });
  }
  const candidate = await loadCandidateSpecificationTree({
    fileSystem: input.fileSystem,
    candidatePath: input.candidatePath,
    selected: input.project,
    baseFingerprint: base.fingerprint,
  });
  const manifest = createCandidateTreeManifest({
    projectId: input.project.configuration.project_id,
    base,
    candidate: candidate.tree,
  });
  const packageValue = validateProposalTrees({
    project: input.project,
    baseRef: input.baseRef,
    base,
    candidate: { source: "manifest", tree: candidate.tree },
    mode: input.mode,
    codeTargets: input.codeTargets,
  });
  return {
    package: packageValue,
    files: [
      { path: PROPOSAL_BUNDLE_CANDIDATE_PATH, content: serializeCandidateTreeManifest(manifest) },
      {
        path: PROPOSAL_BUNDLE_PACKAGE_PATH,
        content: encoder.encode(`${JSON.stringify(packageValue)}\n`),
      },
    ],
  };
}
