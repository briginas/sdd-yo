import type { Diagnostic } from "../contracts/diagnostics.ts";
import type { CapabilityId, Fingerprint, GitObjectId, ProjectId, RequirementId } from "../contracts/identifiers.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import type { TestIndex } from "../tests/test-index.ts";
import { computeAffectedScope } from "./affected-scope.ts";
import { assessVerificationEvidence } from "./evidence.ts";
import type { QaEvidence, TestExecutionEvidence, VerificationEvidenceIssue } from "./evidence.ts";
import { assessFindings } from "./findings.ts";
import type {
  Finding,
  FindingAssessmentIssue,
  FindingResolution,
  FindingStateSummary,
  HumanSemanticReviewEvidence,
  ParsedSemanticAnalysisInputManifest,
} from "./findings.ts";

export type ReadinessStatus = "PASS" | "REVIEW_REQUIRED" | "BLOCKED";

type Check<Id extends string> = { readonly satisfied: readonly Id[]; readonly unsatisfied: readonly Id[] };

export type VerificationReport = {
  readonly schema_version: "1.0";
  readonly artifact_type: "verification_report";
  readonly project_id: ProjectId;
  readonly head_ref: GitObjectId;
  readonly integration_ref: GitObjectId;
  readonly config_fingerprint: Fingerprint;
  readonly affected_scope_fingerprint: Fingerprint;
  readonly affected_requirements: readonly RequirementId[];
  readonly affected_capabilities: readonly CapabilityId[];
  readonly test_coverage: Check<RequirementId>;
  readonly test_execution: Check<RequirementId>;
  readonly manual_verification: Check<RequirementId>;
  readonly qa_coverage: Check<CapabilityId>;
  readonly findings: readonly FindingStateSummary[];
  readonly status: ReadinessStatus;
  readonly diagnostics: readonly Diagnostic[];
};

type GateIssue =
  | VerificationEvidenceIssue
  | FindingAssessmentIssue
  | {
      readonly code: "SDD_EVIDENCE_TEST_INDEX_MISSING" | "SDD_SEMANTIC_REVIEW_REQUIRED";
      readonly disposition: "BLOCKED" | "REVIEW_REQUIRED";
    };

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function diagnostic(issue: GateIssue): Diagnostic {
  const objectId = "object_id" in issue ? issue.object_id : undefined;
  const details = {
    disposition: issue.disposition,
    ...("artifact_type" in issue && issue.artifact_type !== undefined ? { artifact_type: issue.artifact_type } : {}),
    ...("issuer" in issue && issue.issuer !== undefined ? { issuer: issue.issuer } : {}),
    ...("test_ref" in issue && issue.test_ref !== undefined ? { test_ref: issue.test_ref } : {}),
    ...("finding_id" in issue && issue.finding_id !== undefined ? { finding_id: issue.finding_id } : {}),
  };
  return {
    code: issue.code as Diagnostic["code"],
    severity: "error",
    message: `Verification condition ${issue.code} is not satisfied.`,
    ...(objectId === undefined ? {} : { object_id: objectId }),
    details,
  };
}

function diagnosticKey(value: Diagnostic): string {
  return [value.code, value.object_id ?? "", JSON.stringify(value.details ?? {})].join("\0");
}

export function buildVerificationReport(input: {
  readonly project_id: ProjectId;
  readonly head_ref: GitObjectId;
  readonly integration_ref: GitObjectId;
  readonly config_fingerprint: Fingerprint;
  readonly current_adapter_fingerprints: Readonly<Record<string, Fingerprint>>;
  readonly base_graph: ValidatedSpecificationGraph;
  readonly head_graph: ValidatedSpecificationGraph;
  readonly code_targets?: readonly RequirementId[];
  readonly test_index?: TestIndex;
  readonly test_execution_evidence: readonly TestExecutionEvidence[];
  readonly qa_evidence: readonly QaEvidence[];
  readonly semantic_review?: {
    readonly manifest: ParsedSemanticAnalysisInputManifest;
    readonly findings: readonly Finding[];
    readonly resolutions: readonly FindingResolution[];
    readonly human_reviews: readonly HumanSemanticReviewEvidence[];
    readonly model_analysis_performed: boolean;
  };
}): VerificationReport {
  const scope = computeAffectedScope({
    before: input.base_graph,
    after: input.head_graph,
    ...(input.code_targets === undefined ? {} : { code_targets: input.code_targets }),
  });
  const issues: GateIssue[] = [];
  const testIndex: TestIndex = input.test_index ?? {
    schema_version: "1.0",
    artifact_type: "test_index",
    project_id: input.project_id,
    subject: {
      head_ref: input.head_ref,
      config_fingerprint: input.config_fingerprint,
      adapter_fingerprints: input.current_adapter_fingerprints,
    },
    tests: [],
  };
  if (input.test_index === undefined) {
    issues.push({ code: "SDD_EVIDENCE_TEST_INDEX_MISSING", disposition: "BLOCKED" });
  }
  const evidence = assessVerificationEvidence({
    project_id: input.project_id,
    head_ref: input.head_ref,
    integration_ref: input.integration_ref,
    config_fingerprint: input.config_fingerprint,
    current_adapter_fingerprints: input.current_adapter_fingerprints,
    graph: input.head_graph,
    scope,
    test_index: testIndex,
    test_execution_evidence: input.test_execution_evidence,
    qa_evidence: input.qa_evidence,
  });
  issues.push(...evidence.issues);

  let findings: readonly FindingStateSummary[] = [];
  if (input.semantic_review === undefined) {
    issues.push({ code: "SDD_SEMANTIC_REVIEW_REQUIRED", disposition: "REVIEW_REQUIRED" });
  } else {
    const assessed = assessFindings({
      manifest: input.semantic_review.manifest,
      findings: input.semantic_review.findings,
      resolutions: input.semantic_review.resolutions,
      human_reviews: input.semantic_review.human_reviews,
      model_analysis_performed: input.semantic_review.model_analysis_performed,
    });
    findings = assessed.findings;
    issues.push(...assessed.issues);
  }

  const status: ReadinessStatus = issues.some((issue) => issue.disposition === "BLOCKED")
    ? "BLOCKED"
    : issues.some((issue) => issue.disposition === "REVIEW_REQUIRED")
      ? "REVIEW_REQUIRED"
      : "PASS";
  const diagnostics = [...new Map(issues.map(diagnostic).map((item) => [diagnosticKey(item), item])).values()].toSorted(
    (left, right) => compareText(diagnosticKey(left), diagnosticKey(right)),
  );
  return {
    schema_version: "1.0",
    artifact_type: "verification_report",
    project_id: input.project_id,
    head_ref: input.head_ref,
    integration_ref: input.integration_ref,
    config_fingerprint: input.config_fingerprint,
    affected_scope_fingerprint: scope.fingerprint,
    affected_requirements: scope.affected_requirements,
    affected_capabilities: scope.affected_capabilities,
    test_coverage: evidence.test_coverage,
    test_execution: evidence.test_execution,
    manual_verification: evidence.manual_verification,
    qa_coverage: evidence.qa_coverage,
    findings,
    status,
    diagnostics,
  };
}
