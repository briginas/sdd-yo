import type { ProjectId } from "../contracts/identifiers.ts";
import { parseWorkflowEvent, type WorkflowEvent } from "./workflow.ts";

export type WorkflowEventPayload = Omit<
  WorkflowEvent,
  "schema_version" | "artifact_type" | "project_id" | "change_id" | "run_id" | "producer_id" | "sequence"
>;

export type WorkflowEventSink = {
  append(event: WorkflowEvent): Promise<void>;
};

export type WorkflowProducerResult =
  | { readonly ok: true; readonly event: WorkflowEvent }
  | { readonly ok: false; readonly diagnostic_code: "SDD_OBSERVATION_WRITE_FAILED" };

export function createWorkflowEventProducer(input: {
  readonly project_id: ProjectId;
  readonly change_id: string;
  readonly run_id: string;
  readonly producer_id: string;
  readonly sink: WorkflowEventSink;
}): { emit(payload: WorkflowEventPayload): Promise<WorkflowProducerResult> } {
  let sequence = 0;
  return {
    emit: async (payload) => {
      const event = parseWorkflowEvent(
        {
          schema_version: "1.0",
          artifact_type: "workflow_event",
          project_id: input.project_id,
          change_id: input.change_id,
          run_id: input.run_id,
          producer_id: input.producer_id,
          sequence,
          ...payload,
        },
        input.project_id,
      );
      try {
        await input.sink.append(event);
        sequence += 1;
        return { ok: true, event };
      } catch {
        return { ok: false, diagnostic_code: "SDD_OBSERVATION_WRITE_FAILED" };
      }
    },
  };
}
