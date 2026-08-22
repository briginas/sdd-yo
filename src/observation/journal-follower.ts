import { watch } from "node:fs";
import path from "node:path";

import type { WorkflowSnapshot } from "./workflow.ts";

export type WorkflowJournalFollower = {
  close(): void;
};

export type WorkflowJournalFollowCondition = "SDD_OBSERVATION_JOURNAL_UNREADABLE" | "SDD_OBSERVATION_JOURNAL_INVALID";

/**
 * File-system notifications are hints only. Every hint causes the caller's
 * complete journal reader to run; this boundary never interprets bytes or
 * derives event order from watcher delivery.
 */
export function followWorkflowJournal(options: {
  readonly journalPath: string;
  readonly readSnapshot: () => Promise<WorkflowSnapshot>;
  readonly publish: (snapshot: WorkflowSnapshot) => void;
  readonly reportCondition: (condition: WorkflowJournalFollowCondition | null) => void;
}): WorkflowJournalFollower {
  const directory = path.dirname(options.journalPath);
  const filename = path.basename(options.journalPath);
  let closed = false;
  let reading = false;
  let pending = false;

  const refresh = async (): Promise<void> => {
    if (closed) return;
    if (reading) {
      pending = true;
      return;
    }
    reading = true;
    try {
      do {
        pending = false;
        try {
          const snapshot = await options.readSnapshot();
          if (closed) return;
          options.publish(snapshot);
          options.reportCondition(null);
        } catch (error) {
          if (closed) return;
          const code = error instanceof Error && "code" in error ? String(error.code) : "";
          const unreadable = ["EACCES", "EIO", "ENOENT", "EPERM"].includes(code);
          options.reportCondition(
            unreadable ? "SDD_OBSERVATION_JOURNAL_UNREADABLE" : "SDD_OBSERVATION_JOURNAL_INVALID",
          );
        }
      } while (pending && !closed);
    } finally {
      reading = false;
    }
  };

  const watcher = watch(directory, { persistent: false }, (_eventType, changed) => {
    if (changed === null || changed.toString() === filename) void refresh();
  });
  watcher.on("error", () => {
    if (!closed) options.reportCondition("SDD_OBSERVATION_JOURNAL_UNREADABLE");
  });

  // Close the race between the caller's initial read and watcher creation.
  void refresh();

  return {
    close: () => {
      if (closed) return;
      closed = true;
      watcher.close();
    },
  };
}
