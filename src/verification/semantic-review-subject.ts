import { createHash } from "node:crypto";

import type { ResolvedProject } from "../config/types.ts";
import { isFingerprint } from "../contracts/identifiers.ts";
import type { Fingerprint, GitObjectId, ProjectPath } from "../contracts/identifiers.ts";
import { loadCanonicalProjectGraphAt } from "../ids/history-index.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import { revalidateProposalBundle } from "../proposal/proposal-bundle.ts";
import type { ProposalMode, ProposalPackage } from "../proposal/validate-proposal.ts";
import type { ChangeDescriptor } from "./change-descriptor.ts";
import { assessFindings, deriveFindingId } from "./findings.ts";
import type { Finding, HumanSemanticReviewEvidence, ParsedSemanticAnalysisInputManifest } from "./findings.ts";
import { buildSemanticAnalysisInputManifest } from "./semantic-review.ts";
import type { SemanticAnalysisInputManifest } from "./semantic-review.ts";

const encoder = new TextEncoder();
export const HUMAN_SEMANTIC_REVIEW_ANALYZER = { name: "human-semantic-review", version: "1.0" } as const;
export const MAX_SEMANTIC_REVIEW_ARTIFACT_BYTES = 1024 * 1024;

export type SemanticReviewSubject = {
  readonly schema_version: "1.0";
  readonly project_id: ResolvedProject["configuration"]["project_id"];
  readonly mode: ProposalMode;
  readonly proposal_head: GitObjectId;
  readonly integration_ref: GitObjectId;
  readonly merge_base: GitObjectId;
  readonly package_fingerprint: Fingerprint;
  readonly analyzer: typeof HUMAN_SEMANTIC_REVIEW_ANALYZER;
  readonly manifest_input_fingerprint: Fingerprint;
  readonly finding_ids: readonly Finding["finding_id"][];
};

export class SemanticReviewSubjectError extends Error {
  readonly code: string;
  readonly technical: boolean;

  constructor(code: string, message: string, technical = false) {
    super(message);
    this.name = "SemanticReviewSubjectError";
    this.code = code;
    this.technical = technical;
  }
}

function canonical(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key.normalize("NFC"), canonical(item)]),
    );
  return value;
}

function fingerprint(value: unknown): Fingerprint {
  const result = `sha256:${createHash("sha256")
    .update(JSON.stringify(canonical(value)), "utf8")
    .digest("hex")}`;
  if (!isFingerprint(result)) throw new Error("Semantic-review fingerprint generation failed.");
  return result;
}

function changeMatchesPackage(change: ChangeDescriptor, value: ProposalPackage): boolean {
  return (
    change.project_id === value.project_id &&
    change.mode === value.mode &&
    change.approved_delta.semantic === value.object_delta.semantic_fingerprint &&
    change.approved_delta.structural === value.object_delta.structural_fingerprint &&
    JSON.stringify(change.code_targets) === JSON.stringify(value.code_targets)
  );
}

export async function computeSemanticReviewSubject(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly change: ChangeDescriptor;
  readonly bundlePath: ProjectPath;
  readonly findings: readonly Finding[];
}): Promise<{ readonly manifest: SemanticAnalysisInputManifest; readonly subject: SemanticReviewSubject }> {
  const revalidated = await revalidateProposalBundle({
    fileSystem: input.fileSystem,
    gitReader: input.gitReader,
    project: input.project,
    projectRoot: input.project.project_root,
    bundlePath: input.bundlePath,
  });
  if (!changeMatchesPackage(input.change, revalidated.package))
    throw new SemanticReviewSubjectError(
      "SDD_SEMANTIC_REVIEW_CHANGE_PACKAGE_MISMATCH",
      "The Change and retained proposal bundle do not describe the same subject.",
    );
  const [proposalHead, integrationRef, configuredIntegrationRef] = await Promise.all([
    input.gitReader.resolveRevision(input.change.proposal_ref),
    input.gitReader.resolveRevision(input.change.integration_ref),
    input.gitReader.resolveRevision(input.project.configuration.git.default_target_ref),
  ]);
  if (integrationRef !== configuredIntegrationRef)
    throw new SemanticReviewSubjectError(
      "SDD_SEMANTIC_REVIEW_INTEGRATION_REF_NOT_CURRENT",
      "The Change integration ref is not the configured current integration ref.",
    );
  const mergeBase = await input.gitReader.findMergeBase(proposalHead, integrationRef);
  if (mergeBase === undefined)
    throw new SemanticReviewSubjectError(
      "SDD_SEMANTIC_REVIEW_MERGE_BASE_MISSING",
      "The proposal and integration refs have no merge base.",
    );
  const [base, proposal, integration] = await Promise.all([
    loadCanonicalProjectGraphAt(
      input.gitReader,
      revalidated.package.base.git_ref,
      input.project.configuration.project_id,
    ),
    loadCanonicalProjectGraphAt(input.gitReader, proposalHead, input.project.configuration.project_id),
    loadCanonicalProjectGraphAt(input.gitReader, integrationRef, input.project.configuration.project_id),
  ]);
  if (base === undefined || proposal === undefined || integration === undefined)
    throw new SemanticReviewSubjectError(
      "SDD_SEMANTIC_REVIEW_PROJECT_SNAPSHOT_MISSING",
      "A required versioned project graph is missing.",
      true,
    );
  const manifest = buildSemanticAnalysisInputManifest({
    base,
    candidate: proposal,
    comparison: integration,
    project_id: input.project.configuration.project_id,
    analyzer: HUMAN_SEMANTIC_REVIEW_ANALYZER,
  });
  const assessment = assessFindings({
    manifest,
    findings: input.findings,
    resolutions: [],
    human_reviews: [],
    model_analysis_performed: true,
  });
  const invalid = assessment.issues.find((issue) => issue.code !== "SDD_FINDING_RESOLUTION_MISSING");
  if (invalid !== undefined)
    throw new SemanticReviewSubjectError(invalid.code, "A supplied Finding is not current for this review subject.");
  const findingIds = [...new Set(input.findings.map((finding) => finding.finding_id))].toSorted();
  if (
    findingIds.length !== input.findings.length ||
    input.findings.some((finding) => deriveFindingId(finding) !== finding.finding_id)
  )
    throw new SemanticReviewSubjectError(
      "SDD_FINDING_CONTRADICTORY",
      "The supplied Finding set is duplicated or contradictory.",
    );
  return {
    manifest,
    subject: {
      schema_version: "1.0",
      project_id: input.project.configuration.project_id,
      mode: revalidated.package.mode,
      proposal_head: proposalHead,
      integration_ref: integrationRef,
      merge_base: mergeBase,
      package_fingerprint: fingerprint(revalidated.package),
      analyzer: HUMAN_SEMANTIC_REVIEW_ANALYZER,
      manifest_input_fingerprint: manifest.input_fingerprint,
      finding_ids: findingIds,
    },
  };
}

export function sameSemanticReviewManifest(
  retained: ParsedSemanticAnalysisInputManifest,
  current: SemanticAnalysisInputManifest,
): boolean {
  return JSON.stringify(canonical(retained)) === JSON.stringify(canonical(current));
}

export function createHumanSemanticReviewEvidence(input: {
  readonly projectId: SemanticReviewSubject["project_id"];
  readonly subject: SemanticReviewSubject;
  readonly issuer: unknown;
  readonly actor: unknown;
  readonly decision: unknown;
  readonly producer: { readonly name: string; readonly version: string };
}): HumanSemanticReviewEvidence {
  if (typeof input.issuer !== "string" || input.issuer.length === 0)
    throw new SemanticReviewSubjectError("SDD_SEMANTIC_REVIEW_ISSUER_INVALID", "The review issuer is invalid.");
  if (typeof input.actor !== "string" || input.actor.length === 0)
    throw new SemanticReviewSubjectError("SDD_SEMANTIC_REVIEW_ACTOR_INVALID", "The review actor is invalid.");
  if (input.decision !== "reviewed")
    throw new SemanticReviewSubjectError(
      "SDD_SEMANTIC_REVIEW_DECISION_INVALID",
      "The explicit semantic-review decision must be reviewed.",
    );
  return {
    schema_version: "1.0",
    artifact_type: "human_semantic_review_evidence",
    project_id: input.projectId,
    producer: input.producer,
    issuer: input.issuer,
    actor: input.actor,
    decision: "reviewed",
    candidate_input_fingerprint: input.subject.manifest_input_fingerprint,
    finding_ids: input.subject.finding_ids,
  };
}

export function serializeSemanticReviewArtifact(value: unknown): Uint8Array {
  const bytes = encoder.encode(`${JSON.stringify(value)}\n`);
  if (bytes.byteLength > MAX_SEMANTIC_REVIEW_ARTIFACT_BYTES)
    throw new SemanticReviewSubjectError(
      "SDD_SEMANTIC_REVIEW_ARTIFACT_LIMIT_EXCEEDED",
      "The serialized semantic-review artifact exceeds its byte limit.",
      true,
    );
  return bytes;
}
