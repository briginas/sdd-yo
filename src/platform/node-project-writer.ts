import { createHash, randomUUID } from "node:crypto";
import { open, lstat, mkdir, readFile, rename, rm, rmdir } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { SpecificationWritePreconditionError } from "./project-writer.ts";
import type { ProjectWriter } from "./project-writer.ts";

export type NodeProjectWriterPhase = "before-staging" | "after-staging" | "before-preflight" | "after-replacement";

export type NodeProjectWriterOptions = {
  readonly phaseHook?: (phase: NodeProjectWriterPhase, operationIndex: number | null) => Promise<void>;
  readonly rename?: (before: string, after: string) => Promise<void>;
};

const ROLLBACK_ATTEMPTS = 3;

function isUnsupportedSync(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "EINVAL" || error.code === "ENOSYS" || error.code === "ENOTSUP")
  );
}

async function retryRollback(operation: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < ROLLBACK_ATTEMPTS; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function createNodeProjectWriter(options: NodeProjectWriterOptions = {}): ProjectWriter {
  const renamePath = options.rename ?? rename;
  const phase = options.phaseHook ?? (async () => undefined);
  return {
    createDirectory: async (path) => mkdir(path, { recursive: true }).then(() => undefined),
    writeFileExclusive: async (path, content) => {
      const handle = await open(path, "wx");
      try {
        await handle.writeFile(content);
        try {
          await handle.sync();
        } catch (error) {
          if (!isUnsupportedSync(error)) throw error;
        }
      } finally {
        await handle.close();
      }
    },
    publishDirectoryExclusiveAtomically: async (transactionRoot, target, files) => {
      const containment = relative(transactionRoot, target);
      if (containment === "" || containment === ".." || containment.startsWith(`..${sep}`))
        throw new SpecificationWritePreconditionError(
          "SDD_PROPOSAL_BUNDLE_PATH_UNSAFE",
          "The proposal bundle target is outside its transaction root.",
        );
      let current = transactionRoot;
      for (const segment of containment.split(sep).slice(0, -1)) {
        current = resolve(current, segment);
        const metadata = await lstat(current);
        if (metadata.isSymbolicLink() || !metadata.isDirectory())
          throw new SpecificationWritePreconditionError(
            "SDD_PROPOSAL_BUNDLE_PATH_UNSAFE",
            "The proposal bundle target has an unsafe parent.",
          );
      }
      try {
        await lstat(target);
        throw new SpecificationWritePreconditionError(
          "SDD_PROPOSAL_BUNDLE_TARGET_EXISTS",
          "The proposal bundle target already exists.",
        );
      } catch (error) {
        if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
      }
      const seen = new Set<string>();
      for (const file of files) {
        if (
          file.path.length === 0 ||
          isAbsolute(file.path) ||
          file.path.split(/[\\/]/u).some((segment) => segment === "" || segment === "." || segment === "..") ||
          seen.has(file.path)
        )
          throw new SpecificationWritePreconditionError(
            "SDD_PROPOSAL_BUNDLE_MEMBER_UNSAFE",
            "A proposal bundle member path is unsafe or duplicated.",
          );
        seen.add(file.path);
      }
      const staged = `${dirname(target)}${sep}.${basename(target)}.sdd-stage-${randomUUID()}`;
      let published = false;
      try {
        await mkdir(staged, { mode: 0o700 });
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index]!;
          await phase("before-staging", index);
          const stagedTarget = resolve(staged, ...file.path.split("/"));
          await mkdir(dirname(stagedTarget), { recursive: true, mode: 0o700 });
          const handle = await open(stagedTarget, "wx", 0o600);
          try {
            await handle.writeFile(file.content);
            try {
              await handle.sync();
            } catch (error) {
              if (!isUnsupportedSync(error)) throw error;
            }
          } finally {
            await handle.close();
          }
          await phase("after-staging", index);
        }
        await phase("before-preflight", null);
        try {
          await lstat(target);
          throw new SpecificationWritePreconditionError(
            "SDD_PROPOSAL_BUNDLE_TARGET_EXISTS",
            "The proposal bundle target appeared before publication.",
          );
        } catch (error) {
          if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
        }
        await renamePath(staged, target);
        published = true;
        await phase("after-replacement", null);
      } finally {
        if (!published) await rm(staged, { recursive: true, force: true });
      }
    },
    replaceSpecificationFilesAtomically: async (transactionRoot, operations) => {
      const transactionId = randomUUID();
      const staged = new Map<number, string>();
      const backups = new Map<number, string>();
      const applied: { readonly index: number; readonly target: string; readonly installed: boolean }[] = [];
      const createdDirectories: string[] = [];
      const ensureParent = async (target: string): Promise<void> => {
        const missing: string[] = [];
        let current = dirname(target);
        while (current !== transactionRoot) {
          try {
            await lstat(current);
            break;
          } catch (error) {
            if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"))
              throw error;
            missing.push(current);
            current = dirname(current);
          }
        }
        for (const directory of missing.reverse()) {
          await mkdir(directory);
          createdDirectories.push(directory);
        }
      };
      const safeTarget = async (target: string): Promise<"missing" | "file" | "directory" | "other"> => {
        const containment = relative(transactionRoot, target);
        if (containment === "" || containment === ".." || containment.startsWith(`..${sep}`))
          throw new SpecificationWritePreconditionError(
            "SDD_APPLY_PATH_UNSAFE",
            "A transaction target is outside its root.",
          );
        const segments = containment.split(sep);
        let current = transactionRoot;
        for (let index = 0; index < segments.length; index += 1) {
          current = `${current}${sep}${segments[index]!}`;
          try {
            const metadata = await lstat(current);
            if (metadata.isSymbolicLink())
              throw new SpecificationWritePreconditionError(
                "SDD_APPLY_PATH_UNSAFE",
                "A transaction target contains a symbolic link.",
              );
            if (index < segments.length - 1 && !metadata.isDirectory())
              throw new SpecificationWritePreconditionError(
                "SDD_APPLY_PATH_UNSAFE",
                "A transaction target parent is not a directory.",
              );
            if (index === segments.length - 1)
              return metadata.isFile() ? "file" : metadata.isDirectory() ? "directory" : "other";
          } catch (error) {
            if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
              return "missing";
            throw error;
          }
        }
        return "missing";
      };
      const removeStaged = async (): Promise<void> => {
        for (const [index, path] of staged) {
          await retryRollback(() => rm(path, { force: true }));
          staged.delete(index);
        }
      };
      let completed = false;
      try {
        for (const operation of operations) {
          const state = await safeTarget(operation.target);
          if (operation.operation === "create") {
            if (state !== "missing")
              throw new SpecificationWritePreconditionError(
                "SDD_APPLY_TARGET_EXISTS",
                "A create target already exists.",
              );
          } else if (state !== "file") {
            throw new SpecificationWritePreconditionError(
              "SDD_APPLY_TARGET_INVALID",
              "A replace or delete target is not a regular file.",
            );
          }
        }
        for (let index = 0; index < operations.length; index += 1) {
          const operation = operations[index]!;
          await phase("before-staging", index);
          await ensureParent(operation.target);
          if (operation.operation !== "delete") {
            const temporary = `${dirname(operation.target)}${sep}.${basename(operation.target)}.sdd-stage-${transactionId}-${index}`;
            const handle = await open(temporary, "wx", 0o600);
            staged.set(index, temporary);
            try {
              await handle.writeFile(operation.content);
              try {
                await handle.sync();
              } catch (error) {
                if (!isUnsupportedSync(error)) throw error;
              }
            } finally {
              await handle.close();
            }
          }
          await phase("after-staging", index);
        }
        await phase("before-preflight", null);
        // Recheck every exact before state immediately before the first final-tree mutation.
        for (const operation of operations) {
          const state = await safeTarget(operation.target);
          if (operation.operation === "create") {
            if (state !== "missing")
              throw new SpecificationWritePreconditionError(
                "SDD_APPLY_TARGET_EXISTS",
                "A create target appeared before replacement.",
              );
          } else {
            if (state !== "file")
              throw new SpecificationWritePreconditionError(
                "SDD_APPLY_TARGET_INVALID",
                "A replace or delete target is not a regular file.",
              );
            const hash = `sha256:${createHash("sha256")
              .update(await readFile(operation.target))
              .digest("hex")}`;
            if (hash !== operation.beforeSha256)
              throw new SpecificationWritePreconditionError(
                "SDD_APPLY_BEFORE_MISMATCH",
                "A target changed before replacement.",
              );
          }
        }
        for (let index = 0; index < operations.length; index += 1) {
          const operation = operations[index]!;
          const backup =
            operation.operation === "create"
              ? undefined
              : `${dirname(operation.target)}${sep}.${basename(operation.target)}.sdd-backup-${transactionId}-${index}`;
          if (backup !== undefined) {
            await renamePath(operation.target, backup);
            backups.set(index, backup);
          }
          let installed = false;
          try {
            if (operation.operation !== "delete") {
              await renamePath(staged.get(index)!, operation.target);
              staged.delete(index);
              installed = true;
            }
          } catch (error) {
            if (backup !== undefined) {
              await retryRollback(() => renamePath(backup, operation.target));
              backups.delete(index);
            }
            throw error;
          }
          applied.push({ index, target: operation.target, installed });
          await phase("after-replacement", index);
        }
        completed = true;
      } catch (error) {
        for (const item of applied.reverse()) {
          if (item.installed) await retryRollback(() => rm(item.target, { force: true }));
          const backup = backups.get(item.index);
          if (backup !== undefined) {
            await retryRollback(() => renamePath(backup, item.target));
            backups.delete(item.index);
          }
        }
        await removeStaged();
        for (const directory of createdDirectories.reverse()) {
          try {
            await retryRollback(() => rmdir(directory));
          } catch {
            // A non-empty directory contains a restored or unrelated entry and must remain.
          }
        }
        throw error;
      } finally {
        await removeStaged();
        if (completed) for (const backup of backups.values()) await retryRollback(() => rm(backup, { force: true }));
      }
    },
  };
}

export const nodeProjectWriter: ProjectWriter = createNodeProjectWriter();
