import type { Fingerprint, ProjectPath } from "../contracts/identifiers.ts";

export type WorkflowJournalStore = {
  read(path: ProjectPath): Promise<Uint8Array>;
  create(path: ProjectPath, content: Uint8Array): Promise<void>;
  replace(path: ProjectPath, expectedFingerprint: Fingerprint, content: Uint8Array): Promise<void>;
};

export class WorkflowJournalStoreError extends Error {
  readonly code:
    | "SDD_OBSERVATION_JOURNAL_NOT_FOUND"
    | "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE"
    | "SDD_OBSERVATION_JOURNAL_TARGET_EXISTS"
    | "SDD_OBSERVATION_STALE_WRITER";

  constructor(code: WorkflowJournalStoreError["code"], message: string) {
    super(message);
    this.name = "WorkflowJournalStoreError";
    this.code = code;
  }
}
