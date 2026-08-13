import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isProjectId } from "../src/contracts/identifiers.ts";
import {
  parseWorkflowEvent,
  createWorkflowEventProducer,
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

test("REQ-291769E4 REQ-2F5B2571 REQ-0837358D serves a capability-protected accessible read-only loopback view", async (context) => {
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
