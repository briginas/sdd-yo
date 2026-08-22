import { createHash } from "node:crypto";

import { isProjectPath, type Fingerprint, type ProjectId, type ProjectPath } from "../contracts/identifiers.ts";
import type { WorkflowJournalStore } from "../platform/workflow-journal-store.ts";
export type { WorkflowJournalStore } from "../platform/workflow-journal-store.ts";
import {
  DEFAULT_WORKFLOW_INPUT_LIMITS,
  fingerprintWorkflowEvent,
  parseWorkflowEvent,
  replayWorkflowEvents,
  type SpecCodeWorkflowStageId,
  type WorkflowEvent,
  type WorkflowInputLimits,
  type WorkflowObservationStart,
  type WorkflowSnapshot,
} from "./workflow.ts";

export const DEFAULT_WORKFLOW_JOURNAL_MAX_BYTES = 16 * 1024 * 1024;

export type WorkflowJournalSubject = {
  readonly project_id: ProjectId;
  readonly mode: "spec-code";
  readonly run_id: string;
  readonly producer_id: string;
  readonly change_id: string;
};

export type WorkflowJournalResult = WorkflowJournalSubject & {
  readonly journal_path: ProjectPath;
  readonly next_sequence: number;
  readonly journal_fingerprint: Fingerprint;
  readonly snapshot: WorkflowSnapshot;
};

export type ReadWorkflowJournalResult = WorkflowJournalResult & {
  readonly events: readonly WorkflowEvent[];
  readonly bytes: Uint8Array;
};

export type WorkflowJournalPublicationResult = WorkflowJournalResult & {
  readonly publication: "published" | "duplicate";
};

type WorkflowEventEnvelopeKey =
  | "schema_version"
  | "artifact_type"
  | "project_id"
  | "change_id"
  | "run_id"
  | "producer_id"
  | "sequence";
export type WorkflowJournalEventPayload = WorkflowEvent extends infer Event
  ? Event extends WorkflowEvent
    ? Omit<Event, WorkflowEventEnvelopeKey>
    : never
  : never;

export class WorkflowJournalError extends Error {
  readonly code:
    | "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE"
    | "SDD_OBSERVATION_JOURNAL_LIMIT_EXCEEDED"
    | "SDD_OBSERVATION_JOURNAL_MALFORMED"
    | "SDD_OBSERVATION_SUBJECT_MISMATCH"
    | "SDD_OBSERVATION_STALE_WRITER"
    | "SDD_OBSERVATION_SEQUENCE_CONFLICT"
    | "SDD_OBSERVATION_SEQUENCE_GAP";

  constructor(code: WorkflowJournalError["code"], message: string) {
    super(message);
    this.name = "WorkflowJournalError";
    this.code = code;
  }
}

function fingerprint(bytes: Uint8Array): Fingerprint {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}` as Fingerprint;
}

function assertBoundedIdentity(value: string, label: string): void {
  if (value.length === 0 || new TextEncoder().encode(value).byteLength > DEFAULT_WORKFLOW_INPUT_LIMITS.max_string_bytes)
    throw new WorkflowJournalError("SDD_OBSERVATION_SUBJECT_MISMATCH", `${label} is invalid.`);
}

export function workflowJournalPath(runId: string): ProjectPath {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(runId) || runId === "." || runId === "..")
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE",
      "The run identity cannot form a safe generated journal path.",
    );
  const path = `.sdd/staging/workflow-observation/spec-code/${runId}.jsonl`;
  if (!isProjectPath(path))
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE",
      "The generated workflow journal path is unsafe.",
    );
  return path;
}

function serialize(events: readonly WorkflowEvent[]): Uint8Array {
  return new TextEncoder().encode(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
}

function parseLines(bytes: Uint8Array, maxBytes: number): readonly unknown[] {
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes)
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_JOURNAL_LIMIT_EXCEEDED",
      "The workflow journal byte count is outside its limit.",
    );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new WorkflowJournalError("SDD_OBSERVATION_JOURNAL_MALFORMED", "The workflow journal is not UTF-8.");
  }
  if (!text.endsWith("\n"))
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_JOURNAL_MALFORMED",
      "The workflow journal is not one complete atomic JSONL publication.",
    );
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0))
    throw new WorkflowJournalError("SDD_OBSERVATION_JOURNAL_MALFORMED", "The workflow journal has an empty entry.");
  try {
    return lines.map((line) => JSON.parse(line) as unknown);
  } catch {
    throw new WorkflowJournalError("SDD_OBSERVATION_JOURNAL_MALFORMED", "The workflow journal JSONL is invalid.");
  }
}

function result(
  journalPath: ProjectPath,
  events: readonly WorkflowEvent[],
  bytes: Uint8Array,
  snapshot: WorkflowSnapshot,
): ReadWorkflowJournalResult {
  const first = events[0]!;
  return {
    journal_path: journalPath,
    project_id: first.project_id,
    mode: "spec-code",
    run_id: first.run_id,
    producer_id: first.producer_id,
    change_id: first.change_id,
    next_sequence: snapshot.last_sequence + 1,
    journal_fingerprint: fingerprint(bytes),
    snapshot,
    events,
    bytes,
  };
}

export async function readWorkflowJournal(input: {
  readonly store: WorkflowJournalStore;
  readonly journal_path: ProjectPath;
  readonly project_id: ProjectId;
  readonly max_journal_bytes?: number;
  readonly event_limits?: WorkflowInputLimits;
}): Promise<ReadWorkflowJournalResult> {
  const bytes = await input.store.read(input.journal_path);
  const values = parseLines(bytes, input.max_journal_bytes ?? DEFAULT_WORKFLOW_JOURNAL_MAX_BYTES);
  let snapshot: WorkflowSnapshot;
  let events: readonly WorkflowEvent[];
  try {
    events = values.map((value) => parseWorkflowEvent(value, input.project_id, input.event_limits));
    snapshot = replayWorkflowEvents(events, input.project_id, input.event_limits);
  } catch (error) {
    if (error instanceof WorkflowJournalError) throw error;
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_JOURNAL_MALFORMED",
      error instanceof Error ? error.message : "The workflow journal is invalid.",
    );
  }
  if (snapshot.mode !== "spec-code")
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_JOURNAL_MALFORMED",
      "The workflow journal is not a resumable spec-code run.",
    );
  return result(input.journal_path, events, bytes, snapshot);
}

function assertSubject(actual: WorkflowJournalSubject, expected: WorkflowJournalSubject): void {
  if (
    actual.project_id !== expected.project_id ||
    actual.mode !== expected.mode ||
    actual.run_id !== expected.run_id ||
    actual.producer_id !== expected.producer_id ||
    actual.change_id !== expected.change_id
  )
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_SUBJECT_MISMATCH",
      "The retained workflow journal describes another project, run, producer, mode, or Change.",
    );
}

export async function initializeWorkflowJournal(input: {
  readonly store: WorkflowJournalStore;
  readonly project_id: ProjectId;
  readonly run_id: string;
  readonly producer_id: string;
  readonly change_id?: string;
  readonly observation_start?: WorkflowObservationStart;
  readonly current_stage_id?: SpecCodeWorkflowStageId;
}): Promise<WorkflowJournalResult> {
  assertBoundedIdentity(input.run_id, "Run identity");
  assertBoundedIdentity(input.producer_id, "Producer identity");
  const changeId = input.change_id ?? `pre-change:${input.run_id}`;
  assertBoundedIdentity(changeId, "Change identity");
  const observationStart = input.observation_start ?? "complete";
  const currentStageId = input.current_stage_id ?? "workflow-initialization";
  const journalPath = workflowJournalPath(input.run_id);
  const started = parseWorkflowEvent(
    {
      schema_version: "1.0",
      artifact_type: "workflow_event",
      project_id: input.project_id,
      change_id: changeId,
      run_id: input.run_id,
      producer_id: input.producer_id,
      sequence: 0,
      event_type: "run_started",
      mode: "spec-code",
      observation_start: observationStart,
      current_stage_id: currentStageId,
    },
    input.project_id,
  );
  const bytes = serialize([started]);
  await input.store.create(journalPath, bytes);
  const snapshot = replayWorkflowEvents([started], input.project_id);
  const created = result(journalPath, [started], bytes, snapshot);
  const { events: _events, bytes: _bytes, ...publicResult } = created;
  return publicResult;
}

export async function resumeWorkflowJournal(input: {
  readonly store: WorkflowJournalStore;
  readonly journal_path: ProjectPath;
  readonly subject: WorkflowJournalSubject;
  readonly expected_journal_fingerprint?: Fingerprint;
}): Promise<WorkflowJournalResult> {
  const current = await readWorkflowJournal({
    store: input.store,
    journal_path: input.journal_path,
    project_id: input.subject.project_id,
  });
  assertSubject(current, input.subject);
  if (
    input.expected_journal_fingerprint !== undefined &&
    input.expected_journal_fingerprint !== current.journal_fingerprint
  )
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_STALE_WRITER",
      "The retained workflow journal fingerprint is stale.",
    );
  const { events: _events, bytes: _bytes, ...publicResult } = current;
  return publicResult;
}

export async function publishWorkflowJournalEvent(input: {
  readonly store: WorkflowJournalStore;
  readonly journal_path: ProjectPath;
  readonly subject: WorkflowJournalSubject;
  readonly expected_sequence: number;
  readonly expected_journal_fingerprint: Fingerprint;
  readonly payload: WorkflowJournalEventPayload;
}): Promise<WorkflowJournalPublicationResult> {
  const current = await readWorkflowJournal({
    store: input.store,
    journal_path: input.journal_path,
    project_id: input.subject.project_id,
  });
  assertSubject(current, input.subject);
  const candidate = parseWorkflowEvent(
    {
      schema_version: "1.0",
      artifact_type: "workflow_event",
      project_id: input.subject.project_id,
      change_id: input.subject.change_id,
      run_id: input.subject.run_id,
      producer_id: input.subject.producer_id,
      sequence: input.expected_sequence,
      ...input.payload,
    },
    input.subject.project_id,
  );
  const existing = current.events[input.expected_sequence];
  if (existing !== undefined) {
    if (fingerprintWorkflowEvent(existing) !== fingerprintWorkflowEvent(candidate))
      throw new WorkflowJournalError(
        "SDD_OBSERVATION_SEQUENCE_CONFLICT",
        "The expected sequence is already occupied by a conflicting event.",
      );
    const { events: _events, bytes: _bytes, ...publicResult } = current;
    return { ...publicResult, publication: "duplicate" };
  }
  if (input.expected_sequence !== current.next_sequence)
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_SEQUENCE_GAP",
      "The publication does not supply the exact next workflow sequence.",
    );
  if (input.expected_journal_fingerprint !== current.journal_fingerprint)
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_STALE_WRITER",
      "The workflow journal changed after the writer read it.",
    );
  const events = [...current.events, candidate];
  const snapshot = replayWorkflowEvents(events, input.subject.project_id);
  const bytes = serialize(events);
  if (bytes.byteLength > DEFAULT_WORKFLOW_JOURNAL_MAX_BYTES)
    throw new WorkflowJournalError(
      "SDD_OBSERVATION_JOURNAL_LIMIT_EXCEEDED",
      "The workflow journal publication exceeds its byte limit.",
    );
  await input.store.replace(input.journal_path, current.journal_fingerprint, bytes);
  const published = result(input.journal_path, events, bytes, snapshot);
  const { events: _events, bytes: _bytes, ...publicResult } = published;
  return { ...publicResult, publication: "published" };
}
