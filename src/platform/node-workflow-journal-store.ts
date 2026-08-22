import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, readFile, realpath, rename, rm } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

import { isProjectPath, type Fingerprint, type ProjectPath } from "../contracts/identifiers.ts";
import { WorkflowJournalStoreError, type WorkflowJournalStore } from "./workflow-journal-store.ts";

function missing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function fingerprint(bytes: Uint8Array): Fingerprint {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}` as Fingerprint;
}

async function syncWrite(path: string, content: Uint8Array): Promise<void> {
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(content);
    try {
      await handle.sync();
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        (error.code !== "EINVAL" && error.code !== "ENOSYS" && error.code !== "ENOTSUP")
      )
        throw error;
    }
  } finally {
    await handle.close();
  }
}

export async function createNodeWorkflowJournalStore(projectRoot: string): Promise<WorkflowJournalStore> {
  const root = await realpath(projectRoot);

  const target = (path: ProjectPath): string => {
    if (!isProjectPath(path))
      throw new WorkflowJournalStoreError(
        "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE",
        "The workflow journal path is not a safe project path.",
      );
    const result = resolve(root, ...path.split("/"));
    const contained = relative(root, result);
    if (contained === "" || contained === ".." || contained.startsWith(`..${sep}`))
      throw new WorkflowJournalStoreError(
        "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE",
        "The workflow journal path is outside the project.",
      );
    return result;
  };

  const ensureSafeParent = async (selected: string): Promise<void> => {
    const parts = relative(root, dirname(selected)).split(sep).filter(Boolean);
    let cursor = root;
    for (const part of parts) {
      cursor = resolve(cursor, part);
      try {
        const metadata = await lstat(cursor);
        if (metadata.isSymbolicLink() || !metadata.isDirectory())
          throw new WorkflowJournalStoreError(
            "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE",
            "The workflow journal parent is not a contained regular directory.",
          );
      } catch (error) {
        if (!missing(error)) throw error;
        await mkdir(cursor, { mode: 0o700 });
      }
    }
  };

  const assertSafeFile = async (selected: string): Promise<void> => {
    await ensureSafeParent(selected);
    let metadata;
    try {
      metadata = await lstat(selected);
    } catch (error) {
      if (missing(error))
        throw new WorkflowJournalStoreError(
          "SDD_OBSERVATION_JOURNAL_NOT_FOUND",
          "The workflow journal does not exist.",
        );
      throw error;
    }
    if (metadata.isSymbolicLink() || !metadata.isFile())
      throw new WorkflowJournalStoreError(
        "SDD_OBSERVATION_JOURNAL_PATH_UNSAFE",
        "The workflow journal is not a contained regular file.",
      );
  };

  return {
    read: async (path) => {
      const selected = target(path);
      await assertSafeFile(selected);
      return readFile(selected);
    },
    create: async (path, content) => {
      const selected = target(path);
      await ensureSafeParent(selected);
      const staged = `${selected}.stage-${randomUUID()}`;
      try {
        await syncWrite(staged, content);
        await link(staged, selected);
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST")
          throw new WorkflowJournalStoreError(
            "SDD_OBSERVATION_JOURNAL_TARGET_EXISTS",
            "The workflow journal already exists.",
          );
        throw error;
      } finally {
        await rm(staged, { force: true });
      }
    },
    replace: async (path, expectedFingerprint, content) => {
      const selected = target(path);
      await ensureSafeParent(selected);
      const lock = `${selected}.lock`;
      let lockHandle;
      let ownsLock = false;
      try {
        try {
          lockHandle = await open(lock, "wx", 0o600);
          ownsLock = true;
        } catch (error) {
          if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST")
            throw new WorkflowJournalStoreError(
              "SDD_OBSERVATION_STALE_WRITER",
              "Another workflow journal writer owns the publication lock.",
            );
          throw error;
        }
        await assertSafeFile(selected);
        const current = await readFile(selected);
        if (fingerprint(current) !== expectedFingerprint)
          throw new WorkflowJournalStoreError(
            "SDD_OBSERVATION_STALE_WRITER",
            "The workflow journal changed after the writer read it.",
          );
        const staged = `${selected}.stage-${randomUUID()}`;
        try {
          await syncWrite(staged, content);
          await rename(staged, selected);
        } finally {
          await rm(staged, { force: true });
        }
      } finally {
        await lockHandle?.close();
        if (ownsLock) await rm(lock, { force: true });
      }
    },
  };
}
