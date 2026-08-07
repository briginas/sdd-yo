import { createHash } from "node:crypto";

import type { ResolvedProject } from "../config/types.ts";
import type { Diagnostic } from "../contracts/diagnostics.ts";
import type {
  CapabilityId,
  Fingerprint,
  GitObjectId,
  ProjectId,
  ProjectPath,
  RequirementId,
} from "../contracts/identifiers.ts";
import { isFingerprint } from "../contracts/identifiers.ts";
import { buildCanonicalHistoryIndex, loadCanonicalProjectGraphAt } from "../ids/history-index.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import { parseProposalPackage } from "../proposal/package-input.ts";
import { prepareApprovedProposal } from "../proposal/prepare-proposal.ts";
import type { PreparationGateIssue } from "../proposal/prepare-proposal.ts";
import type { ProposalPackage } from "../proposal/validate-proposal.ts";
import type { TestIndex } from "../tests/test-index.ts";
import { assessGovernanceEvidence } from "./evidence.ts";
import type { ChangeDescriptor } from "./change-descriptor.ts";
import type {
  ApprovalEvidence,
  GovernanceEvidence,
  HumanDecisionEvidenceAssessment,
  QaEvidence,
  TestExecutionEvidence,
} from "./evidence.ts";
import type {
  Finding,
  FindingResolution,
  HumanSemanticReviewEvidence,
  ParsedSemanticAnalysisInputManifest,
} from "./findings.ts";
import { buildSemanticAnalysisInputManifest } from "./semantic-review.ts";
import { buildVerificationReport } from "./verification-report.ts";
import type { ReadinessStatus, VerificationReport } from "./verification-report.ts";

export type VersionedMergeInput<T> = { readonly artifact: T; readonly source: "stdin" | ProjectPath };

export type MergeReport = {
  readonly schema_version: "1.0";
  readonly artifact_type: "merge_report";
  readonly project_id: ProjectId;
  readonly integration_ref: GitObjectId;
  readonly branch_head: GitObjectId;
  readonly merge_base: GitObjectId;
  readonly config_fingerprint: Fingerprint;
  readonly mode: ProposalPackage["mode"];
  readonly deltas_or_code_targets:
    | {
        readonly approved_delta: { readonly semantic: Fingerprint; readonly structural: Fingerprint };
      }
    | { readonly code_targets: ProposalPackage["code_targets"] };
  readonly affected_scope: {
    readonly fingerprint: Fingerprint;
    readonly requirements: readonly RequirementId[];
    readonly capabilities: readonly CapabilityId[];
  };
  readonly test_summary: CheckSummary;
  readonly qa_summary: CheckSummary;
  readonly findings_and_evidence: {
    readonly findings: VerificationReport["findings"];
    readonly evidence_status: "current" | "missing" | "stale" | "negative" | "contradictory";
  };
  readonly adoption: {
    readonly mode: "incremental" | "complete";
    readonly project_scope_fingerprint: Fingerprint;
  };
  readonly diagnostics: readonly Diagnostic[];
  readonly status: ReadinessStatus;
  readonly input_manifest: readonly {
    readonly artifact_type: string;
    readonly fingerprint: Fingerprint;
    readonly source: "stdin" | ProjectPath;
  }[];
};

type CheckSummary = {
  readonly status: ReadinessStatus | "NOT_APPLICABLE";
  readonly satisfied: number;
  readonly unsatisfied: number;
};
type MergeIssue = {
  readonly code: string;
  readonly disposition: "BLOCKED" | "REVIEW_REQUIRED";
  readonly details?: Readonly<Record<string, unknown>>;
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .toSorted(([left], [right]) => compareText(left, right))
        .map(([key, item]) => [key.normalize("NFC"), canonicalValue(item)]),
    );
  }
  return value;
}

function fingerprint(value: unknown): Fingerprint {
  const result = `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)), "utf8")
    .digest("hex")}`;
  if (!isFingerprint(result)) throw new Error("Merge input fingerprint generation failed.");
  return result;
}

function inputEntry(
  input: VersionedMergeInput<{ readonly artifact_type: string }>,
): MergeReport["input_manifest"][number] {
  return {
    artifact_type: input.artifact.artifact_type,
    fingerprint: fingerprint(input.artifact),
    source: input.source,
  };
}

function diagnostic(issue: MergeIssue | PreparationGateIssue): Diagnostic {
  return {
    code: issue.code as Diagnostic["code"],
    severity: "error",
    message: `Merge condition ${issue.code} is not satisfied.`,
    details: { disposition: issue.disposition, ...(("details" in issue && issue.details) ?? {}) },
  };
}

function diagnosticKey(value: Diagnostic): string {
  return [value.code, value.object_id ?? "", JSON.stringify(value.details ?? {})].join("\0");
}

function summary(satisfied: number, unsatisfied: number, blocked: boolean, applicable: boolean): CheckSummary {
  if (!applicable) return { status: "NOT_APPLICABLE", satisfied: 0, unsatisfied: 0 };
  return {
    status: unsatisfied === 0 ? "PASS" : blocked ? "BLOCKED" : "REVIEW_REQUIRED",
    satisfied,
    unsatisfied,
  };
}

function evidenceState(
  approval: HumanDecisionEvidenceAssessment,
  governance: HumanDecisionEvidenceAssessment | undefined,
  diagnostics: readonly Diagnostic[],
): MergeReport["findings_and_evidence"]["evidence_status"] {
  const states = [approval.state, ...(governance === undefined ? [] : [governance.state])];
  if (states.includes("contradictory") || diagnostics.some((item) => item.code.includes("CONTRADICTORY")))
    return "contradictory";
  if (states.includes("negative") || diagnostics.some((item) => /FAILED|REJECTED|CONFIRMED/u.test(item.code)))
    return "negative";
  if (states.includes("stale") || diagnostics.some((item) => /STALE|UNCONFIGURED|UNKNOWN/u.test(item.code)))
    return "stale";
  if (states.includes("missing") || diagnostics.some((item) => item.details?.disposition === "REVIEW_REQUIRED"))
    return "missing";
  return "current";
}

function projectScopeFingerprint(graphObjectIds: readonly string[]): Fingerprint {
  return fingerprint({ canonicalization_version: "1", governed_object_ids: [...graphObjectIds].toSorted(compareText) });
}

export async function runMergeGate(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly change?: VersionedMergeInput<ChangeDescriptor>;
  readonly package: VersionedMergeInput<unknown>;
  readonly candidatePath: string;
  readonly branch_head_ref: string;
  readonly integration_ref: string;
  readonly approvals: readonly VersionedMergeInput<ApprovalEvidence>[];
  readonly governance: readonly VersionedMergeInput<GovernanceEvidence>[];
  readonly adoption_transition?: { readonly from: "incremental" | "complete"; readonly to: "incremental" | "complete" };
  readonly test_index?: VersionedMergeInput<TestIndex>;
  readonly test_execution: readonly VersionedMergeInput<TestExecutionEvidence>[];
  readonly qa: readonly VersionedMergeInput<QaEvidence>[];
  readonly semantic_review?: {
    readonly manifest: VersionedMergeInput<ParsedSemanticAnalysisInputManifest>;
    readonly findings: readonly VersionedMergeInput<Finding>[];
    readonly resolutions: readonly VersionedMergeInput<FindingResolution>[];
    readonly human_reviews: readonly VersionedMergeInput<HumanSemanticReviewEvidence>[];
    readonly model_analysis_performed: boolean;
  };
  readonly current_adapter_fingerprints: Readonly<Record<string, Fingerprint>>;
}): Promise<MergeReport> {
  const packageValue = parseProposalPackage(input.package.artifact);
  const changeMismatch =
    input.change !== undefined &&
    (() => {
      const change = input.change.artifact;
      return (
        change.project_id !== packageValue.project_id ||
        change.mode !== packageValue.mode ||
        change.approved_delta.semantic !== packageValue.object_delta.semantic_fingerprint ||
        change.approved_delta.structural !== packageValue.object_delta.structural_fingerprint ||
        JSON.stringify(change.code_targets) !== JSON.stringify(packageValue.code_targets)
      );
    })();
  const [branchHead, integrationRef, configuredIntegrationRef] = await Promise.all([
    input.gitReader.resolveRevision(input.branch_head_ref),
    input.gitReader.resolveRevision(input.integration_ref),
    input.gitReader.resolveRevision(input.project.configuration.git.default_target_ref),
  ]);
  const issues: MergeIssue[] = [];
  if (changeMismatch) issues.push({ code: "SDD_MERGE_CHANGE_PACKAGE_MISMATCH", disposition: "BLOCKED" });
  if (integrationRef !== configuredIntegrationRef) {
    issues.push({ code: "SDD_MERGE_INTEGRATION_REF_NOT_CURRENT", disposition: "BLOCKED" });
  }
  const [branchHistory, integrationHistory, baseGraph, headGraph] = await Promise.all([
    buildCanonicalHistoryIndex(input.gitReader, branchHead, input.project.configuration.project_id),
    buildCanonicalHistoryIndex(input.gitReader, integrationRef, input.project.configuration.project_id),
    loadCanonicalProjectGraphAt(input.gitReader, packageValue.base.git_ref, input.project.configuration.project_id),
    loadCanonicalProjectGraphAt(input.gitReader, branchHead, input.project.configuration.project_id),
  ]);
  if (branchHistory.status !== "complete" || integrationHistory.status !== "complete") {
    issues.push({ code: "SDD_MERGE_HISTORY_INCOMPLETE", disposition: "BLOCKED" });
  }
  if (baseGraph === undefined || headGraph === undefined)
    throw new Error("A required versioned project graph is missing.");
  for (const id of packageValue.object_delta.added) {
    if (integrationHistory.reservedObjectIds.has(id)) {
      issues.push({ code: "SDD_MERGE_HISTORICAL_ID_REUSE", disposition: "BLOCKED", details: { object_id: id } });
    }
  }

  const prepared = await prepareApprovedProposal({
    fileSystem: input.fileSystem,
    gitReader: input.gitReader,
    project: input.project,
    package: packageValue,
    candidatePath: input.candidatePath,
    branchHead,
    integrationRef,
    approvalEvidence: input.approvals.map((item) => item.artifact),
  });
  const currentBaseGraph = prepared.integration_tree.graph;
  const currentHeadGraph = prepared.prepared_tree?.graph ?? headGraph;
  const explicitEvidence = [
    ...input.approvals,
    ...input.governance,
    ...(input.test_index === undefined ? [] : [input.test_index]),
    ...input.test_execution,
    ...input.qa,
    ...(input.semantic_review === undefined
      ? []
      : [
          input.semantic_review.manifest,
          ...input.semantic_review.findings,
          ...input.semantic_review.resolutions,
          ...input.semantic_review.human_reviews,
        ]),
  ];
  for (const item of explicitEvidence) {
    if (item.artifact.schema_version !== "1.0" || item.artifact.project_id !== input.project.configuration.project_id) {
      issues.push({
        code: "SDD_MERGE_INPUT_SUBJECT_INVALID",
        disposition: "BLOCKED",
        details: { artifact_type: item.artifact.artifact_type },
      });
    }
  }
  if (input.semantic_review !== undefined) {
    const currentManifest = buildSemanticAnalysisInputManifest({
      base: baseGraph,
      candidate: headGraph,
      comparison: prepared.integration_tree.graph,
      project_id: input.project.configuration.project_id,
      analyzer: input.semantic_review.manifest.artifact.analyzer,
    });
    if (currentManifest.input_fingerprint !== input.semantic_review.manifest.artifact.input_fingerprint) {
      issues.push({ code: "SDD_MERGE_SEMANTIC_INPUT_STALE", disposition: "BLOCKED" });
    }
  }
  const verification = buildVerificationReport({
    project_id: input.project.configuration.project_id,
    head_ref: branchHead,
    integration_ref: integrationRef,
    config_fingerprint: prepared.report.config_fingerprint,
    current_adapter_fingerprints: input.current_adapter_fingerprints,
    base_graph: currentBaseGraph,
    head_graph: currentHeadGraph,
    code_targets: packageValue.code_targets.map((target) => target.requirement_id),
    ...(input.test_index === undefined ? {} : { test_index: input.test_index.artifact }),
    test_execution_evidence: input.test_execution.map((item) => item.artifact),
    qa_evidence: input.qa.map((item) => item.artifact),
    ...(input.semantic_review === undefined
      ? {}
      : {
          semantic_review: {
            manifest: input.semantic_review.manifest.artifact,
            findings: input.semantic_review.findings.map((item) => item.artifact),
            resolutions: input.semantic_review.resolutions.map((item) => item.artifact),
            human_reviews: input.semantic_review.human_reviews.map((item) => item.artifact),
            model_analysis_performed: input.semantic_review.model_analysis_performed,
          },
        }),
  });

  if (
    (packageValue.mode === "spec" || packageValue.mode === "spec-code") &&
    packageValue.object_delta.added.length +
      packageValue.object_delta.modified.length +
      packageValue.object_delta.deleted.length ===
      0
  ) {
    issues.push({ code: "SDD_MERGE_SEMANTIC_DELTA_REQUIRED", disposition: "BLOCKED" });
  }
  if (
    packageValue.mode === "code" &&
    (packageValue.object_delta.added.length > 0 ||
      packageValue.object_delta.modified.length > 0 ||
      packageValue.object_delta.deleted.length > 0 ||
      packageValue.code_targets.length === 0)
  ) {
    issues.push({ code: "SDD_MERGE_CODE_MODE_SUBJECT_INVALID", disposition: "BLOCKED" });
  }

  const scopeFingerprint = projectScopeFingerprint([...currentHeadGraph.objects.keys()]);
  let governanceAssessment: HumanDecisionEvidenceAssessment | undefined;
  if (input.adoption_transition !== undefined) {
    if (input.adoption_transition.to !== input.project.configuration.adoption.mode) {
      issues.push({ code: "SDD_MERGE_ADOPTION_TRANSITION_STALE", disposition: "BLOCKED" });
    }
    governanceAssessment = assessGovernanceEvidence({
      project_id: input.project.configuration.project_id,
      config_fingerprint: prepared.report.config_fingerprint,
      project_scope_fingerprint: scopeFingerprint,
      from_adoption_mode: input.adoption_transition.from,
      to_adoption_mode: input.adoption_transition.to,
      evidence: input.governance.map((item) => item.artifact),
    });
  } else if (input.governance.length > 0) {
    issues.push({ code: "SDD_MERGE_GOVERNANCE_NOT_APPLICABLE", disposition: "BLOCKED" });
  }

  const approvalAssessment: HumanDecisionEvidenceAssessment = {
    state: prepared.issues.some((issue) => issue.code.includes("CONTRADICTORY"))
      ? "contradictory"
      : prepared.issues.some((issue) => /REJECTED/u.test(issue.code))
        ? "negative"
        : prepared.issues.some((issue) => /STALE|UNCONFIGURED/u.test(issue.code))
          ? "stale"
          : prepared.issues.some((issue) => /MISSING/u.test(issue.code))
            ? "missing"
            : "current",
    issues: [],
  };
  const combinedDiagnostics = [
    ...prepared.issues.map(diagnostic),
    ...verification.diagnostics,
    ...issues.map(diagnostic),
    ...(governanceAssessment?.issues.map(diagnostic) ?? []),
  ];
  const diagnostics = [...new Map(combinedDiagnostics.map((item) => [diagnosticKey(item), item])).values()].toSorted(
    (left, right) => compareText(diagnosticKey(left), diagnosticKey(right)),
  );
  const status: ReadinessStatus = diagnostics.some((item) => item.details?.disposition === "BLOCKED")
    ? "BLOCKED"
    : diagnostics.some((item) => item.details?.disposition === "REVIEW_REQUIRED")
      ? "REVIEW_REQUIRED"
      : "PASS";
  const testUnsatisfied = new Set([
    ...verification.test_coverage.unsatisfied,
    ...verification.test_execution.unsatisfied,
  ]).size;
  const qaUnsatisfied = new Set([
    ...verification.manual_verification.unsatisfied,
    ...verification.qa_coverage.unsatisfied,
  ]).size;
  const affectedScopeIsNonEmpty =
    verification.affected_requirements.length > 0 || verification.affected_capabilities.length > 0;
  const allInputs: VersionedMergeInput<{ readonly artifact_type: string }>[] = [
    ...(input.change === undefined ? [] : [input.change]),
    input.package as VersionedMergeInput<{ readonly artifact_type: string }>,
    ...input.approvals,
    ...input.governance,
    ...(input.test_index === undefined ? [] : [input.test_index]),
    ...input.test_execution,
    ...input.qa,
    ...(input.semantic_review === undefined
      ? []
      : [
          input.semantic_review.manifest,
          ...input.semantic_review.findings,
          ...input.semantic_review.resolutions,
          ...input.semantic_review.human_reviews,
        ]),
  ];
  const manifest = allInputs
    .map(inputEntry)
    .toSorted((left, right) =>
      compareText(
        `${left.artifact_type}\0${left.fingerprint}\0${left.source}`,
        `${right.artifact_type}\0${right.fingerprint}\0${right.source}`,
      ),
    );
  return {
    schema_version: "1.0",
    artifact_type: "merge_report",
    project_id: input.project.configuration.project_id,
    integration_ref: integrationRef,
    branch_head: branchHead,
    merge_base: prepared.report.merge_base,
    config_fingerprint: prepared.report.config_fingerprint,
    mode: packageValue.mode,
    deltas_or_code_targets:
      packageValue.mode === "code"
        ? { code_targets: packageValue.code_targets }
        : {
            approved_delta: {
              semantic: packageValue.object_delta.semantic_fingerprint,
              structural: packageValue.object_delta.structural_fingerprint,
            },
          },
    affected_scope: {
      fingerprint: verification.affected_scope_fingerprint,
      requirements: verification.affected_requirements,
      capabilities: verification.affected_capabilities,
    },
    test_summary: summary(
      verification.test_execution.satisfied.length,
      testUnsatisfied,
      verification.diagnostics.some((item) => item.details?.disposition === "BLOCKED" && /TEST/u.test(item.code)),
      affectedScopeIsNonEmpty,
    ),
    qa_summary: summary(
      verification.manual_verification.satisfied.length + verification.qa_coverage.satisfied.length,
      qaUnsatisfied,
      verification.diagnostics.some((item) => item.details?.disposition === "BLOCKED" && /QA|MANUAL/u.test(item.code)),
      affectedScopeIsNonEmpty,
    ),
    findings_and_evidence: {
      findings: verification.findings,
      evidence_status: evidenceState(approvalAssessment, governanceAssessment, diagnostics),
    },
    adoption: { mode: input.project.configuration.adoption.mode, project_scope_fingerprint: scopeFingerprint },
    diagnostics,
    status,
    input_manifest: manifest,
  };
}
