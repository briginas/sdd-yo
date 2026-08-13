import { createHash } from "node:crypto";

import type { Fingerprint, GitObjectId, ProjectId, ProjectPath } from "../contracts/identifiers.ts";

export const WORKFLOW_EXECUTION_STATES = ["active", "waiting", "interrupted", "failed", "completed"] as const;
export type WorkflowExecutionState = (typeof WORKFLOW_EXECUTION_STATES)[number];

export const WORKFLOW_STEP_STATES = ["active", "waiting", "failed", "completed"] as const;
export type WorkflowStepState = (typeof WORKFLOW_STEP_STATES)[number];

export const WORKFLOW_CLI_STATUSES = ["ok", "blocked", "review_required", "error"] as const;
export type WorkflowCliStatus = (typeof WORKFLOW_CLI_STATUSES)[number];

export const WORKFLOW_READINESS_STATES = ["PASS", "REVIEW_REQUIRED", "BLOCKED"] as const;
export type WorkflowReadinessState = (typeof WORKFLOW_READINESS_STATES)[number];

export const WORKFLOW_FRESHNESS_STATES = ["current", "stale", "missing", "unknown"] as const;
export type WorkflowFreshnessState = (typeof WORKFLOW_FRESHNESS_STATES)[number];

export const WORKFLOW_APPROVAL_STATES = ["unavailable", "pending", "approved", "rejected"] as const;
export type WorkflowApprovalState = (typeof WORKFLOW_APPROVAL_STATES)[number];

export const WORKFLOW_INTEGRATION_STATES = ["unavailable", "not_integrated", "integrated"] as const;
export type WorkflowIntegrationState = (typeof WORKFLOW_INTEGRATION_STATES)[number];

export const WORKFLOW_ARTIFACT_KINDS = [
  "proposal_package",
  "approval_evidence",
  "test_index",
  "test_execution_evidence",
  "qa_evidence",
  "finding",
  "verification_report",
  "merge_report",
] as const;
export type WorkflowArtifactKind = (typeof WORKFLOW_ARTIFACT_KINDS)[number];

type WorkflowEventBase = {
  readonly schema_version: "1.0";
  readonly artifact_type: "workflow_event";
  readonly project_id: ProjectId;
  readonly change_id: string;
  readonly run_id: string;
  readonly producer_id: string;
  readonly sequence: number;
  readonly timestamp?: string;
};

export type WorkflowArtifactReference = {
  readonly kind: WorkflowArtifactKind;
  readonly path: ProjectPath;
  readonly fingerprint?: Fingerprint;
  readonly git_object_id?: GitObjectId;
};

export type WorkflowEvent = WorkflowEventBase &
  (
    | { readonly event_type: "run_started" }
    | { readonly event_type: "step_started"; readonly step_id: string; readonly label: string }
    | { readonly event_type: "step_waiting"; readonly step_id: string; readonly reason: string }
    | { readonly event_type: "step_completed"; readonly step_id: string }
    | { readonly event_type: "step_failed"; readonly step_id: string; readonly diagnostic_code: string }
    | { readonly event_type: "run_interrupted"; readonly reason: string }
    | { readonly event_type: "run_failed"; readonly diagnostic_code: string }
    | { readonly event_type: "run_completed" }
    | {
        readonly event_type: "status_observed";
        readonly axis: "cli" | "readiness" | "freshness" | "approval" | "integration";
        readonly value:
          | WorkflowCliStatus
          | WorkflowReadinessState
          | WorkflowFreshnessState
          | WorkflowApprovalState
          | WorkflowIntegrationState;
      }
    | { readonly event_type: "artifact_referenced"; readonly artifact: WorkflowArtifactReference }
    | { readonly event_type: "observer_failed"; readonly diagnostic_code: string }
  );

export type WorkflowStepSnapshot = {
  readonly step_id: string;
  readonly label: string;
  readonly state: WorkflowStepState;
  readonly waiting_reason: string | null;
  readonly diagnostic_code: string | null;
};

export type WorkflowSnapshot = {
  readonly schema_version: "1.0";
  readonly artifact_type: "workflow_snapshot";
  readonly project_id: ProjectId;
  readonly change_id: string;
  readonly run_id: string;
  readonly producer_id: string;
  readonly last_sequence: number;
  readonly execution: WorkflowExecutionState;
  readonly current_step_id: string | null;
  readonly cli_status: WorkflowCliStatus | null;
  readonly merge_readiness: WorkflowReadinessState | null;
  readonly artifact_freshness: WorkflowFreshnessState | null;
  readonly approval_state: WorkflowApprovalState;
  readonly integration_state: WorkflowIntegrationState;
  readonly interruption_reason: string | null;
  readonly observer_diagnostic: string | null;
  readonly steps: readonly WorkflowStepSnapshot[];
  readonly artifacts: readonly WorkflowArtifactReference[];
};

export type WorkflowInputLimits = {
  readonly max_event_bytes: number;
  readonly max_string_bytes: number;
  readonly max_events: number;
};

export const DEFAULT_WORKFLOW_INPUT_LIMITS: WorkflowInputLimits = {
  max_event_bytes: 32_768,
  max_string_bytes: 4_096,
  max_events: 10_000,
};

export class WorkflowObservationError extends Error {
  readonly code:
    | "SDD_OBSERVATION_EVENT_INVALID"
    | "SDD_OBSERVATION_EVENT_LIMIT_EXCEEDED"
    | "SDD_OBSERVATION_PROJECT_MISMATCH"
    | "SDD_OBSERVATION_PRODUCER_MISMATCH"
    | "SDD_OBSERVATION_SEQUENCE_CONFLICT"
    | "SDD_OBSERVATION_SEQUENCE_GAP"
    | "SDD_OBSERVATION_TRANSITION_INVALID";

  constructor(
    code:
      | "SDD_OBSERVATION_EVENT_INVALID"
      | "SDD_OBSERVATION_EVENT_LIMIT_EXCEEDED"
      | "SDD_OBSERVATION_PROJECT_MISMATCH"
      | "SDD_OBSERVATION_PRODUCER_MISMATCH"
      | "SDD_OBSERVATION_SEQUENCE_CONFLICT"
      | "SDD_OBSERVATION_SEQUENCE_GAP"
      | "SDD_OBSERVATION_TRANSITION_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "WorkflowObservationError";
    this.code = code;
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: UnknownRecord, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function nonEmpty(value: unknown, limits: WorkflowInputLimits): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    new TextEncoder().encode(value).byteLength <= limits.max_string_bytes
  );
}

function validProjectPath(value: unknown): value is ProjectPath {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    !value.split("/").some((part) => part === "" || part === "." || part === ".." || part === ".git")
  );
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value);
}

function validDiagnosticCode(value: unknown): value is string {
  return typeof value === "string" && /^SDD_[A-Z0-9_]+$/u.test(value);
}

function validFingerprint(value: unknown): value is Fingerprint {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function parseArtifact(value: unknown, limits: WorkflowInputLimits): WorkflowArtifactReference {
  if (!isRecord(value) || !exactKeys(value, ["kind", "path"], ["fingerprint", "git_object_id"])) {
    throw new WorkflowObservationError("SDD_OBSERVATION_EVENT_INVALID", "The artifact reference shape is invalid.");
  }
  if (!WORKFLOW_ARTIFACT_KINDS.includes(value.kind as WorkflowArtifactKind) || !validProjectPath(value.path)) {
    throw new WorkflowObservationError(
      "SDD_OBSERVATION_EVENT_INVALID",
      "The artifact reference is not allowlisted or bounded.",
    );
  }
  if (value.fingerprint !== undefined && !validFingerprint(value.fingerprint)) {
    throw new WorkflowObservationError("SDD_OBSERVATION_EVENT_INVALID", "The artifact fingerprint is invalid.");
  }
  if (value.git_object_id !== undefined && !nonEmpty(value.git_object_id, limits)) {
    throw new WorkflowObservationError("SDD_OBSERVATION_EVENT_INVALID", "The artifact Git object is invalid.");
  }
  return value as WorkflowArtifactReference;
}

function assertSpecificEvent(value: UnknownRecord, limits: WorkflowInputLimits): void {
  const common = [
    "schema_version",
    "artifact_type",
    "project_id",
    "change_id",
    "run_id",
    "producer_id",
    "sequence",
    "event_type",
  ];
  const optional = ["timestamp"];
  const assertShape = (extraRequired: readonly string[], extraOptional: readonly string[] = []): void => {
    if (!exactKeys(value, [...common, ...extraRequired], [...optional, ...extraOptional])) {
      throw new WorkflowObservationError(
        "SDD_OBSERVATION_EVENT_INVALID",
        "The workflow event contains missing or unknown fields.",
      );
    }
  };
  switch (value.event_type) {
    case "run_started":
    case "run_completed":
      assertShape([]);
      return;
    case "step_started":
      assertShape(["step_id", "label"]);
      if (!nonEmpty(value.step_id, limits) || !nonEmpty(value.label, limits)) break;
      return;
    case "step_waiting":
      assertShape(["step_id", "reason"]);
      if (!nonEmpty(value.step_id, limits) || !nonEmpty(value.reason, limits)) break;
      return;
    case "step_completed":
      assertShape(["step_id"]);
      if (!nonEmpty(value.step_id, limits)) break;
      return;
    case "step_failed":
      assertShape(["step_id", "diagnostic_code"]);
      if (!nonEmpty(value.step_id, limits) || !validDiagnosticCode(value.diagnostic_code)) break;
      return;
    case "run_interrupted":
      assertShape(["reason"]);
      if (!nonEmpty(value.reason, limits)) break;
      return;
    case "run_failed":
    case "observer_failed":
      assertShape(["diagnostic_code"]);
      if (!validDiagnosticCode(value.diagnostic_code)) break;
      return;
    case "status_observed": {
      assertShape(["axis", "value"]);
      const allowed: Readonly<Record<string, readonly string[]>> = {
        cli: WORKFLOW_CLI_STATUSES,
        readiness: WORKFLOW_READINESS_STATES,
        freshness: WORKFLOW_FRESHNESS_STATES,
        approval: WORKFLOW_APPROVAL_STATES,
        integration: WORKFLOW_INTEGRATION_STATES,
      };
      if (
        typeof value.axis !== "string" ||
        typeof value.value !== "string" ||
        !allowed[value.axis]?.includes(value.value)
      )
        break;
      return;
    }
    case "artifact_referenced":
      assertShape(["artifact"]);
      parseArtifact(value.artifact, limits);
      return;
    default:
      break;
  }
  throw new WorkflowObservationError("SDD_OBSERVATION_EVENT_INVALID", "The workflow event payload is invalid.");
}

export function parseWorkflowEvent(
  input: unknown,
  expectedProjectId: ProjectId,
  limits: WorkflowInputLimits = DEFAULT_WORKFLOW_INPUT_LIMITS,
): WorkflowEvent {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  if (bytes.byteLength > limits.max_event_bytes) {
    throw new WorkflowObservationError(
      "SDD_OBSERVATION_EVENT_LIMIT_EXCEEDED",
      "The workflow event exceeds its byte limit.",
    );
  }
  if (!isRecord(input))
    throw new WorkflowObservationError("SDD_OBSERVATION_EVENT_INVALID", "The workflow event is not an object.");
  if (
    input.schema_version !== "1.0" ||
    input.artifact_type !== "workflow_event" ||
    !/^SDD-[0-9A-F]{8}$/u.test(String(input.project_id)) ||
    !nonEmpty(input.change_id, limits) ||
    !nonEmpty(input.run_id, limits) ||
    !nonEmpty(input.producer_id, limits) ||
    !Number.isSafeInteger(input.sequence) ||
    (input.sequence as number) < 0 ||
    (input.timestamp !== undefined && !validTimestamp(input.timestamp))
  ) {
    throw new WorkflowObservationError("SDD_OBSERVATION_EVENT_INVALID", "The workflow event envelope is invalid.");
  }
  if (input.project_id !== expectedProjectId) {
    throw new WorkflowObservationError(
      "SDD_OBSERVATION_PROJECT_MISMATCH",
      "The workflow event belongs to another project.",
    );
  }
  assertSpecificEvent(input, limits);
  return input as WorkflowEvent;
}

function canonicalJson(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (!isRecord(item)) return item;
    return Object.fromEntries(
      Object.entries(item)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonical(child)]),
    );
  };
  return JSON.stringify(canonical(value));
}

function eventFingerprint(event: WorkflowEvent): string {
  return createHash("sha256").update(canonicalJson(event)).digest("hex");
}

function replaceStep(
  steps: readonly WorkflowStepSnapshot[],
  next: WorkflowStepSnapshot,
): readonly WorkflowStepSnapshot[] {
  return steps.map((step) => (step.step_id === next.step_id ? next : step));
}

function reduceOrdered(snapshot: WorkflowSnapshot, event: WorkflowEvent): WorkflowSnapshot {
  const base = { ...snapshot, last_sequence: event.sequence };
  switch (event.event_type) {
    case "run_started":
      if (event.sequence !== 0 || snapshot.last_sequence !== -1) break;
      return { ...base, execution: "active" };
    case "step_started":
      if (snapshot.execution !== "active" && snapshot.execution !== "waiting") break;
      if (snapshot.steps.some((step) => step.step_id === event.step_id)) break;
      return {
        ...base,
        execution: "active",
        current_step_id: event.step_id,
        steps: [
          ...snapshot.steps,
          { step_id: event.step_id, label: event.label, state: "active", waiting_reason: null, diagnostic_code: null },
        ],
      };
    case "step_waiting": {
      const step = snapshot.steps.find((item) => item.step_id === event.step_id);
      if (step === undefined || step.state !== "active" || snapshot.current_step_id !== event.step_id) break;
      return {
        ...base,
        execution: "waiting",
        steps: replaceStep(snapshot.steps, { ...step, state: "waiting", waiting_reason: event.reason }),
      };
    }
    case "step_completed": {
      const step = snapshot.steps.find((item) => item.step_id === event.step_id);
      if (
        step === undefined ||
        (step.state !== "active" && step.state !== "waiting") ||
        snapshot.current_step_id !== event.step_id
      )
        break;
      return {
        ...base,
        execution: "active",
        current_step_id: null,
        steps: replaceStep(snapshot.steps, { ...step, state: "completed", waiting_reason: null }),
      };
    }
    case "step_failed": {
      const step = snapshot.steps.find((item) => item.step_id === event.step_id);
      if (
        step === undefined ||
        (step.state !== "active" && step.state !== "waiting") ||
        snapshot.current_step_id !== event.step_id
      )
        break;
      return {
        ...base,
        execution: "failed",
        current_step_id: event.step_id,
        steps: replaceStep(snapshot.steps, { ...step, state: "failed", diagnostic_code: event.diagnostic_code }),
      };
    }
    case "run_interrupted":
      if (snapshot.execution === "completed" || snapshot.execution === "failed") break;
      return { ...base, execution: "interrupted", interruption_reason: event.reason };
    case "run_failed":
      if (snapshot.execution === "completed") break;
      return { ...base, execution: "failed", observer_diagnostic: event.diagnostic_code };
    case "run_completed":
      if (snapshot.execution !== "active" || snapshot.current_step_id !== null) break;
      return { ...base, execution: "completed" };
    case "status_observed":
      return event.axis === "cli"
        ? { ...base, cli_status: event.value as WorkflowCliStatus }
        : event.axis === "readiness"
          ? { ...base, merge_readiness: event.value as WorkflowReadinessState }
          : event.axis === "freshness"
            ? { ...base, artifact_freshness: event.value as WorkflowFreshnessState }
            : event.axis === "approval"
              ? { ...base, approval_state: event.value as WorkflowApprovalState }
              : { ...base, integration_state: event.value as WorkflowIntegrationState };
    case "artifact_referenced":
      if (snapshot.artifacts.some((artifact) => canonicalJson(artifact) === canonicalJson(event.artifact))) return base;
      return { ...base, artifacts: [...snapshot.artifacts, event.artifact] };
    case "observer_failed":
      return { ...base, observer_diagnostic: event.diagnostic_code };
  }
  throw new WorkflowObservationError(
    "SDD_OBSERVATION_TRANSITION_INVALID",
    `Event ${event.event_type} is invalid for the current run state.`,
  );
}

export function replayWorkflowEvents(
  inputs: readonly unknown[],
  expectedProjectId: ProjectId,
  limits: WorkflowInputLimits = DEFAULT_WORKFLOW_INPUT_LIMITS,
): WorkflowSnapshot {
  if (inputs.length === 0 || inputs.length > limits.max_events) {
    throw new WorkflowObservationError(
      "SDD_OBSERVATION_EVENT_LIMIT_EXCEEDED",
      "The workflow event count is outside its limit.",
    );
  }
  const bySequence = new Map<number, { readonly event: WorkflowEvent; readonly fingerprint: string }>();
  for (const input of inputs) {
    const event = parseWorkflowEvent(input, expectedProjectId, limits);
    const fingerprint = eventFingerprint(event);
    const existing = bySequence.get(event.sequence);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint)
        throw new WorkflowObservationError("SDD_OBSERVATION_SEQUENCE_CONFLICT", "A sequence has conflicting events.");
      continue;
    }
    bySequence.set(event.sequence, { event, fingerprint });
  }
  const ordered = [...bySequence.values()]
    .map(({ event }) => event)
    .toSorted((left, right) => left.sequence - right.sequence);
  const first = ordered[0]!;
  if (first.event_type !== "run_started" || first.sequence !== 0) {
    throw new WorkflowObservationError("SDD_OBSERVATION_SEQUENCE_GAP", "A run must begin with sequence zero.");
  }
  for (const [index, event] of ordered.entries()) {
    if (event.sequence !== index)
      throw new WorkflowObservationError("SDD_OBSERVATION_SEQUENCE_GAP", "The workflow event sequence contains a gap.");
    if (event.project_id !== first.project_id || event.change_id !== first.change_id || event.run_id !== first.run_id) {
      throw new WorkflowObservationError(
        "SDD_OBSERVATION_PROJECT_MISMATCH",
        "The workflow events do not describe one subject.",
      );
    }
    if (event.producer_id !== first.producer_id) {
      throw new WorkflowObservationError(
        "SDD_OBSERVATION_PRODUCER_MISMATCH",
        "The workflow events have different producers.",
      );
    }
  }
  let snapshot: WorkflowSnapshot = {
    schema_version: "1.0",
    artifact_type: "workflow_snapshot",
    project_id: first.project_id,
    change_id: first.change_id,
    run_id: first.run_id,
    producer_id: first.producer_id,
    last_sequence: -1,
    execution: "active",
    current_step_id: null,
    cli_status: null,
    merge_readiness: null,
    artifact_freshness: null,
    approval_state: "unavailable",
    integration_state: "unavailable",
    interruption_reason: null,
    observer_diagnostic: null,
    steps: [],
    artifacts: [],
  };
  for (const event of ordered) snapshot = reduceOrdered(snapshot, event);
  return snapshot;
}

export type RetainedWorkflowRun = {
  readonly run_id: string;
  readonly events: readonly WorkflowEvent[];
  readonly bytes: number;
};

export function retainWorkflowRuns(
  runs: readonly RetainedWorkflowRun[],
  limits: { readonly max_runs: number; readonly max_bytes: number },
): readonly RetainedWorkflowRun[] {
  if (
    !Number.isSafeInteger(limits.max_runs) ||
    limits.max_runs < 1 ||
    !Number.isSafeInteger(limits.max_bytes) ||
    limits.max_bytes < 1
  ) {
    throw new WorkflowObservationError(
      "SDD_OBSERVATION_EVENT_LIMIT_EXCEEDED",
      "Observation retention limits are invalid.",
    );
  }
  const retained: RetainedWorkflowRun[] = [];
  let bytes = 0;
  for (const run of runs.toReversed()) {
    if (retained.length >= limits.max_runs || bytes + run.bytes > limits.max_bytes) continue;
    retained.push(run);
    bytes += run.bytes;
  }
  return retained.reverse();
}
