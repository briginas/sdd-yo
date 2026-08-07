import { createHash } from "node:crypto";

import type { ResolvedProject } from "../config/types.ts";
import type { Fingerprint, GitObjectId, ObjectId, ProjectPath } from "../contracts/identifiers.ts";
import { isFingerprint } from "../contracts/identifiers.ts";
import { computeGraphObjectDelta } from "../fingerprint/object-delta.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import { assessApprovalEvidence } from "../verification/evidence.ts";
import type { ApprovalEvidence, HumanDecisionEvidenceIssue } from "../verification/evidence.ts";
import { generateSemanticCandidates } from "../verification/semantic-review.ts";
import type { SemanticCandidate } from "../verification/semantic-review.ts";
import { parseProposalPackage } from "./package-input.ts";
import { buildSpecificationTree, compareUnicodeCodePoints, loadBaseSpecificationTree } from "./specification-tree.ts";
import type { SpecificationTree, SpecificationTreeFile } from "./specification-tree.ts";
import type { ProposalPackage } from "./validate-proposal.ts";
import { ProposalRevalidationError, revalidateProposalPackage } from "./revalidate-proposal.ts";

export type MechanicalConflictKind = "add_add" | "modify_modify" | "modify_delete" | "delete_modify" | "id_reuse";

export type MechanicalConflict = {
  readonly path: ProjectPath;
  readonly kind: MechanicalConflictKind;
  readonly object_id?: ObjectId;
};

export type ConflictReport = {
  readonly schema_version: "1.0";
  readonly artifact_type: "conflict_report";
  readonly project_id: string;
  readonly integration_ref: GitObjectId;
  readonly branch_head: GitObjectId;
  readonly merge_base: GitObjectId;
  readonly config_fingerprint: Fingerprint;
  readonly mechanical_conflicts: readonly MechanicalConflict[];
  readonly semantic_candidates: readonly SemanticCandidate[];
  readonly input_fingerprint: Fingerprint;
};

export type PreparedProposal = {
  readonly report: ConflictReport;
  readonly integration_tree: SpecificationTree;
  readonly prepared_tree?: SpecificationTree;
  readonly affected_object_changed: boolean;
};

export type PreparationGateIssue =
  | HumanDecisionEvidenceIssue
  | {
      readonly code:
        | "SDD_PREPARE_AFFECTED_OBJECT_CHANGED"
        | "SDD_PREPARE_ID_REUSE_BLOCKED"
        | "SDD_PREPARE_MECHANICAL_CONFLICT";
      readonly disposition: "BLOCKED" | "REVIEW_REQUIRED";
    };

export type ApprovedPreparedProposal = PreparedProposal & {
  readonly status: "ok" | "review_required" | "blocked";
  readonly issues: readonly PreparationGateIssue[];
};

export class ProposalPreparationError extends ProposalRevalidationError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ProposalPreparationError";
  }
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return typeof value === "string" ? value.normalize("NFC") : value;
}

function fingerprintInput(value: unknown): Fingerprint {
  const result = `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)), "utf8")
    .digest("hex")}`;
  if (!isFingerprint(result)) throw new Error("Input fingerprint generation failed.");
  return result;
}

function hashContent(content_utf8: string): Fingerprint {
  const value = `sha256:${createHash("sha256").update(content_utf8, "utf8").digest("hex")}`;
  if (!isFingerprint(value)) throw new Error("Content fingerprint generation failed.");
  return value;
}

function filesByPath(tree: SpecificationTree): ReadonlyMap<ProjectPath, SpecificationTreeFile> {
  return new Map(tree.files.map((file) => [file.path, file]));
}

type Hunk = { readonly start: number; readonly end: number; readonly replacement: readonly string[] };

function lines(value: string): readonly string[] {
  if (value.length === 0) return [];
  return value.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
}

function changeHunks(base: readonly string[], target: readonly string[]): readonly Hunk[] {
  if (base.join("") === target.join("")) return [];
  const cells = (base.length + 1) * (target.length + 1);
  if (cells > 4_000_000) return [{ start: 0, end: base.length, replacement: target }];
  const width = target.length + 1;
  const table = new Uint32Array((base.length + 1) * width);
  for (let left = base.length - 1; left >= 0; left -= 1) {
    for (let right = target.length - 1; right >= 0; right -= 1) {
      table[left * width + right] =
        base[left] === target[right]
          ? table[(left + 1) * width + right + 1]! + 1
          : Math.max(table[(left + 1) * width + right]!, table[left * width + right + 1]!);
    }
  }
  const hunks: Hunk[] = [];
  let left = 0;
  let right = 0;
  let start: number | undefined;
  let end = 0;
  let replacement: string[] = [];
  const flush = () => {
    if (start === undefined) return;
    hunks.push({ start, end, replacement });
    start = undefined;
    replacement = [];
  };
  while (left < base.length || right < target.length) {
    if (left < base.length && right < target.length && base[left] === target[right]) {
      flush();
      left += 1;
      right += 1;
    } else if (
      right < target.length &&
      (left === base.length || table[left * width + right + 1]! >= table[(left + 1) * width + right]!)
    ) {
      start ??= left;
      end = Math.max(end, left);
      replacement.push(target[right]!);
      right += 1;
    } else {
      start ??= left;
      left += 1;
      end = left;
    }
  }
  flush();
  return hunks;
}

function overlaps(left: Hunk, right: Hunk): boolean {
  if (left.start === left.end && right.start === right.end) return left.start === right.start;
  if (left.start === left.end) return left.start > right.start && left.start < right.end;
  if (right.start === right.end) return right.start > left.start && right.start < left.end;
  return left.start < right.end && right.start < left.end;
}

function sameHunk(left: Hunk, right: Hunk): boolean {
  return (
    left.start === right.start && left.end === right.end && left.replacement.join("") === right.replacement.join("")
  );
}

function mergeModifiedText(base: string, proposed: string, integration: string): string | undefined {
  if (proposed === integration) return proposed;
  if (proposed === base) return integration;
  if (integration === base) return proposed;
  const baseLines = lines(base);
  const proposedHunks = changeHunks(baseLines, lines(proposed));
  const integrationHunks = changeHunks(baseLines, lines(integration));
  for (const left of proposedHunks) {
    for (const right of integrationHunks) {
      if (overlaps(left, right) && !sameHunk(left, right)) return undefined;
    }
  }
  const hunks = [...proposedHunks];
  for (const hunk of integrationHunks) if (!hunks.some((candidate) => sameHunk(candidate, hunk))) hunks.push(hunk);
  const result = [...baseLines];
  for (const hunk of hunks.toSorted((left, right) => right.start - left.start || right.end - left.end)) {
    result.splice(hunk.start, hunk.end - hunk.start, ...hunk.replacement);
  }
  return result.join("");
}

function conflictKind(
  base: SpecificationTreeFile | undefined,
  proposed: SpecificationTreeFile | undefined,
  other: SpecificationTreeFile | undefined,
): MechanicalConflictKind {
  if (base === undefined) return "add_add";
  if (proposed === undefined) return "delete_modify";
  if (other === undefined) return "modify_delete";
  return "modify_modify";
}

export function mergeSpecificationTrees(
  base: SpecificationTree,
  proposed: SpecificationTree,
  integration: SpecificationTree,
): { readonly files: readonly SpecificationTreeFile[]; readonly conflicts: readonly MechanicalConflict[] } {
  const b = filesByPath(base);
  const p = filesByPath(proposed);
  const m = filesByPath(integration);
  const paths = [...new Set([...b.keys(), ...p.keys(), ...m.keys()])].toSorted(compareUnicodeCodePoints);
  const files: SpecificationTreeFile[] = [];
  const conflicts: MechanicalConflict[] = [];
  for (const path of paths) {
    const before = b.get(path);
    const after = p.get(path);
    const current = m.get(path);
    const proposedChanged = before?.sha256 !== after?.sha256;
    const integrationChanged = before?.sha256 !== current?.sha256;
    if (!proposedChanged) {
      if (current !== undefined) files.push(current);
      continue;
    }
    if (!integrationChanged) {
      if (after !== undefined) files.push(after);
      continue;
    }
    if (after?.sha256 === current?.sha256) {
      if (after !== undefined) files.push(after);
      continue;
    }
    if (before !== undefined && after !== undefined && current !== undefined) {
      const merged = mergeModifiedText(before.content_utf8, after.content_utf8, current.content_utf8);
      if (merged !== undefined) {
        files.push({ path, content_utf8: merged, sha256: hashContent(merged) });
        continue;
      }
    }
    conflicts.push({ path, kind: conflictKind(before, after, current) });
  }
  return { files, conflicts };
}

function driftConflicts(
  base: SpecificationTree,
  proposed: SpecificationTree,
  branch: SpecificationTree,
): readonly MechanicalConflict[] {
  const b = filesByPath(base);
  const p = filesByPath(proposed);
  const h = filesByPath(branch);
  const conflicts: MechanicalConflict[] = [];
  for (const path of [...new Set([...p.keys(), ...h.keys()])].toSorted(compareUnicodeCodePoints)) {
    const proposed = p.get(path);
    const head = h.get(path);
    if (proposed?.sha256 === head?.sha256) continue;
    conflicts.push({ path, kind: conflictKind(b.get(path), proposed, head) });
  }
  return conflicts;
}

function owningPath(graph: ValidatedSpecificationGraph, id: ObjectId): ProjectPath | undefined {
  for (const document of graph.documents.values()) {
    if ((document.type === "capability" || document.type === "concept") && document.id === id) return document.path;
    if (
      (document.type === "capability" || document.type === "capability-fragment") &&
      document.requirements.some((requirement) => requirement.id === id)
    )
      return document.path;
  }
  return undefined;
}

function compareConflicts(left: MechanicalConflict, right: MechanicalConflict): number {
  const pathOrder = compareUnicodeCodePoints(left.path, right.path);
  return pathOrder !== 0
    ? pathOrder
    : left.kind < right.kind
      ? -1
      : left.kind > right.kind
        ? 1
        : (left.object_id ?? "") < (right.object_id ?? "")
          ? -1
          : (left.object_id ?? "") > (right.object_id ?? "")
            ? 1
            : 0;
}

function uniqueConflicts(values: readonly MechanicalConflict[]): readonly MechanicalConflict[] {
  const map = new Map(values.map((value) => [`${value.path}\0${value.kind}\0${value.object_id ?? ""}`, value]));
  return [...map.values()].toSorted(compareConflicts);
}

export async function prepareProposal(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly package: unknown;
  readonly candidatePath: string;
  readonly branchHead: GitObjectId;
  readonly integrationRef: GitObjectId;
  readonly afterCandidateRevalidation?: () => Promise<void>;
}): Promise<PreparedProposal> {
  let revalidated;
  try {
    revalidated = await revalidateProposalPackage(input);
  } catch (error) {
    if (error instanceof ProposalRevalidationError) throw new ProposalPreparationError(error.code, error.message);
    throw error;
  }
  const packageValue = revalidated.package;
  const base = revalidated.base;
  const candidate = revalidated.candidate;
  const [branch, integration, mergeBase] = await Promise.all([
    loadBaseSpecificationTree(input.gitReader, input.branchHead, input.project),
    loadBaseSpecificationTree(input.gitReader, input.integrationRef, input.project),
    input.gitReader.findMergeBase(input.branchHead, input.integrationRef),
  ]);
  if (mergeBase === undefined)
    throw new ProposalPreparationError(
      "SDD_PREPARE_MERGE_BASE_MISSING",
      "Branch head and integration have no merge base.",
    );
  const merged = mergeSpecificationTrees(base, candidate, integration);
  const idReuse: MechanicalConflict[] = [];
  for (const id of packageValue.object_delta.added) {
    if (!base.graph.objects.has(id) && integration.graph.objects.has(id)) {
      const path = owningPath(candidate.graph, id) ?? owningPath(integration.graph, id);
      if (path !== undefined) idReuse.push({ path, kind: "id_reuse", object_id: id });
    }
  }
  const conflicts = uniqueConflicts([...merged.conflicts, ...driftConflicts(base, candidate, branch), ...idReuse]);
  const integrationDelta = computeGraphObjectDelta(base.graph, integration.graph);
  const integrationChanged = new Set(
    [...integrationDelta.semantic.entries, ...integrationDelta.structural.entries].map((entry) => entry.id),
  );
  const affectedObjects = new Set<ObjectId>([
    ...packageValue.affected_scope.requirements,
    ...packageValue.affected_scope.capabilities,
    ...packageValue.object_delta.added,
    ...packageValue.object_delta.modified,
    ...packageValue.object_delta.deleted,
  ]);
  const affectedObjectChanged = [...integrationChanged].some((id) => affectedObjects.has(id));
  const configFingerprint = fingerprintInput(input.project.configuration);
  const inputFingerprint = fingerprintInput({
    canonicalization_version: "1",
    package: packageValue,
    candidate_tree_fingerprint: candidate.fingerprint,
    branch_head: input.branchHead,
    integration_ref: input.integrationRef,
    merge_base: mergeBase,
    config_fingerprint: configFingerprint,
  });
  const report: ConflictReport = {
    schema_version: "1.0",
    artifact_type: "conflict_report",
    project_id: input.project.configuration.project_id,
    integration_ref: input.integrationRef,
    branch_head: input.branchHead,
    merge_base: mergeBase,
    config_fingerprint: configFingerprint,
    mechanical_conflicts: conflicts,
    semantic_candidates: generateSemanticCandidates({
      base: base.graph,
      candidate: candidate.graph,
      comparison: integration.graph,
    }),
    input_fingerprint: inputFingerprint,
  };
  if (conflicts.length > 0)
    return { report, integration_tree: integration, affected_object_changed: affectedObjectChanged };
  try {
    return {
      report,
      integration_tree: integration,
      prepared_tree: buildSpecificationTree(merged.files, input.project.configuration),
      affected_object_changed: affectedObjectChanged,
    };
  } catch {
    throw new ProposalPreparationError(
      "SDD_PREPARE_RESULT_GRAPH_INVALID",
      "The mechanically merged specification tree is invalid.",
    );
  }
}

function approvalEvidenceKey(value: ApprovalEvidence): string {
  return JSON.stringify(canonicalValue(value));
}

export async function prepareApprovedProposal(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly package: unknown;
  readonly candidatePath: string;
  readonly branchHead: GitObjectId;
  readonly integrationRef: GitObjectId;
  readonly approvalEvidence: readonly ApprovalEvidence[];
}): Promise<ApprovedPreparedProposal> {
  const packageValue = parseProposalPackage(input.package);
  const prepared = await prepareProposal(input);
  const approval = assessApprovalEvidence({
    project_id: input.project.configuration.project_id,
    mode: packageValue.mode,
    base_ref: packageValue.base.git_ref,
    semantic_delta_fingerprint: packageValue.object_delta.semantic_fingerprint,
    structural_delta_fingerprint: packageValue.object_delta.structural_fingerprint,
    evidence: input.approvalEvidence,
  });
  const issues: PreparationGateIssue[] = [...approval.issues];
  if (prepared.report.mechanical_conflicts.some((conflict) => conflict.kind === "id_reuse")) {
    issues.push({ code: "SDD_PREPARE_ID_REUSE_BLOCKED", disposition: "BLOCKED" });
  } else if (prepared.report.mechanical_conflicts.length > 0) {
    issues.push({ code: "SDD_PREPARE_MECHANICAL_CONFLICT", disposition: "REVIEW_REQUIRED" });
  }
  if (prepared.affected_object_changed) {
    issues.push({ code: "SDD_PREPARE_AFFECTED_OBJECT_CHANGED", disposition: "REVIEW_REQUIRED" });
  }
  const status = issues.some((issue) => issue.disposition === "BLOCKED")
    ? "blocked"
    : issues.some((issue) => issue.disposition === "REVIEW_REQUIRED")
      ? "review_required"
      : "ok";
  const report = {
    ...prepared.report,
    input_fingerprint: fingerprintInput({
      canonicalization_version: "1",
      mechanical_input_fingerprint: prepared.report.input_fingerprint,
      approval_evidence: input.approvalEvidence.toSorted((left, right) =>
        approvalEvidenceKey(left) < approvalEvidenceKey(right)
          ? -1
          : approvalEvidenceKey(left) > approvalEvidenceKey(right)
            ? 1
            : 0,
      ),
    }),
  };
  if (status === "ok") return { ...prepared, report, status, issues };
  const { prepared_tree: _preparedTree, ...withoutPreparedTree } = prepared;
  return { ...withoutPreparedTree, report, status, issues };
}
