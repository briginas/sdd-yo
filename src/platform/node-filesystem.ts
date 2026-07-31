import { lstat, readdir, readFile, realpath } from "node:fs/promises";

import type { FileSystem, FileSystemEntryKind } from "./filesystem.ts";

export const nodeFileSystem: FileSystem = {
  readFile: async (path) => readFile(path),
  readDirectory: async (path) =>
    (await readdir(path, { withFileTypes: true })).map((entry) => ({
      name: entry.name,
      kind: (entry.isFile()
        ? "file"
        : entry.isDirectory()
          ? "directory"
          : entry.isSymbolicLink()
            ? "symbolic-link"
            : "other") as FileSystemEntryKind,
    })),
  metadata: async (path) => {
    const value = await lstat(path);
    return {
      kind: value.isFile()
        ? "file"
        : value.isDirectory()
          ? "directory"
          : value.isSymbolicLink()
            ? "symbolic-link"
            : "other",
      size: value.size,
    };
  },
  realPath: async (path) => realpath(path),
};
