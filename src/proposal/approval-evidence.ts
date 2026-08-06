import type { ProjectId } from "../contracts/identifiers.ts";
import type { ApprovalEvidence } from "../verification/evidence.ts";
import type { ProposalPackage } from "./validate-proposal.ts";

const encoder = new TextEncoder();
export const MAX_APPROVAL_TEXT_BYTES = 256 * 1024;
export const MAX_APPROVAL_EVIDENCE_BYTES = 1024 * 1024;

export class ApprovalEvidenceRecordError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApprovalEvidenceRecordError";
    this.code = code;
  }
}

function requiredBoundedText(value: unknown, field: "issuer" | "actor" | "reason"): asserts value is string {
  if (typeof value !== "string" || value.length === 0)
    throw new ApprovalEvidenceRecordError(
      `SDD_APPROVAL_${field.toUpperCase()}_INVALID`,
      `The approval ${field} is invalid.`,
    );
  if (encoder.encode(value).byteLength > MAX_APPROVAL_TEXT_BYTES)
    throw new ApprovalEvidenceRecordError(
      `SDD_APPROVAL_${field.toUpperCase()}_LIMIT_EXCEEDED`,
      `The approval ${field} exceeds its byte limit.`,
    );
}

export function createApprovalEvidence(input: {
  readonly projectId: ProjectId;
  readonly package: ProposalPackage;
  readonly allowedIssuers: ReadonlySet<string>;
  readonly issuer: unknown;
  readonly actor: unknown;
  readonly decision: unknown;
  readonly reason: unknown;
  readonly producer: { readonly name: string; readonly version: string };
}): ApprovalEvidence {
  requiredBoundedText(input.issuer, "issuer");
  requiredBoundedText(input.actor, "actor");
  requiredBoundedText(input.reason, "reason");
  if (!input.allowedIssuers.has(input.issuer))
    throw new ApprovalEvidenceRecordError(
      "SDD_APPROVAL_ISSUER_UNCONFIGURED",
      "The approval issuer is not configured for the selected project.",
    );
  if (input.decision !== "approved" && input.decision !== "rejected")
    throw new ApprovalEvidenceRecordError(
      "SDD_APPROVAL_DECISION_INVALID",
      "The approval decision must be approved or rejected.",
    );
  if (input.package.project_id !== input.projectId)
    throw new ApprovalEvidenceRecordError(
      "SDD_APPROVAL_PACKAGE_PROJECT_MISMATCH",
      "The revalidated package belongs to another project.",
    );
  return {
    schema_version: "1.0",
    artifact_type: "approval_evidence",
    project_id: input.projectId,
    producer: input.producer,
    issuer: input.issuer,
    actor: input.actor,
    decision: input.decision,
    mode: input.package.mode,
    subject: {
      base_ref: input.package.base.git_ref,
      semantic_delta_fingerprint: input.package.object_delta.semantic_fingerprint,
      structural_delta_fingerprint: input.package.object_delta.structural_fingerprint,
    },
    reason: input.reason,
  };
}

export function serializeApprovalEvidence(value: ApprovalEvidence): Uint8Array {
  const bytes = encoder.encode(`${JSON.stringify(value)}\n`);
  if (bytes.byteLength > MAX_APPROVAL_EVIDENCE_BYTES)
    throw new ApprovalEvidenceRecordError(
      "SDD_APPROVAL_ARTIFACT_LIMIT_EXCEEDED",
      "The serialized ApprovalEvidence exceeds its byte limit.",
    );
  return bytes;
}
