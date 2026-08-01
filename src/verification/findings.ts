import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";

import { isFindingId, isFingerprint, isObjectId, isProjectId } from "../contracts/identifiers.ts";
import type { FindingId, Fingerprint, ObjectId, ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import { EvidenceInputError } from "./evidence.ts";
import type { EvidenceInputLimits } from "./evidence.ts";
import { fingerprintSemanticAnalysisInputManifest } from "./semantic-review.ts";
import type { SemanticAnalysisInputManifest, SemanticCandidate, SemanticNormativeSection } from "./semantic-review.ts";

type ArtifactProvenance = {
  readonly created_at?: string;
  readonly producer?: { readonly name: string; readonly version: string };
};

export type ParsedSemanticAnalysisInputManifest = SemanticAnalysisInputManifest & ArtifactProvenance;

export type Finding = ArtifactProvenance & {
  readonly schema_version: "1.0";
  readonly artifact_type: "finding";
  readonly project_id: ProjectId;
  readonly finding_id: FindingId;
  readonly analyzer: { readonly name: string; readonly version: string };
  readonly kind: "semantic_conflict" | "quality";
  readonly severity: "blocking" | "review";
  readonly input_fingerprint: Fingerprint;
  readonly objects: readonly ObjectId[];
  readonly sections: readonly {
    readonly object_id: ObjectId;
    readonly section: SemanticNormativeSection["section"];
  }[];
  readonly summary: string;
  readonly confidence: number;
  readonly waiver_eligible: boolean;
};

export type FindingResolution = ArtifactProvenance & {
  readonly schema_version: "1.0";
  readonly artifact_type: "finding_resolution";
  readonly project_id: ProjectId;
  readonly issuer: string;
  readonly actor: string;
  readonly finding_id: FindingId;
  readonly input_fingerprint: Fingerprint;
  readonly decision: "dismissed" | "waived" | "confirmed";
  readonly reason: string;
};

export type HumanSemanticReviewEvidence = ArtifactProvenance & {
  readonly schema_version: "1.0";
  readonly artifact_type: "human_semantic_review_evidence";
  readonly project_id: ProjectId;
  readonly issuer: string;
  readonly actor: string;
  readonly decision: "reviewed";
  readonly candidate_input_fingerprint: Fingerprint;
  readonly finding_ids: readonly FindingId[];
};

type UnknownRecord = Record<string, unknown>;
const utcTimestampPattern =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/u;
const sections: readonly SemanticNormativeSection["section"][] = [
  "statement",
  "acceptance",
  "constraints",
  "definition",
  "identity",
  "states",
  "relations",
];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: UnknownRecord, required: readonly string[], optional: readonly string[] = []): boolean {
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
  );
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function sortedUnique(values: readonly string[]): boolean {
  return (
    new Set(values).size === values.length && values.every((value, index) => index === 0 || value > values[index - 1]!)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalIdentity(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(canonicalIdentity);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => compareText(left, right))
        .map(([key, item]) => [key.normalize("NFC"), canonicalIdentity(item)]),
    );
  }
  return value;
}

function validTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = utcTimestampPattern.exec(value);
  if (match === null) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

function provenance(value: UnknownRecord): ArtifactProvenance {
  if (value.created_at !== undefined && !validTimestamp(value.created_at)) invalid("Artifact timestamp is invalid.");
  if (
    value.producer !== undefined &&
    (!isRecord(value.producer) ||
      !exact(value.producer, ["name", "version"]) ||
      !nonEmpty(value.producer.name) ||
      !nonEmpty(value.producer.version))
  ) {
    invalid("Artifact producer is invalid.");
  }
  return {
    ...(value.created_at === undefined ? {} : { created_at: value.created_at as string }),
    ...(value.producer === undefined
      ? {}
      : { producer: { name: value.producer.name as string, version: value.producer.version as string } }),
  };
}

function invalid(message: string): never {
  throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", message);
}

function assertLimits(value: unknown, limits: EvidenceInputLimits, depth = 1): void {
  if (depth > limits.max_nesting_depth) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Artifact nesting exceeds its limit.");
  }
  if (typeof value === "string") {
    if (new TextEncoder().encode(value).byteLength > limits.max_string_bytes) {
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Artifact string exceeds its limit.");
    }
  } else if (Array.isArray(value)) {
    if (value.length > limits.max_array_items) {
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Artifact array exceeds its limit.");
    }
    for (const item of value) assertLimits(item, limits, depth + 1);
  } else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertLimits(key, limits, depth + 1);
      assertLimits(item, limits, depth + 1);
    }
  }
}

function parseJson(bytes: Uint8Array, limits: EvidenceInputLimits): unknown {
  if (
    !Object.values(limits).every((limit) => Number.isSafeInteger(limit) && limit >= 1) ||
    bytes.byteLength > limits.max_artifact_bytes
  ) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Artifact exceeds an input limit.");
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_UTF8_INVALID", "Artifact is not valid UTF-8.", {
      cause: error,
    });
  }
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch (error) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "Artifact is not valid JSON.", { cause: error });
  }
  assertLimits(value, limits);
  return value;
}

function parseAnalyzer(value: unknown): { readonly name: string; readonly version: string } {
  if (!isRecord(value) || !exact(value, ["name", "version"]) || !nonEmpty(value.name) || !nonEmpty(value.version)) {
    invalid("Artifact analyzer is invalid.");
  }
  return { name: value.name, version: value.version };
}

function parseCandidate(value: unknown): SemanticCandidate {
  if (
    !isRecord(value) ||
    !exact(value, ["objects", "reason"]) ||
    !Array.isArray(value.objects) ||
    value.objects.length === 0 ||
    !value.objects.every(isObjectId) ||
    !sortedUnique(value.objects) ||
    !nonEmpty(value.reason)
  ) {
    invalid("Semantic candidate is invalid.");
  }
  return { objects: value.objects, reason: value.reason as SemanticCandidate["reason"] };
}

export function parseSemanticAnalysisInputManifest(
  bytes: Uint8Array,
  limits: EvidenceInputLimits,
): ParsedSemanticAnalysisInputManifest {
  const value = parseJson(bytes, limits);
  if (
    !isRecord(value) ||
    !exact(
      value,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "analyzer",
        "input_fingerprint",
        "changed_objects",
        "related_objects",
        "normative_sections",
        "candidate_reasons",
      ],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "semantic_analysis_input_manifest" ||
    !isProjectId(value.project_id) ||
    !isFingerprint(value.input_fingerprint) ||
    !Array.isArray(value.changed_objects) ||
    !value.changed_objects.every(isObjectId) ||
    !sortedUnique(value.changed_objects) ||
    !Array.isArray(value.related_objects) ||
    !value.related_objects.every(isObjectId) ||
    !sortedUnique(value.related_objects) ||
    value.related_objects.some((id) => new Set(value.changed_objects as ObjectId[]).has(id)) ||
    !Array.isArray(value.normative_sections) ||
    !Array.isArray(value.candidate_reasons)
  ) {
    invalid("SemanticAnalysisInputManifest envelope is invalid.");
  }
  const analyzer = parseAnalyzer(value.analyzer);
  const normativeSections = value.normative_sections.map((item): SemanticNormativeSection => {
    if (
      !isRecord(item) ||
      !exact(item, ["object_id", "section", "content"]) ||
      !isObjectId(item.object_id) ||
      !sections.includes(item.section as SemanticNormativeSection["section"]) ||
      typeof item.content !== "string"
    ) {
      invalid("Semantic manifest section is invalid.");
    }
    return {
      object_id: item.object_id,
      section: item.section as SemanticNormativeSection["section"],
      content: item.content,
    };
  });
  if (!sortedUnique(normativeSections.map((item) => `${item.object_id}\0${item.section}`))) {
    invalid("Semantic manifest sections are not canonical.");
  }
  const candidateReasons = value.candidate_reasons.map(parseCandidate);
  if (!sortedUnique(candidateReasons.map((item) => `${item.objects.join("\0")}\0${item.reason}`))) {
    invalid("Semantic candidates are not canonical.");
  }
  const parsed: ParsedSemanticAnalysisInputManifest = {
    schema_version: "1.0",
    artifact_type: "semantic_analysis_input_manifest",
    project_id: value.project_id,
    ...provenance(value),
    analyzer,
    input_fingerprint: value.input_fingerprint,
    changed_objects: value.changed_objects,
    related_objects: value.related_objects,
    normative_sections: normativeSections,
    candidate_reasons: candidateReasons,
  };
  if (fingerprintSemanticAnalysisInputManifest(parsed) !== parsed.input_fingerprint) {
    invalid("SemanticAnalysisInputManifest fingerprint is stale.");
  }
  return parsed;
}

export function deriveFindingId(input: Omit<Finding, "finding_id" | keyof ArtifactProvenance>): FindingId {
  const canonical = JSON.stringify(
    canonicalIdentity({
      analyzer: input.analyzer,
      input_fingerprint: input.input_fingerprint,
      kind: input.kind,
      objects: input.objects,
      sections: input.sections,
      summary: input.summary,
    }),
  );
  const value: unknown = `FND-${createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 12).toUpperCase()}`;
  if (!isFindingId(value)) throw new Error("Finding ID generation failed.");
  return value;
}

export function parseFinding(bytes: Uint8Array, limits: EvidenceInputLimits): Finding {
  const value = parseJson(bytes, limits);
  if (
    !isRecord(value) ||
    !exact(
      value,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "finding_id",
        "analyzer",
        "kind",
        "severity",
        "input_fingerprint",
        "objects",
        "sections",
        "summary",
        "confidence",
        "waiver_eligible",
      ],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "finding" ||
    !isProjectId(value.project_id) ||
    !isFindingId(value.finding_id) ||
    (value.kind !== "semantic_conflict" && value.kind !== "quality") ||
    (value.severity !== "blocking" && value.severity !== "review") ||
    !isFingerprint(value.input_fingerprint) ||
    !Array.isArray(value.objects) ||
    value.objects.length === 0 ||
    !value.objects.every(isObjectId) ||
    !sortedUnique(value.objects) ||
    !Array.isArray(value.sections) ||
    value.sections.length === 0 ||
    !nonEmpty(value.summary) ||
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    typeof value.waiver_eligible !== "boolean" ||
    (value.kind === "semantic_conflict" && value.waiver_eligible)
  ) {
    invalid("Finding envelope is invalid.");
  }
  const parsedSections = value.sections.map((item): Finding["sections"][number] => {
    if (
      !isRecord(item) ||
      !exact(item, ["object_id", "section"]) ||
      !isObjectId(item.object_id) ||
      !sections.includes(item.section as SemanticNormativeSection["section"])
    )
      invalid("Finding section citation is invalid.");
    return { object_id: item.object_id, section: item.section as SemanticNormativeSection["section"] };
  });
  if (!sortedUnique(parsedSections.map((item) => `${item.object_id}\0${item.section}`))) {
    invalid("Finding section citations are not canonical.");
  }
  return {
    schema_version: "1.0",
    artifact_type: "finding",
    project_id: value.project_id,
    ...provenance(value),
    finding_id: value.finding_id,
    analyzer: parseAnalyzer(value.analyzer),
    kind: value.kind,
    severity: value.severity,
    input_fingerprint: value.input_fingerprint,
    objects: value.objects,
    sections: parsedSections,
    summary: value.summary,
    confidence: value.confidence,
    waiver_eligible: value.waiver_eligible,
  };
}

export function parseFindingResolution(bytes: Uint8Array, limits: EvidenceInputLimits): FindingResolution {
  const value = parseJson(bytes, limits);
  if (
    !isRecord(value) ||
    !exact(
      value,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "issuer",
        "actor",
        "finding_id",
        "input_fingerprint",
        "decision",
        "reason",
      ],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "finding_resolution" ||
    !isProjectId(value.project_id) ||
    !nonEmpty(value.issuer) ||
    !nonEmpty(value.actor) ||
    !isFindingId(value.finding_id) ||
    !isFingerprint(value.input_fingerprint) ||
    (value.decision !== "dismissed" && value.decision !== "waived" && value.decision !== "confirmed") ||
    !nonEmpty(value.reason)
  )
    invalid("FindingResolution envelope is invalid.");
  return {
    schema_version: "1.0",
    artifact_type: "finding_resolution",
    project_id: value.project_id,
    ...provenance(value),
    issuer: value.issuer,
    actor: value.actor,
    finding_id: value.finding_id,
    input_fingerprint: value.input_fingerprint,
    decision: value.decision,
    reason: value.reason,
  };
}

export function parseHumanSemanticReviewEvidence(
  bytes: Uint8Array,
  limits: EvidenceInputLimits,
): HumanSemanticReviewEvidence {
  const value = parseJson(bytes, limits);
  if (
    !isRecord(value) ||
    !exact(
      value,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "issuer",
        "actor",
        "decision",
        "candidate_input_fingerprint",
        "finding_ids",
      ],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "human_semantic_review_evidence" ||
    !isProjectId(value.project_id) ||
    !nonEmpty(value.issuer) ||
    !nonEmpty(value.actor) ||
    value.decision !== "reviewed" ||
    !isFingerprint(value.candidate_input_fingerprint) ||
    !Array.isArray(value.finding_ids) ||
    !value.finding_ids.every(isFindingId) ||
    !sortedUnique(value.finding_ids)
  )
    invalid("HumanSemanticReviewEvidence envelope is invalid.");
  return {
    schema_version: "1.0",
    artifact_type: "human_semantic_review_evidence",
    project_id: value.project_id,
    ...provenance(value),
    issuer: value.issuer,
    actor: value.actor,
    decision: "reviewed",
    candidate_input_fingerprint: value.candidate_input_fingerprint,
    finding_ids: value.finding_ids,
  };
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !path.includes("\0"));
}

async function importArtifact<Value>(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
  parse: (bytes: Uint8Array, limits: EvidenceInputLimits) => Value,
): Promise<Value> {
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realFile = await fileSystem.realPath(resolve(realRoot, ...path.split("/")));
    if (!isWithin(realRoot, realFile))
      throw new EvidenceInputError("SDD_EVIDENCE_FILE_OUT_OF_SCOPE", "Artifact resolves outside the selected project.");
    const metadata = await fileSystem.metadata(realFile);
    if (metadata.kind !== "file")
      throw new EvidenceInputError("SDD_EVIDENCE_FILE_NOT_REGULAR", "Artifact input is not a regular file.");
    if (metadata.size > limits.max_artifact_bytes)
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Artifact exceeds its byte limit.");
    return parse(await fileSystem.readFile(realFile), limits);
  } catch (error) {
    if (error instanceof EvidenceInputError) throw error;
    throw new EvidenceInputError("SDD_EVIDENCE_FILE_READ_FAILED", "Artifact file could not be read.", { cause: error });
  }
}

export const importSemanticAnalysisInputManifestFile = (
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
) => importArtifact(fileSystem, projectRoot, path, limits, parseSemanticAnalysisInputManifest);
export const importFindingFile = (
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
) => importArtifact(fileSystem, projectRoot, path, limits, parseFinding);
export const importFindingResolutionFile = (
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
) => importArtifact(fileSystem, projectRoot, path, limits, parseFindingResolution);
export const importHumanSemanticReviewEvidenceFile = (
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
) => importArtifact(fileSystem, projectRoot, path, limits, parseHumanSemanticReviewEvidence);

export type FindingStateSummary = {
  readonly finding_id: FindingId;
  readonly state: "open" | "resolved" | "stale" | "contradictory";
};
export type FindingAssessmentIssue = {
  readonly code: string;
  readonly disposition: "BLOCKED" | "REVIEW_REQUIRED";
  readonly finding_id?: FindingId;
  readonly issuer?: string;
};
export type FindingAssessment = {
  readonly findings: readonly FindingStateSummary[];
  readonly human_review_state: "not_required" | "current" | "missing" | "stale" | "contradictory";
  readonly issues: readonly FindingAssessmentIssue[];
  readonly semantic_completeness_claimed: false;
};

function sameFinding(left: Finding, right: Finding): boolean {
  return (
    left.project_id === right.project_id &&
    left.finding_id === right.finding_id &&
    JSON.stringify(left.analyzer) === JSON.stringify(right.analyzer) &&
    left.kind === right.kind &&
    left.severity === right.severity &&
    left.input_fingerprint === right.input_fingerprint &&
    JSON.stringify(left.objects) === JSON.stringify(right.objects) &&
    JSON.stringify(left.sections) === JSON.stringify(right.sections) &&
    left.summary === right.summary &&
    left.confidence === right.confidence &&
    left.waiver_eligible === right.waiver_eligible
  );
}

export function sortFindingsForReview(findings: readonly Finding[]): readonly Finding[] {
  return findings.toSorted(
    (left, right) => right.confidence - left.confidence || compareText(left.finding_id, right.finding_id),
  );
}

function findingCitationCurrent(finding: Finding, manifest: ParsedSemanticAnalysisInputManifest): boolean {
  const selected = new Set([...manifest.changed_objects, ...manifest.related_objects]);
  if (!finding.objects.every((id) => selected.has(id))) return false;
  const available = new Set(manifest.normative_sections.map((section) => `${section.object_id}\0${section.section}`));
  return (
    finding.sections.every(
      (section) =>
        finding.objects.includes(section.object_id) && available.has(`${section.object_id}\0${section.section}`),
    ) && finding.objects.every((id) => finding.sections.some((section) => section.object_id === id))
  );
}

function issueKey(issue: FindingAssessmentIssue): string {
  return [issue.disposition, issue.code, issue.finding_id ?? "", issue.issuer ?? ""].join("\0");
}

export function assessFindings(input: {
  readonly manifest: ParsedSemanticAnalysisInputManifest;
  readonly findings: readonly Finding[];
  readonly resolutions: readonly FindingResolution[];
  readonly human_reviews: readonly HumanSemanticReviewEvidence[];
  readonly allowed_issuers: ReadonlySet<string>;
  readonly model_analysis_performed: boolean;
}): FindingAssessment {
  const issues: FindingAssessmentIssue[] = [];
  const summaries: FindingStateSummary[] = [];
  const byId = new Map<FindingId, Finding[]>();
  for (const finding of input.findings)
    byId.set(finding.finding_id, [...(byId.get(finding.finding_id) ?? []), finding]);

  for (const [findingId, occurrences] of byId) {
    const finding = occurrences[0]!;
    if (occurrences.some((candidate) => !sameFinding(finding, candidate))) {
      summaries.push({ finding_id: findingId, state: "contradictory" });
      issues.push({ code: "SDD_FINDING_CONTRADICTORY", disposition: "BLOCKED", finding_id: findingId });
      continue;
    }
    if (
      finding.project_id !== input.manifest.project_id ||
      finding.analyzer.name !== input.manifest.analyzer.name ||
      finding.analyzer.version !== input.manifest.analyzer.version ||
      finding.input_fingerprint !== input.manifest.input_fingerprint
    ) {
      summaries.push({ finding_id: findingId, state: "stale" });
      issues.push({ code: "SDD_FINDING_SUBJECT_STALE", disposition: "BLOCKED", finding_id: findingId });
      continue;
    }
    if (deriveFindingId(finding) !== finding.finding_id || !findingCitationCurrent(finding, input.manifest)) {
      summaries.push({ finding_id: findingId, state: "contradictory" });
      issues.push({ code: "SDD_FINDING_ID_OR_CITATION_INVALID", disposition: "BLOCKED", finding_id: findingId });
      continue;
    }
    const matching: FindingResolution[] = [];
    let staleResolution = false;
    for (const resolution of input.resolutions.filter((item) => item.finding_id === findingId)) {
      if (!input.allowed_issuers.has(resolution.issuer)) {
        staleResolution = true;
        issues.push({
          code: "SDD_FINDING_RESOLUTION_ISSUER_UNCONFIGURED",
          disposition: "BLOCKED",
          finding_id: findingId,
          issuer: resolution.issuer,
        });
      } else if (
        resolution.project_id !== input.manifest.project_id ||
        resolution.input_fingerprint !== finding.input_fingerprint
      ) {
        staleResolution = true;
        issues.push({
          code: "SDD_FINDING_RESOLUTION_STALE",
          disposition: "BLOCKED",
          finding_id: findingId,
          issuer: resolution.issuer,
        });
      } else matching.push(resolution);
    }
    if (staleResolution) {
      summaries.push({ finding_id: findingId, state: "stale" });
      continue;
    }
    const decisions = new Set(matching.map((resolution) => resolution.decision));
    if (decisions.size > 1) {
      summaries.push({ finding_id: findingId, state: "contradictory" });
      issues.push({ code: "SDD_FINDING_RESOLUTION_CONTRADICTORY", disposition: "BLOCKED", finding_id: findingId });
    } else if (decisions.has("confirmed")) {
      summaries.push({ finding_id: findingId, state: "open" });
      issues.push({ code: "SDD_FINDING_CONFIRMED", disposition: "BLOCKED", finding_id: findingId });
    } else if (decisions.has("waived") && (finding.kind === "semantic_conflict" || !finding.waiver_eligible)) {
      summaries.push({ finding_id: findingId, state: "contradictory" });
      issues.push({ code: "SDD_FINDING_WAIVER_INELIGIBLE", disposition: "BLOCKED", finding_id: findingId });
    } else if (decisions.has("dismissed") || decisions.has("waived")) {
      summaries.push({ finding_id: findingId, state: "resolved" });
    } else {
      summaries.push({ finding_id: findingId, state: "open" });
      issues.push({ code: "SDD_FINDING_RESOLUTION_MISSING", disposition: "REVIEW_REQUIRED", finding_id: findingId });
    }
  }

  for (const resolution of input.resolutions.filter((item) => !byId.has(item.finding_id))) {
    issues.push({
      code: "SDD_FINDING_RESOLUTION_STALE",
      disposition: "BLOCKED",
      finding_id: resolution.finding_id,
      issuer: resolution.issuer,
    });
  }

  const currentFindingIds = summaries
    .filter((item) => item.state !== "stale")
    .map((item) => item.finding_id)
    .toSorted();
  const currentReviews: HumanSemanticReviewEvidence[] = [];
  let staleReview = false;
  for (const review of input.human_reviews) {
    if (
      !input.allowed_issuers.has(review.issuer) ||
      review.project_id !== input.manifest.project_id ||
      review.candidate_input_fingerprint !== input.manifest.input_fingerprint
    ) {
      staleReview = true;
      issues.push({ code: "SDD_HUMAN_SEMANTIC_REVIEW_STALE", disposition: "BLOCKED", issuer: review.issuer });
    } else if (
      review.finding_ids.some((id) => !currentFindingIds.includes(id)) ||
      (!input.model_analysis_performed && review.finding_ids.join("\0") !== currentFindingIds.join("\0"))
    ) {
      staleReview = true;
      issues.push({ code: "SDD_HUMAN_SEMANTIC_REVIEW_FINDING_UNKNOWN", disposition: "BLOCKED", issuer: review.issuer });
    } else currentReviews.push(review);
  }
  const reviewSubjects = new Set(currentReviews.map((review) => review.finding_ids.join("\0")));
  let humanReviewState: FindingAssessment["human_review_state"];
  if (reviewSubjects.size > 1) {
    humanReviewState = "contradictory";
    issues.push({ code: "SDD_HUMAN_SEMANTIC_REVIEW_CONTRADICTORY", disposition: "BLOCKED" });
  } else if (staleReview) humanReviewState = "stale";
  else if (currentReviews.length > 0) humanReviewState = "current";
  else if (input.model_analysis_performed) humanReviewState = "not_required";
  else {
    humanReviewState = "missing";
    issues.push({ code: "SDD_SEMANTIC_REVIEW_REQUIRED", disposition: "REVIEW_REQUIRED" });
  }

  return {
    findings: summaries.toSorted((left, right) => compareText(left.finding_id, right.finding_id)),
    human_review_state: humanReviewState,
    issues: [...new Map(issues.map((issue) => [issueKey(issue), issue])).values()].toSorted((left, right) =>
      compareText(issueKey(left), issueKey(right)),
    ),
    semantic_completeness_claimed: false,
  };
}
