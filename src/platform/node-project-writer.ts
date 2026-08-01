import { createHash, randomUUID } from "node:crypto";
import { basename, dirname, relative, sep } from "node:path";
import { lstat, mkdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";

import type { ProjectWriter } from "./project-writer.ts";

export const nodeProjectWriter: ProjectWriter = {
  createDirectory: async (path) => mkdir(path, { recursive: true }).then(() => undefined),
  writeFileExclusive: async (path, content) => writeFile(path, content, { flag: "wx" }),
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
          if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
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
        throw new Error("A transaction target is outside its root.");
      const segments = containment.split(sep);
      let current = transactionRoot;
      for (let index = 0; index < segments.length; index += 1) {
        current = `${current}${sep}${segments[index]!}`;
        try {
          const metadata = await lstat(current);
          if (metadata.isSymbolicLink()) throw new Error("A transaction target contains a symbolic link.");
          if (index < segments.length - 1 && !metadata.isDirectory())
            throw new Error("A transaction target parent is not a directory.");
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
    let completed = false;
    try {
      for (const operation of operations) {
        const state = await safeTarget(operation.target);
        if (operation.operation === "create") {
          if (state !== "missing") throw new Error("A create target already exists.");
        } else if (state !== "file") {
          throw new Error("A replace or delete target is not a regular file.");
        }
      }
      for (let index = 0; index < operations.length; index += 1) {
        const operation = operations[index]!;
        await ensureParent(operation.target);
        if (operation.operation !== "delete") {
          const temporary = `${dirname(operation.target)}${sep}.${basename(operation.target)}.sdd-stage-${transactionId}-${index}`;
          await writeFile(temporary, operation.content, { flag: "wx" });
          staged.set(index, temporary);
        }
      }
      // Recheck every exact before state after staging and immediately before the first final-tree mutation.
      for (const operation of operations) {
        const state = await safeTarget(operation.target);
        if (operation.operation === "create") {
          if (state !== "missing") throw new Error("A create target appeared before replacement.");
        } else {
          if (state !== "file") throw new Error("A replace or delete target is not a regular file.");
          const hash = `sha256:${createHash("sha256")
            .update(await readFile(operation.target))
            .digest("hex")}`;
          if (hash !== operation.beforeSha256) throw new Error("A target changed before replacement.");
        }
      }
      for (let index = 0; index < operations.length; index += 1) {
        const operation = operations[index]!;
        const backup =
          operation.operation === "create"
            ? undefined
            : `${dirname(operation.target)}${sep}.${basename(operation.target)}.sdd-backup-${transactionId}-${index}`;
        if (backup !== undefined) {
          await rename(operation.target, backup);
          backups.set(index, backup);
        }
        let installed = false;
        try {
          if (operation.operation !== "delete") {
            await rename(staged.get(index)!, operation.target);
            staged.delete(index);
            installed = true;
          }
        } catch (error) {
          if (backup !== undefined) {
            await rename(backup, operation.target);
            backups.delete(index);
          }
          throw error;
        }
        applied.push({ index, target: operation.target, installed });
      }
      completed = true;
    } catch (error) {
      for (const item of applied.reverse()) {
        if (item.installed) await rm(item.target, { force: true });
        const backup = backups.get(item.index);
        if (backup !== undefined) {
          await rename(backup, item.target);
          backups.delete(item.index);
        }
      }
      await Promise.all([...staged.values()].map((path) => rm(path, { force: true })));
      staged.clear();
      for (const directory of createdDirectories.reverse()) {
        try {
          await rmdir(directory);
        } catch {
          // A non-empty directory contains a restored or unrelated entry and must remain.
        }
      }
      throw error;
    } finally {
      await Promise.all([...staged.values()].map((path) => rm(path, { force: true })));
      if (completed) await Promise.all([...backups.values()].map((path) => rm(path, { force: true })));
    }
  },
};
