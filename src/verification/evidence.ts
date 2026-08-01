import {
  isCapabilityId,
  isFingerprint,
  isGitObjectId,
  isProjectId,
  isRequirementId,
} from "../contracts/identifiers.ts";
import type {
  CapabilityId,
  Fingerprint,
  GitObjectId,
  ObjectId,
  ProjectId,
  RequirementId,
} from "../contracts/identifiers.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import { relative, resolve } from "node:path";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { TestIndex } from "../tests/test-index.ts";
import { fingerprintTestInput } from "../tests/test-index.ts";
import type { AffectedScope } from "./affected-scope.ts";

const testRefPattern = /^[a-z][a-z0-9-]{0,31}:.+$/u;
const utcTimestampPattern =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/u;

export type EvidenceInputLimits = {
  readonly max_artifact_bytes: number;
  readonly max_array_items: number;
  readonly max_string_bytes: number;
  readonly max_nesting_depth: number;
};

type ArtifactProvenance = {
  readonly created_at?: string;
  readonly producer?: { readonly name: string; readonly version: string };
};

export type TestExecutionStatus = "passed" | "failed" | "skipped" | "todo" | "disabled" | "xfailed" | "error";

export type TestExecutionEvidence = ArtifactProvenance & {
  readonly schema_version: "1.0";
  readonly artifact_type: "test_execution_evidence";
  readonly project_id: ProjectId;
  readonly issuer: string;
  readonly subject: {
    readonly head_ref: GitObjectId;
    readonly test_index_fingerprint: Fingerprint;
    readonly config_fingerprint: Fingerprint;
  };
  readonly results: readonly {
    readonly test_ref: string;
    readonly status: TestExecutionStatus;
    readonly duration_ms?: number;
  }[];
};

export type QaEvidence = ArtifactProvenance & {
  readonly schema_version: "1.0";
  readonly artifact_type: "qa_evidence";
  readonly project_id: ProjectId;
  readonly issuer: string;
  readonly actor: string;
  readonly decision: "passed" | "failed";
  readonly subject: {
    readonly head_ref: GitObjectId;
    readonly integration_ref: GitObjectId;
    readonly affected_scope_fingerprint: Fingerprint;
  };
  readonly capability_ids: readonly CapabilityId[];
  readonly manual_requirements: readonly {
    readonly requirement_id: RequirementId;
    readonly decision: "passed" | "failed";
  }[];
  readonly notes?: string;
};

export class EvidenceInputError extends Error {
  readonly code:
    | "SDD_EVIDENCE_ARTIFACT_INVALID"
    | "SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED"
    | "SDD_EVIDENCE_ARTIFACT_UTF8_INVALID"
    | "SDD_EVIDENCE_FILE_NOT_REGULAR"
    | "SDD_EVIDENCE_FILE_OUT_OF_SCOPE"
    | "SDD_EVIDENCE_FILE_READ_FAILED";

  constructor(code: EvidenceInputError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EvidenceInputError";
    this.code = code;
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: UnknownRecord, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function validUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = utcTimestampPattern.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function assertLimits(value: unknown, limits: EvidenceInputLimits, depth = 1): void {
  if (depth > limits.max_nesting_depth) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Evidence nesting exceeds its limit.");
  }
  if (typeof value === "string") {
    if (new TextEncoder().encode(value).byteLength > limits.max_string_bytes) {
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Evidence string exceeds its limit.");
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > limits.max_array_items) {
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Evidence array exceeds its limit.");
    }
    for (const item of value) assertLimits(item, limits, depth + 1);
    return;
  }
  if (isRecord(value)) {
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
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Evidence exceeds an input limit.");
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_UTF8_INVALID", "Evidence is not valid UTF-8.", {
      cause: error,
    });
  }
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch (error) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "Evidence is not valid JSON.", { cause: error });
  }
  assertLimits(value, limits);
  return value;
}

function parseProvenance(value: UnknownRecord): ArtifactProvenance {
  if (value.created_at !== undefined && !validUtcTimestamp(value.created_at)) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "Evidence timestamp is invalid.");
  }
  if (
    value.producer !== undefined &&
    (!isRecord(value.producer) ||
      !hasExactKeys(value.producer, ["name", "version"]) ||
      !nonEmpty(value.producer.name) ||
      !nonEmpty(value.producer.version))
  ) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "Evidence producer is invalid.");
  }
  return {
    ...(value.created_at === undefined ? {} : { created_at: value.created_at as string }),
    ...(value.producer === undefined
      ? {}
      : { producer: { name: value.producer.name as string, version: value.producer.version as string } }),
  };
}

function sortedUnique(values: readonly string[]): boolean {
  return (
    new Set(values).size === values.length && values.every((value, index) => index === 0 || value > values[index - 1]!)
  );
}

export function parseTestExecutionEvidence(bytes: Uint8Array, limits: EvidenceInputLimits): TestExecutionEvidence {
  const value = parseJson(bytes, limits);
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["schema_version", "artifact_type", "project_id", "issuer", "subject", "results"],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "test_execution_evidence" ||
    !isProjectId(value.project_id) ||
    !nonEmpty(value.issuer) ||
    !isRecord(value.subject) ||
    !hasExactKeys(value.subject, ["head_ref", "test_index_fingerprint", "config_fingerprint"]) ||
    !isGitObjectId(value.subject.head_ref) ||
    !isFingerprint(value.subject.test_index_fingerprint) ||
    !isFingerprint(value.subject.config_fingerprint) ||
    !Array.isArray(value.results)
  ) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "TestExecutionEvidence envelope is invalid.");
  }
  const statuses: readonly TestExecutionStatus[] = [
    "passed",
    "failed",
    "skipped",
    "todo",
    "disabled",
    "xfailed",
    "error",
  ];
  const results = value.results.map((item) => {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["test_ref", "status"], ["duration_ms"]) ||
      typeof item.test_ref !== "string" ||
      !testRefPattern.test(item.test_ref) ||
      !statuses.some((status) => status === item.status) ||
      (item.duration_ms !== undefined && !positiveInteger(item.duration_ms))
    ) {
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "TestExecutionEvidence result is invalid.");
    }
    return {
      test_ref: item.test_ref,
      status: item.status as TestExecutionStatus,
      ...(item.duration_ms === undefined ? {} : { duration_ms: item.duration_ms as number }),
    };
  });
  if (!sortedUnique(results.map((result) => result.test_ref))) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "TestExecutionEvidence results are not canonical.");
  }
  return {
    schema_version: "1.0",
    artifact_type: "test_execution_evidence",
    project_id: value.project_id,
    ...parseProvenance(value),
    issuer: value.issuer,
    subject: {
      head_ref: value.subject.head_ref,
      test_index_fingerprint: value.subject.test_index_fingerprint,
      config_fingerprint: value.subject.config_fingerprint,
    },
    results,
  };
}

export function parseQaEvidence(bytes: Uint8Array, limits: EvidenceInputLimits): QaEvidence {
  const value = parseJson(bytes, limits);
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "schema_version",
        "artifact_type",
        "project_id",
        "issuer",
        "actor",
        "decision",
        "subject",
        "capability_ids",
        "manual_requirements",
      ],
      ["created_at", "producer", "notes"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "qa_evidence" ||
    !isProjectId(value.project_id) ||
    !nonEmpty(value.issuer) ||
    !nonEmpty(value.actor) ||
    (value.decision !== "passed" && value.decision !== "failed") ||
    !isRecord(value.subject) ||
    !hasExactKeys(value.subject, ["head_ref", "integration_ref", "affected_scope_fingerprint"]) ||
    !isGitObjectId(value.subject.head_ref) ||
    !isGitObjectId(value.subject.integration_ref) ||
    !isFingerprint(value.subject.affected_scope_fingerprint) ||
    !Array.isArray(value.capability_ids) ||
    !value.capability_ids.every(isCapabilityId) ||
    !Array.isArray(value.manual_requirements) ||
    (value.notes !== undefined && typeof value.notes !== "string")
  ) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "QAEvidence envelope is invalid.");
  }
  const capabilityIds = value.capability_ids as CapabilityId[];
  if (!sortedUnique(capabilityIds)) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "QAEvidence Capability IDs are not canonical.");
  }
  const manualRequirements = value.manual_requirements.map((item) => {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["requirement_id", "decision"]) ||
      !isRequirementId(item.requirement_id) ||
      (item.decision !== "passed" && item.decision !== "failed")
    ) {
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "QAEvidence manual decision is invalid.");
    }
    return { requirement_id: item.requirement_id, decision: item.decision } as const;
  });
  if (!sortedUnique(manualRequirements.map((item) => item.requirement_id))) {
    throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_INVALID", "QAEvidence manual decisions are not canonical.");
  }
  return {
    schema_version: "1.0",
    artifact_type: "qa_evidence",
    project_id: value.project_id,
    ...parseProvenance(value),
    issuer: value.issuer,
    actor: value.actor,
    decision: value.decision,
    subject: {
      head_ref: value.subject.head_ref,
      integration_ref: value.subject.integration_ref,
      affected_scope_fingerprint: value.subject.affected_scope_fingerprint,
    },
    capability_ids: capabilityIds,
    manual_requirements: manualRequirements,
    ...(value.notes === undefined ? {} : { notes: value.notes }),
  };
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !path.includes("\0"));
}

async function importEvidenceFile<Value>(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
  parse: (bytes: Uint8Array, limits: EvidenceInputLimits) => Value,
): Promise<Value> {
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realFile = await fileSystem.realPath(resolve(realRoot, ...path.split("/")));
    if (!isWithin(realRoot, realFile)) {
      throw new EvidenceInputError("SDD_EVIDENCE_FILE_OUT_OF_SCOPE", "Evidence resolves outside the selected project.");
    }
    const metadata = await fileSystem.metadata(realFile);
    if (metadata.kind !== "file") {
      throw new EvidenceInputError("SDD_EVIDENCE_FILE_NOT_REGULAR", "Evidence input is not a regular file.");
    }
    if (metadata.size > limits.max_artifact_bytes) {
      throw new EvidenceInputError("SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED", "Evidence exceeds its byte limit.");
    }
    return parse(await fileSystem.readFile(realFile), limits);
  } catch (error) {
    if (error instanceof EvidenceInputError) throw error;
    throw new EvidenceInputError("SDD_EVIDENCE_FILE_READ_FAILED", "Evidence file could not be read.", { cause: error });
  }
}

export async function importTestExecutionEvidenceFile(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
): Promise<TestExecutionEvidence> {
  return importEvidenceFile(fileSystem, projectRoot, path, limits, parseTestExecutionEvidence);
}

export async function importQaEvidenceFile(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  limits: EvidenceInputLimits,
): Promise<QaEvidence> {
  return importEvidenceFile(fileSystem, projectRoot, path, limits, parseQaEvidence);
}

export type EvidenceCheck<Id extends string> = {
  readonly satisfied: readonly Id[];
  readonly unsatisfied: readonly Id[];
};

export type VerificationEvidenceIssue = {
  readonly code:
    | "SDD_EVIDENCE_ISSUER_UNCONFIGURED"
    | "SDD_EVIDENCE_MANUAL_CONTRADICTORY"
    | "SDD_EVIDENCE_MANUAL_FAILED"
    | "SDD_EVIDENCE_MANUAL_MISSING"
    | "SDD_EVIDENCE_OBJECT_UNKNOWN"
    | "SDD_EVIDENCE_QA_CONTRADICTORY"
    | "SDD_EVIDENCE_QA_FAILED"
    | "SDD_EVIDENCE_QA_MISSING"
    | "SDD_EVIDENCE_SUBJECT_STALE"
    | "SDD_EVIDENCE_TEST_COVERAGE_MISSING"
    | "SDD_EVIDENCE_TEST_INDEX_STALE"
    | "SDD_EVIDENCE_TEST_RESULT_MISSING"
    | "SDD_EVIDENCE_TEST_RESULT_DUPLICATE"
    | "SDD_EVIDENCE_TEST_RESULT_NOT_PASSED"
    | "SDD_EVIDENCE_TEST_RESULT_UNKNOWN";
  readonly disposition: "BLOCKED" | "REVIEW_REQUIRED";
  readonly artifact_type?: "test_execution_evidence" | "qa_evidence" | "test_index";
  readonly issuer?: string;
  readonly object_id?: ObjectId;
  readonly test_ref?: string;
};

export type VerificationEvidenceAssessment = {
  readonly test_coverage: EvidenceCheck<RequirementId>;
  readonly test_execution: EvidenceCheck<RequirementId>;
  readonly manual_verification: EvidenceCheck<RequirementId>;
  readonly qa_coverage: EvidenceCheck<CapabilityId>;
  readonly issues: readonly VerificationEvidenceIssue[];
};

function issueKey(issue: VerificationEvidenceIssue): string {
  return [
    issue.disposition,
    issue.code,
    issue.artifact_type ?? "",
    issue.issuer ?? "",
    issue.object_id ?? "",
    issue.test_ref ?? "",
  ].join("\0");
}

function check<Id extends string>(selected: readonly Id[], satisfied: ReadonlySet<Id>): EvidenceCheck<Id> {
  return {
    satisfied: selected.filter((id) => satisfied.has(id)).toSorted(),
    unsatisfied: selected.filter((id) => !satisfied.has(id)).toSorted(),
  };
}

export function assessVerificationEvidence(input: {
  readonly project_id: ProjectId;
  readonly head_ref: GitObjectId;
  readonly integration_ref: GitObjectId;
  readonly config_fingerprint: Fingerprint;
  readonly current_adapter_fingerprints: Readonly<Record<string, Fingerprint>>;
  readonly allowed_issuers: ReadonlySet<string>;
  readonly graph: ValidatedSpecificationGraph;
  readonly scope: AffectedScope;
  readonly test_index: TestIndex;
  readonly test_execution_evidence: readonly TestExecutionEvidence[];
  readonly qa_evidence: readonly QaEvidence[];
}): VerificationEvidenceAssessment {
  const issues: VerificationEvidenceIssue[] = [];
  const addIssue = (issue: VerificationEvidenceIssue): void => {
    issues.push(issue);
  };
  const testIndexFingerprint = fingerprintTestInput(input.test_index);
  const knownTestRefs = new Set(input.test_index.tests.map((test) => test.test_ref));
  const expectedAdapterFingerprints = Object.entries(input.current_adapter_fingerprints).toSorted(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  const actualAdapterFingerprints = Object.entries(input.test_index.subject.adapter_fingerprints).toSorted(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  );
  const indexRequirementContextCurrent = input.test_index.tests.every((test) =>
    test.requirement_ids.every((id) => {
      const object = input.graph.objects.get(id);
      return object !== undefined && "anchor" in object;
    }),
  );
  const indexCurrent =
    input.test_index.project_id === input.project_id &&
    input.test_index.subject.head_ref === input.head_ref &&
    input.test_index.subject.config_fingerprint === input.config_fingerprint &&
    JSON.stringify(actualAdapterFingerprints) === JSON.stringify(expectedAdapterFingerprints) &&
    indexRequirementContextCurrent;
  if (!indexCurrent) {
    addIssue({ code: "SDD_EVIDENCE_TEST_INDEX_STALE", disposition: "BLOCKED", artifact_type: "test_index" });
  }

  const resultStatuses = new Map<string, Set<TestExecutionStatus>>();
  const resultOccurrences = new Map<string, number>();
  for (const evidence of input.test_execution_evidence) {
    if (!input.allowed_issuers.has(evidence.issuer)) {
      addIssue({
        code: "SDD_EVIDENCE_ISSUER_UNCONFIGURED",
        disposition: "BLOCKED",
        artifact_type: evidence.artifact_type,
        issuer: evidence.issuer,
      });
      continue;
    }
    if (
      !indexCurrent ||
      evidence.project_id !== input.project_id ||
      evidence.subject.head_ref !== input.head_ref ||
      evidence.subject.config_fingerprint !== input.config_fingerprint ||
      evidence.subject.test_index_fingerprint !== testIndexFingerprint
    ) {
      addIssue({
        code: "SDD_EVIDENCE_SUBJECT_STALE",
        disposition: "BLOCKED",
        artifact_type: evidence.artifact_type,
        issuer: evidence.issuer,
      });
      continue;
    }
    const unknown = evidence.results.filter((result) => !knownTestRefs.has(result.test_ref));
    if (unknown.length > 0) {
      for (const result of unknown) {
        addIssue({
          code: "SDD_EVIDENCE_TEST_RESULT_UNKNOWN",
          disposition: "BLOCKED",
          artifact_type: evidence.artifact_type,
          issuer: evidence.issuer,
          test_ref: result.test_ref,
        });
      }
      continue;
    }
    for (const result of evidence.results) {
      resultOccurrences.set(result.test_ref, (resultOccurrences.get(result.test_ref) ?? 0) + 1);
      const statuses = resultStatuses.get(result.test_ref) ?? new Set<TestExecutionStatus>();
      statuses.add(result.status);
      resultStatuses.set(result.test_ref, statuses);
    }
  }

  const acceptedQa: QaEvidence[] = [];
  for (const evidence of input.qa_evidence) {
    if (!input.allowed_issuers.has(evidence.issuer)) {
      addIssue({
        code: "SDD_EVIDENCE_ISSUER_UNCONFIGURED",
        disposition: "BLOCKED",
        artifact_type: evidence.artifact_type,
        issuer: evidence.issuer,
      });
      continue;
    }
    if (
      evidence.project_id !== input.project_id ||
      evidence.subject.head_ref !== input.head_ref ||
      evidence.subject.integration_ref !== input.integration_ref ||
      evidence.subject.affected_scope_fingerprint !== input.scope.fingerprint
    ) {
      addIssue({
        code: "SDD_EVIDENCE_SUBJECT_STALE",
        disposition: "BLOCKED",
        artifact_type: evidence.artifact_type,
        issuer: evidence.issuer,
      });
      continue;
    }
    const unknownObject =
      evidence.capability_ids.find(
        (id) => !input.scope.affected_capabilities.includes(id) && !input.graph.objects.has(id),
      ) ??
      evidence.manual_requirements
        .map((decision) => decision.requirement_id)
        .find((id) => !input.graph.objects.has(id));
    if (unknownObject !== undefined) {
      addIssue({
        code: "SDD_EVIDENCE_OBJECT_UNKNOWN",
        disposition: "BLOCKED",
        artifact_type: evidence.artifact_type,
        issuer: evidence.issuer,
        object_id: unknownObject,
      });
      continue;
    }
    acceptedQa.push(evidence);
  }

  const automated: RequirementId[] = [];
  const manual: RequirementId[] = [];
  for (const id of input.scope.affected_requirements) {
    const object = input.graph.objects.get(id);
    if (object === undefined || !("anchor" in object)) continue;
    (object.verification === "automated" ? automated : manual).push(id);
  }

  const coverageSatisfied = new Set<RequirementId>();
  const executionSatisfied = new Set<RequirementId>();
  for (const requirementId of automated) {
    const mapped = input.test_index.tests.filter((test) => test.requirement_ids.includes(requirementId));
    if (mapped.length === 0) {
      addIssue({
        code: "SDD_EVIDENCE_TEST_COVERAGE_MISSING",
        disposition: "BLOCKED",
        object_id: requirementId,
      });
      continue;
    }
    coverageSatisfied.add(requirementId);
    let passed = true;
    for (const test of mapped) {
      const statuses = resultStatuses.get(test.test_ref);
      const occurrences = resultOccurrences.get(test.test_ref) ?? 0;
      if (occurrences === 0 || statuses === undefined || statuses.size === 0) {
        passed = false;
        addIssue({
          code: "SDD_EVIDENCE_TEST_RESULT_MISSING",
          disposition: "BLOCKED",
          object_id: requirementId,
          test_ref: test.test_ref,
        });
      } else if (occurrences !== 1) {
        passed = false;
        addIssue({
          code: "SDD_EVIDENCE_TEST_RESULT_DUPLICATE",
          disposition: "BLOCKED",
          object_id: requirementId,
          test_ref: test.test_ref,
        });
      } else if (statuses.size !== 1 || !statuses.has("passed")) {
        passed = false;
        addIssue({
          code: "SDD_EVIDENCE_TEST_RESULT_NOT_PASSED",
          disposition: "BLOCKED",
          object_id: requirementId,
          test_ref: test.test_ref,
        });
      }
    }
    if (passed) executionSatisfied.add(requirementId);
  }

  const manualSatisfied = new Set<RequirementId>();
  for (const requirementId of manual) {
    const decisions = new Set(
      acceptedQa.flatMap((evidence) =>
        evidence.manual_requirements
          .filter((decision) => decision.requirement_id === requirementId)
          .map((decision) => decision.decision),
      ),
    );
    if (decisions.has("failed") && decisions.has("passed")) {
      addIssue({ code: "SDD_EVIDENCE_MANUAL_CONTRADICTORY", disposition: "BLOCKED", object_id: requirementId });
    } else if (decisions.has("failed")) {
      addIssue({ code: "SDD_EVIDENCE_MANUAL_FAILED", disposition: "BLOCKED", object_id: requirementId });
    } else if (decisions.has("passed")) {
      manualSatisfied.add(requirementId);
    } else {
      addIssue({ code: "SDD_EVIDENCE_MANUAL_MISSING", disposition: "REVIEW_REQUIRED", object_id: requirementId });
    }
  }

  const qaSatisfied = new Set<CapabilityId>();
  for (const capabilityId of input.scope.affected_capabilities) {
    const decisions = new Set(
      acceptedQa
        .filter((evidence) => evidence.capability_ids.includes(capabilityId))
        .map((evidence) => evidence.decision),
    );
    if (decisions.has("failed") && decisions.has("passed")) {
      addIssue({ code: "SDD_EVIDENCE_QA_CONTRADICTORY", disposition: "BLOCKED", object_id: capabilityId });
    } else if (decisions.has("failed")) {
      addIssue({ code: "SDD_EVIDENCE_QA_FAILED", disposition: "BLOCKED", object_id: capabilityId });
    } else if (decisions.has("passed")) {
      qaSatisfied.add(capabilityId);
    } else {
      addIssue({ code: "SDD_EVIDENCE_QA_MISSING", disposition: "REVIEW_REQUIRED", object_id: capabilityId });
    }
  }

  return {
    test_coverage: check(automated, coverageSatisfied),
    test_execution: check(automated, executionSatisfied),
    manual_verification: check(manual, manualSatisfied),
    qa_coverage: check(input.scope.affected_capabilities, qaSatisfied),
    issues: [...new Map(issues.map((issue) => [issueKey(issue), issue])).values()].toSorted((left, right) => {
      const leftKey = issueKey(left);
      const rightKey = issueKey(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    }),
  };
}
