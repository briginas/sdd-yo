import assert from "node:assert/strict";
import { mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  isGitObjectId,
  isProjectId,
  isRequirementId,
  type Fingerprint,
  type ProjectPath,
} from "../src/contracts/identifiers.ts";
import {
  initializeWorkflowJournal,
  publishWorkflowJournalEvent,
  readWorkflowJournal,
  resumeWorkflowJournal,
  WorkflowJournalError,
  WorkflowObservationError,
} from "../src/observation/index.ts";
import {
  createNodeWorkflowJournalStore,
  WorkflowJournalStoreError,
  type WorkflowJournalStore,
} from "../src/platform/index.ts";

const projectIdValue = "SDD-17EF8B29";
assert.ok(isProjectId(projectIdValue));
const projectId = projectIdValue;

async function initialized(
  overrides: {
    readonly observation_start?: "complete" | "partial";
    readonly current_stage_id?: "implementation";
  } = {},
) {
  const root = await mkdtemp(join(tmpdir(), "sdd-workflow-journal-"));
  const store = await createNodeWorkflowJournalStore(root);
  const created = await initializeWorkflowJournal({
    store,
    project_id: projectId,
    run_id: "run-34-3",
    producer_id: "skill",
    ...overrides,
  });
  return { root, store, created };
}

test("REQ-B5D3BE6B initializes one safe atomic resumable spec-code journal", async () => {
  const { root, store, created } = await initialized();
  assert.equal(created.journal_path, ".sdd/staging/workflow-observation/spec-code/run-34-3.jsonl");
  assert.equal(created.change_id, "pre-change:run-34-3");
  assert.equal(created.next_sequence, 1);
  assert.match(created.journal_fingerprint, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(created.snapshot.stages.length, 9);
  assert.equal(created.snapshot.stages[0]?.state, "active");
  assert.equal(created.snapshot.stages[8]?.stage_id, "terminal-outcome");
  assert.match(await readFile(join(root, created.journal_path), "utf8"), /"sequence":0/u);
  await assert.rejects(
    initializeWorkflowJournal({
      store,
      project_id: projectId,
      run_id: "run-34-3",
      producer_id: "skill",
    }),
    (error: unknown) =>
      error instanceof WorkflowJournalStoreError && error.code === "SDD_OBSERVATION_JOURNAL_TARGET_EXISTS",
  );
});

test("REQ-B5D3BE6B publishes by sequence and fingerprint CAS and treats an exact retry as duplicate", async () => {
  const { store, created } = await initialized();
  const subject = {
    project_id: projectId,
    mode: "spec-code" as const,
    run_id: created.run_id,
    producer_id: created.producer_id,
    change_id: created.change_id,
  };
  const published = await publishWorkflowJournalEvent({
    store,
    journal_path: created.journal_path,
    subject,
    expected_sequence: created.next_sequence,
    expected_journal_fingerprint: created.journal_fingerprint,
    payload: { event_type: "stage_updated", stage_id: "workflow-initialization", state: "completed" },
  });
  assert.equal(published.publication, "published");
  assert.equal(published.next_sequence, 2);
  const duplicate = await publishWorkflowJournalEvent({
    store,
    journal_path: created.journal_path,
    subject,
    expected_sequence: created.next_sequence,
    expected_journal_fingerprint: created.journal_fingerprint,
    payload: { event_type: "stage_updated", stage_id: "workflow-initialization", state: "completed" },
  });
  assert.equal(duplicate.publication, "duplicate");
  assert.equal(duplicate.journal_fingerprint, published.journal_fingerprint);
  await assert.rejects(
    publishWorkflowJournalEvent({
      store,
      journal_path: created.journal_path,
      subject,
      expected_sequence: published.next_sequence,
      expected_journal_fingerprint: created.journal_fingerprint,
      payload: { event_type: "stage_updated", stage_id: "semantic-model", state: "active" },
    }),
    (error: unknown) => error instanceof WorkflowJournalError && error.code === "SDD_OBSERVATION_STALE_WRITER",
  );
});

test("REQ-B5D3BE6B resumes only the exact retained workflow subject", async () => {
  const { store, created } = await initialized();
  const resumed = await resumeWorkflowJournal({
    store,
    journal_path: created.journal_path,
    subject: {
      project_id: projectId,
      mode: "spec-code",
      run_id: created.run_id,
      producer_id: created.producer_id,
      change_id: created.change_id,
    },
    expected_journal_fingerprint: created.journal_fingerprint,
  });
  assert.equal(resumed.next_sequence, 1);
  await assert.rejects(
    resumeWorkflowJournal({
      store,
      journal_path: created.journal_path,
      subject: {
        project_id: projectId,
        mode: "spec-code",
        run_id: "another-run",
        producer_id: created.producer_id,
        change_id: created.change_id,
      },
    }),
    (error: unknown) => error instanceof WorkflowJournalError && error.code === "SDD_OBSERVATION_SUBJECT_MISMATCH",
  );
});

test("REQ-B5D3BE6B REQ-6A40513D represents a partial start without fabricating earlier stages", async () => {
  const { created } = await initialized({ observation_start: "partial", current_stage_id: "implementation" });
  assert.equal(created.snapshot.observation_start, "partial");
  assert.deepEqual(
    created.snapshot.stages.slice(0, 5).map(({ state }) => state),
    ["skipped", "skipped", "skipped", "skipped", "skipped"],
  );
  assert.equal(created.snapshot.stages[5]?.state, "active");
  assert.match(created.snapshot.stages[0]?.reason ?? "", /Not observed/u);
});

test("REQ-B5D3BE6B REQ-7B9B6531 initializes and resumes one exact mode-scoped code journal", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-code-workflow-journal-"));
  const store = await createNodeWorkflowJournalStore(root);
  const requirementIdValue = "REQ-7B9B6531";
  const baseRefValue = "resolved-base-object";
  const anotherBaseRefValue = "another-base";
  assert.ok(isRequirementId(requirementIdValue));
  assert.ok(isGitObjectId(baseRefValue));
  assert.ok(isGitObjectId(anotherBaseRefValue));
  const codeTargets = [
    {
      requirement_id: requirementIdValue,
      semantic_fingerprint: `sha256:${"5".repeat(64)}` as Fingerprint,
      structural_fingerprint: `sha256:${"6".repeat(64)}` as Fingerprint,
    },
  ];
  const created = await initializeWorkflowJournal({
    store,
    project_id: projectId,
    mode: "code",
    run_id: "run-35-code",
    producer_id: "skill",
    base_ref: baseRefValue,
    code_targets: codeTargets,
  });
  assert.equal(created.journal_path, ".sdd/staging/workflow-observation/code/run-35-code.jsonl");
  assert.equal(created.mode, "code");
  if (created.mode !== "code") assert.fail("expected a code journal result");
  assert.equal(created.base_ref, "resolved-base-object");
  assert.deepEqual(created.code_targets, codeTargets);
  assert.equal(created.snapshot.stages.length, 7);

  const subject = {
    project_id: projectId,
    mode: "code" as const,
    run_id: created.run_id,
    producer_id: created.producer_id,
    change_id: created.change_id,
    base_ref: created.base_ref,
    code_targets: created.code_targets,
  };
  const resumed = await resumeWorkflowJournal({
    store,
    journal_path: created.journal_path,
    subject,
    expected_journal_fingerprint: created.journal_fingerprint,
  });
  assert.equal(resumed.next_sequence, 1);
  await assert.rejects(
    resumeWorkflowJournal({
      store,
      journal_path: created.journal_path,
      subject: { ...subject, base_ref: anotherBaseRefValue },
    }),
    (error: unknown) => error instanceof WorkflowJournalError && error.code === "SDD_OBSERVATION_SUBJECT_MISMATCH",
  );

  const published = await publishWorkflowJournalEvent({
    store,
    journal_path: created.journal_path,
    subject,
    expected_sequence: created.next_sequence,
    expected_journal_fingerprint: created.journal_fingerprint,
    payload: { event_type: "stage_updated", stage_id: "workflow-initialization", state: "completed" },
  });
  assert.equal(published.publication, "published");
  await assert.rejects(
    publishWorkflowJournalEvent({
      store,
      journal_path: created.journal_path,
      subject,
      expected_sequence: published.next_sequence,
      expected_journal_fingerprint: published.journal_fingerprint,
      payload: { event_type: "stage_updated", stage_id: "semantic-model", state: "active" },
    }),
    (error: unknown) =>
      error instanceof WorkflowObservationError && error.code === "SDD_OBSERVATION_TRANSITION_INVALID",
  );
});

test("REQ-B5D3BE6B REQ-09B6EA82 preserves one exact spec subject across resume and publication", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-spec-workflow-journal-"));
  const store = await createNodeWorkflowJournalStore(root);
  const created = await initializeWorkflowJournal({
    store,
    project_id: projectId,
    mode: "spec",
    run_id: "run-36-spec",
    producer_id: "skill",
    accepted_behavior: "The CLI already renders the selected report.",
    intended_qa_plan: "QA will compare the documented and current report shapes.",
  });
  assert.equal(created.mode, "spec");
  if (created.mode !== "spec") assert.fail("expected a spec journal result");
  assert.equal(created.journal_path, ".sdd/staging/workflow-observation/spec/run-36-spec.jsonl");
  assert.equal(created.accepted_behavior, "The CLI already renders the selected report.");
  assert.equal(created.intended_qa_plan, "QA will compare the documented and current report shapes.");
  assert.equal(created.snapshot.implementation_state, "not_applicable");
  assert.equal(created.snapshot.stages.length, 8);

  const subject = {
    project_id: projectId,
    mode: "spec" as const,
    run_id: created.run_id,
    producer_id: created.producer_id,
    change_id: created.change_id,
    accepted_behavior: created.accepted_behavior,
    intended_qa_plan: created.intended_qa_plan,
  };
  const resumed = await resumeWorkflowJournal({
    store,
    journal_path: created.journal_path,
    subject,
    expected_journal_fingerprint: created.journal_fingerprint,
  });
  assert.equal(resumed.next_sequence, 1);
  await assert.rejects(
    resumeWorkflowJournal({
      store,
      journal_path: created.journal_path,
      subject: { ...subject, intended_qa_plan: "A different QA plan." },
    }),
    (error: unknown) => error instanceof WorkflowJournalError && error.code === "SDD_OBSERVATION_SUBJECT_MISMATCH",
  );

  const published = await publishWorkflowJournalEvent({
    store,
    journal_path: created.journal_path,
    subject,
    expected_sequence: created.next_sequence,
    expected_journal_fingerprint: created.journal_fingerprint,
    payload: { event_type: "stage_updated", stage_id: "workflow-initialization", state: "completed" },
  });
  assert.equal(published.publication, "published");
  assert.equal(published.snapshot.accepted_behavior, subject.accepted_behavior);
  assert.equal(published.snapshot.intended_qa_plan, subject.intended_qa_plan);
});

test("REQ-B5D3BE6B rejects symbolic journal parents and preserves complete bytes on failed replacement", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-workflow-journal-root-"));
  const outside = await mkdtemp(join(tmpdir(), "sdd-workflow-journal-outside-"));
  await symlink(outside, join(root, ".sdd"));
  const unsafe = await createNodeWorkflowJournalStore(root);
  await assert.rejects(
    initializeWorkflowJournal({
      store: unsafe,
      project_id: projectId,
      run_id: "unsafe-run",
      producer_id: "skill",
    }),
    (error: unknown) =>
      error instanceof WorkflowJournalStoreError && error.code === "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE",
  );

  const { store, created } = await initialized();
  const before = await store.read(created.journal_path);
  const failing: WorkflowJournalStore = {
    read: (path) => store.read(path),
    create: (path, content) => store.create(path, content),
    replace: async () => {
      throw new Error("injected publication failure");
    },
  };
  await assert.rejects(
    publishWorkflowJournalEvent({
      store: failing,
      journal_path: created.journal_path,
      subject: {
        project_id: projectId,
        mode: "spec-code",
        run_id: created.run_id,
        producer_id: created.producer_id,
        change_id: created.change_id,
      },
      expected_sequence: 1,
      expected_journal_fingerprint: created.journal_fingerprint,
      payload: { event_type: "stage_updated", stage_id: "workflow-initialization", state: "completed" },
    }),
  );
  assert.deepEqual(await store.read(created.journal_path), before);
});

test("REQ-B5D3BE6B permits only one competing whole-journal CAS publication", async () => {
  const { store, created } = await initialized();
  const before = await store.read(created.journal_path);
  const left = new Uint8Array([...before, ...new TextEncoder().encode('{"writer":"left"}\n')]);
  const right = new Uint8Array([...before, ...new TextEncoder().encode('{"writer":"right"}\n')]);
  const attempts = await Promise.allSettled([
    store.replace(created.journal_path, created.journal_fingerprint, left),
    store.replace(created.journal_path, created.journal_fingerprint, right),
  ]);
  assert.equal(attempts.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(attempts.filter(({ status }) => status === "rejected").length, 1);
  const retained = await store.read(created.journal_path);
  assert.ok(Buffer.from(retained).equals(Buffer.from(left)) || Buffer.from(retained).equals(Buffer.from(right)));
});

test("REQ-B5D3BE6B rejects malformed, incomplete, and oversized whole journals", async () => {
  const values = new Map<string, Uint8Array>();
  const path = ".sdd/staging/workflow-observation/spec-code/run.jsonl" as ProjectPath;
  const store: WorkflowJournalStore = {
    read: async (selected) => values.get(selected)!,
    create: async (selected, bytes) => void values.set(selected, bytes),
    replace: async (selected, _expected: Fingerprint, bytes) => void values.set(selected, bytes),
  };
  values.set(path, new TextEncoder().encode("{}"));
  await assert.rejects(
    readWorkflowJournal({ store, journal_path: path, project_id: projectId }),
    (error: unknown) => error instanceof WorkflowJournalError && error.code === "SDD_OBSERVATION_JOURNAL_MALFORMED",
  );
  values.set(path, new Uint8Array(5));
  await assert.rejects(
    readWorkflowJournal({ store, journal_path: path, project_id: projectId, max_journal_bytes: 4 }),
    (error: unknown) =>
      error instanceof WorkflowJournalError && error.code === "SDD_OBSERVATION_JOURNAL_LIMIT_EXCEEDED",
  );
});
