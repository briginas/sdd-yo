import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isProjectId } from "../src/contracts/identifiers.ts";
import {
  parseWorkflowEvent,
  createWorkflowEventProducer,
  renderWorkflowObserver,
  replayWorkflowEvents,
  retainWorkflowRuns,
  startWorkflowObserver,
  WorkflowObservationError,
} from "../src/observation/index.ts";
import type { WorkflowEvent } from "../src/observation/index.ts";

const projectIdValue = "SDD-17EF8B29";
assert.ok(isProjectId(projectIdValue));
const projectId = projectIdValue;

function event(sequence: number, specific: Record<string, unknown>): WorkflowEvent {
  return {
    schema_version: "1.0",
    artifact_type: "workflow_event",
    project_id: projectId,
    change_id: "milestone-30",
    run_id: "run-1",
    producer_id: "test-producer",
    sequence,
    ...specific,
  } as WorkflowEvent;
}

const completedEvents = [
  event(0, { event_type: "run_started" }),
  event(1, { event_type: "step_started", step_id: "author", label: "Author specification" }),
  event(2, { event_type: "step_waiting", step_id: "author", reason: "Human approval" }),
  event(3, { event_type: "status_observed", axis: "approval", value: "approved" }),
  event(4, { event_type: "step_completed", step_id: "author" }),
  event(5, { event_type: "status_observed", axis: "cli", value: "ok" }),
  event(6, { event_type: "status_observed", axis: "readiness", value: "REVIEW_REQUIRED" }),
  event(7, { event_type: "status_observed", axis: "freshness", value: "current" }),
  event(8, { event_type: "status_observed", axis: "integration", value: "not_integrated" }),
  event(9, {
    event_type: "artifact_referenced",
    artifact: { kind: "merge_report", path: ".sdd/staging/merge-report.json" },
  }),
  event(10, { event_type: "run_completed" }),
] as const;

async function readSseFrame(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let retained = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) throw new Error("SSE stream ended before one complete frame.");
    retained += decoder.decode(value, { stream: true });
    const boundary = retained.indexOf("\n\n");
    if (boundary !== -1) return retained.slice(0, boundary);
  }
}

async function atomicWrite(file: string, contents: string): Promise<void> {
  const temporary = `${file}.next`;
  await writeFile(temporary, contents);
  await rename(temporary, file);
}

test("REQ-61673C24 rejects unknown, secret-bearing, cross-project, traversal, and oversized workflow events", () => {
  assert.throws(
    () => parseWorkflowEvent({ ...completedEvents[0], raw_stdout: "secret" }, projectId),
    (error: unknown) => error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_EVENT_INVALID",
  );
  assert.throws(
    () => parseWorkflowEvent({ ...completedEvents[0], project_id: "SDD-00000000" }, projectId),
    (error: unknown) => error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_PROJECT_MISMATCH",
  );
  assert.throws(
    () =>
      parseWorkflowEvent(
        event(1, { event_type: "artifact_referenced", artifact: { kind: "merge_report", path: "../secret" } }),
        projectId,
      ),
    (error: unknown) => error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_EVENT_INVALID",
  );
  assert.throws(
    () =>
      parseWorkflowEvent(event(1, { event_type: "step_started", step_id: "x", label: "x".repeat(100) }), projectId, {
        max_event_bytes: 20,
        max_string_bytes: 100,
        max_events: 10,
      }),
    (error: unknown) =>
      error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_EVENT_LIMIT_EXCEEDED",
  );
});

test("REQ-02F9FAB3 replays deterministically and treats exact duplicate delivery as idempotent", () => {
  const fresh = replayWorkflowEvents(completedEvents, projectId);
  const duplicated = replayWorkflowEvents([...completedEvents, completedEvents[3], completedEvents[10]], projectId);
  assert.deepEqual(duplicated, fresh);
  assert.equal(JSON.stringify(duplicated), JSON.stringify(fresh));
  assert.throws(
    () => replayWorkflowEvents([...completedEvents, { ...completedEvents[3], value: "rejected" }], projectId),
    (error: unknown) => error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_SEQUENCE_CONFLICT",
  );
  assert.throws(
    () => replayWorkflowEvents([completedEvents[0], completedEvents[2]], projectId),
    (error: unknown) => error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_SEQUENCE_GAP",
  );
});

test("REQ-1FD47FF6 keeps completed, approval, readiness, freshness, and integration independent", () => {
  const snapshot = replayWorkflowEvents(completedEvents, projectId);
  assert.equal(snapshot.execution, "completed");
  assert.equal(snapshot.cli_status, "ok");
  assert.equal(snapshot.approval_state, "approved");
  assert.equal(snapshot.merge_readiness, "REVIEW_REQUIRED");
  assert.equal(snapshot.artifact_freshness, "current");
  assert.equal(snapshot.integration_state, "not_integrated");
});

test("REQ-0837358D REQ-6A40513D renders the stable partial spec-code stage model without inference", () => {
  const snapshot = replayWorkflowEvents(
    [
      event(0, {
        event_type: "run_started",
        mode: "spec-code",
        observation_start: "partial",
        current_stage_id: "specification-candidate",
      }),
      event(1, {
        event_type: "stage_updated",
        stage_id: "specification-candidate",
        state: "waiting",
        reason: "Proposal materialization authority required",
      }),
    ],
    projectId,
  );
  assert.equal(snapshot.stages.length, 9);
  assert.equal(snapshot.current_stage_id, "specification-candidate");
  assert.deepEqual(
    snapshot.stages.slice(0, 2).map(({ state, reason }) => ({ state, reason })),
    [
      { state: "skipped", reason: "Not observed before partial start" },
      { state: "skipped", reason: "Not observed before partial start" },
    ],
  );
  const html = renderWorkflowObserver(snapshot, "safe-capability");
  assert.match(html, /Ordered workflow stages/u);
  assert.match(html, /Workflow initialization/u);
  assert.match(html, /Terminal outcome/u);
  assert.match(html, /Proposal materialization authority required/u);
});

test("REQ-09B6EA82 projects one exact eight-stage spec workflow with implementation not applicable", () => {
  const started = event(0, {
    event_type: "run_started",
    mode: "spec",
    accepted_behavior: "Users can already export one report.",
    intended_qa_plan: "QA will compare the canonical example with the existing output.",
    observation_start: "partial",
    current_stage_id: "specification-candidate",
  });
  const snapshot = replayWorkflowEvents([started], projectId);

  assert.equal(snapshot.mode, "spec");
  assert.equal(snapshot.accepted_behavior, "Users can already export one report.");
  assert.equal(snapshot.intended_qa_plan, "QA will compare the canonical example with the existing output.");
  assert.equal(snapshot.implementation_state, "not_applicable");
  assert.equal(snapshot.base_ref, null);
  assert.deepEqual(snapshot.code_targets, []);
  assert.deepEqual(
    snapshot.stages.map(({ stage_id }) => stage_id),
    [
      "workflow-initialization",
      "semantic-model",
      "specification-candidate",
      "proposal-decision",
      "exact-specification-patch",
      "verification-and-review",
      "local-integration",
      "terminal-outcome",
    ],
  );
  assert.deepEqual(
    snapshot.stages.slice(0, 2).map(({ state, reason }) => ({ state, reason })),
    [
      { state: "skipped", reason: "Not observed before partial start" },
      { state: "skipped", reason: "Not observed before partial start" },
    ],
  );
  assert.ok(snapshot.stages.every(({ stage_id }) => stage_id !== "implementation"));
  assert.equal(snapshot.approval_state, "unavailable");
  assert.equal(snapshot.artifacts.length, 0);
  const html = renderWorkflowObserver(snapshot, "safe-capability");
  assert.match(html, /<h2>Implementation<\/h2><p id="implementation-state">not applicable<\/p>/u);
  assert.match(html, /Accepted behavior specification context/u);
  assert.match(html, /Users can already export one report\./u);
  assert.match(html, /QA will compare the canonical example with the existing output\./u);
  assert.match(html, /Descriptive context only · not approval, QA evidence, test execution evidence/u);

  assert.throws(
    () =>
      replayWorkflowEvents(
        [started, event(1, { event_type: "stage_updated", stage_id: "implementation", state: "active" })],
        projectId,
      ),
    (error: unknown) =>
      error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_TRANSITION_INVALID",
  );
  assert.throws(
    () => parseWorkflowEvent({ ...started, intended_qa_plan: undefined }, projectId),
    (error: unknown) => error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_EVENT_INVALID",
  );
});

test("REQ-7B9B6531 projects one exact seven-stage code workflow without specification ceremony", () => {
  const semanticFingerprint = `sha256:${"1".repeat(64)}`;
  const structuralFingerprint = `sha256:${"2".repeat(64)}`;
  const snapshot = replayWorkflowEvents(
    [
      event(0, {
        event_type: "run_started",
        mode: "code",
        base_ref: "base-object-35",
        code_targets: [
          {
            requirement_id: "REQ-7B9B6531",
            semantic_fingerprint: semanticFingerprint,
            structural_fingerprint: structuralFingerprint,
          },
        ],
        observation_start: "complete",
        current_stage_id: "workflow-initialization",
      }),
    ],
    projectId,
  );

  assert.equal(snapshot.mode, "code");
  assert.equal(snapshot.base_ref, "base-object-35");
  assert.deepEqual(snapshot.code_targets, [
    {
      requirement_id: "REQ-7B9B6531",
      semantic_fingerprint: semanticFingerprint,
      structural_fingerprint: structuralFingerprint,
    },
  ]);
  assert.deepEqual(
    snapshot.stages.map(({ stage_id }) => stage_id),
    [
      "workflow-initialization",
      "code-proposal",
      "proposal-decision",
      "implementation",
      "verification-and-review",
      "local-integration",
      "terminal-outcome",
    ],
  );
  assert.ok(
    snapshot.stages.every(
      ({ stage_id }) =>
        stage_id !== "semantic-model" &&
        stage_id !== "specification-candidate" &&
        stage_id !== "exact-specification-patch",
    ),
  );
});

test("REQ-7B9B6531 marks partial code stages unobserved and rejects code subject or stage drift", () => {
  const target = {
    requirement_id: "REQ-7B9B6531",
    semantic_fingerprint: `sha256:${"3".repeat(64)}`,
    structural_fingerprint: `sha256:${"4".repeat(64)}`,
  };
  const started = event(0, {
    event_type: "run_started",
    mode: "code",
    base_ref: "base-object-35",
    code_targets: [target],
    observation_start: "partial",
    current_stage_id: "implementation",
  });
  const snapshot = replayWorkflowEvents([started], projectId);
  assert.deepEqual(
    snapshot.stages.slice(0, 3).map(({ state, reason }) => ({ state, reason })),
    [
      { state: "skipped", reason: "Not observed before partial start" },
      { state: "skipped", reason: "Not observed before partial start" },
      { state: "skipped", reason: "Not observed before partial start" },
    ],
  );
  assert.equal(snapshot.stages[3]?.state, "active");

  assert.throws(
    () => parseWorkflowEvent({ ...started, code_targets: [target, target] }, projectId),
    (error: unknown) => error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_EVENT_INVALID",
  );
  assert.throws(
    () =>
      replayWorkflowEvents(
        [started, event(1, { event_type: "stage_updated", stage_id: "semantic-model", state: "active" })],
        projectId,
      ),
    (error: unknown) =>
      error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_TRANSITION_INVALID",
  );
});

test("REQ-B2001FED REQ-627F78A2 represents interruption explicitly and evicts only whole runs", () => {
  const interrupted = replayWorkflowEvents(
    [
      event(0, { event_type: "run_started" }),
      event(1, { event_type: "run_interrupted", reason: "process terminated" }),
      event(2, { event_type: "observer_failed", diagnostic_code: "SDD_OBSERVATION_WRITE_FAILED" }),
    ],
    projectId,
  );
  assert.equal(interrupted.execution, "interrupted");
  assert.equal(interrupted.merge_readiness, null);
  assert.equal(interrupted.observer_diagnostic, "SDD_OBSERVATION_WRITE_FAILED");
  const runs = [
    { run_id: "a", events: [completedEvents[0]], bytes: 10 },
    { run_id: "b", events: [completedEvents[0]], bytes: 10 },
    { run_id: "c", events: [completedEvents[0]], bytes: 10 },
  ];
  assert.deepEqual(
    retainWorkflowRuns(runs, { max_runs: 2, max_bytes: 20 }).map(({ run_id }) => run_id),
    ["b", "c"],
  );
});

test("REQ-B2001FED isolates producer write failure and does not advance its sequence", async () => {
  const retained: WorkflowEvent[] = [];
  let fail = true;
  const producer = createWorkflowEventProducer({
    project_id: projectId,
    change_id: "milestone-30",
    run_id: "producer-run",
    producer_id: "skill",
    sink: {
      append: async (value) => {
        if (fail) throw new Error("injected observation failure");
        retained.push(value);
      },
    },
  });
  assert.deepEqual(await producer.emit({ event_type: "run_started" }), {
    ok: false,
    diagnostic_code: "SDD_OBSERVATION_WRITE_FAILED",
  });
  fail = false;
  const result = await producer.emit({ event_type: "run_started" });
  assert.equal(result.ok, true);
  assert.equal(retained[0]?.sequence, 0);
});

test("REQ-291769E4 REQ-2F5B2571 REQ-0837358D REQ-6A40513D serves a capability-protected accessible read-only loopback view", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sdd-observer-"));
  await mkdir(path.join(root, ".sdd/staging"), { recursive: true });
  await writeFile(path.join(root, ".sdd/staging/merge-report.json"), '{"artifact_type":"merge_report"}\n');
  const snapshot = replayWorkflowEvents(completedEvents, projectId);
  const session = await startWorkflowObserver({
    projectRoot: root,
    snapshot,
    randomness: { randomBytes: (length) => new Uint8Array(length).fill(7) },
  });
  context.after(() => session.close());
  const forbidden = await fetch(session.url.replace(session.capability, "wrong"));
  assert.equal(forbidden.status, 403);
  const page = await fetch(session.url);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /Read-only observer/u);
  assert.match(html, /Merge readiness/u);
  assert.match(html, /REVIEW REQUIRED/u);
  assert.match(html, /Approval/u);
  assert.match(html, /View only/u);
  assert.match(html, /aria-live="polite"/u);
  assert.match(html, /addEventListener\("snapshot"/u);
  assert.match(html, /replaceChildren/u);
  assert.doesNotMatch(html, /location\.reload/u);
  assert.doesNotMatch(html, /innerHTML/u);
  assert.doesNotMatch(html, /<button/u);
  const base = new URL(session.url);
  const artifactUrl = new URL("/artifact", base);
  artifactUrl.searchParams.set("cap", session.capability);
  artifactUrl.searchParams.set("path", ".sdd/staging/merge-report.json");
  const artifact = await fetch(artifactUrl);
  assert.equal(artifact.status, 200);
  assert.match(await artifact.text(), /merge_report/u);
  assert.equal(new URL(session.url).hostname, "127.0.0.1");
});

test("REQ-2F5B2571 REQ-5A23A618 publishes monotonic SSE ids and suppresses reconnect duplicates", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sdd-observer-cursor-"));
  const beforeCompletion = replayWorkflowEvents(completedEvents.slice(0, 10), projectId);
  const completed = replayWorkflowEvents(completedEvents, projectId);
  const session = await startWorkflowObserver({ projectRoot: root, snapshot: beforeCompletion });
  context.after(() => session.close());

  const eventsUrl = new URL("/events", session.url);
  eventsUrl.searchParams.set("cap", session.capability);
  eventsUrl.searchParams.set("after", String(beforeCompletion.last_sequence));
  const live = await fetch(eventsUrl);
  assert.equal(live.status, 200);
  assert.ok(live.body);
  const reader = live.body.getReader();
  session.publish(completed);
  const update = await readSseFrame(reader);
  assert.match(update, /^id: 10\nevent: snapshot\n/u);
  assert.match(update, /"execution":"completed"/u);

  assert.doesNotThrow(() => session.publish(completed));
  assert.throws(() => session.publish({ ...beforeCompletion, last_sequence: 8 }), /sequence moved backwards/u);
  assert.throws(
    () => session.publish({ ...completed, change_id: "another-change", last_sequence: 11 }),
    /subject changed/u,
  );

  const reconnectUrl = new URL(eventsUrl);
  reconnectUrl.searchParams.set("after", "9");
  const reconnect = await fetch(reconnectUrl);
  assert.ok(reconnect.body);
  assert.match(await readSseFrame(reconnect.body.getReader()), /^id: 10\nevent: snapshot\n/u);

  const invalidCursor = new URL(eventsUrl);
  invalidCursor.searchParams.set("after", "11");
  assert.equal((await fetch(invalidCursor)).status, 400);
  await reader.cancel();
});

test("REQ-5A23A618 follows atomic journal replacement and isolates malformed updates", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sdd-observer-follow-"));
  const journal = path.join(root, "workflow.jsonl");
  const initialEvents = [event(0, { event_type: "run_started" })];
  await writeFile(journal, `${JSON.stringify(initialEvents[0])}\n`);
  const readSnapshot = async () => {
    const lines = (await readFile(journal, "utf8")).trim().split("\n");
    return replayWorkflowEvents(
      lines.map((line) => JSON.parse(line) as unknown),
      projectId,
    );
  };
  const initial = await readSnapshot();
  const session = await startWorkflowObserver({
    projectRoot: root,
    snapshot: initial,
    follow: { journalPath: journal, readSnapshot },
  });
  context.after(() => session.close());

  const eventsUrl = new URL("/events", session.url);
  eventsUrl.searchParams.set("cap", session.capability);
  eventsUrl.searchParams.set("after", "0");
  const response = await fetch(eventsUrl);
  assert.ok(response.body);
  const reader = response.body.getReader();

  const next = event(1, { event_type: "step_started", step_id: "author", label: "Author specification" });
  await atomicWrite(journal, `${JSON.stringify(initialEvents[0])}\n${JSON.stringify(next)}\n`);
  const update = await readSseFrame(reader);
  assert.match(update, /^id: 1\nevent: snapshot\n/u);

  await atomicWrite(journal, "not-json\n");
  const condition = await readSseFrame(reader);
  assert.match(condition, /^event: observer_condition\ndata: /u);
  assert.match(condition, /SDD_OBSERVATION_JOURNAL_INVALID/u);

  const snapshotUrl = new URL("/snapshot", session.url);
  snapshotUrl.searchParams.set("cap", session.capability);
  const retained = (await (await fetch(snapshotUrl)).json()) as { readonly last_sequence: number };
  assert.equal(retained.last_sequence, 1);
  await reader.cancel();
});
