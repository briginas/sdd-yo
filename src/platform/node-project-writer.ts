import { mkdir, writeFile } from "node:fs/promises";

import type { ProjectWriter } from "./project-writer.ts";

export const nodeProjectWriter: ProjectWriter = {
  createDirectory: async (path) => mkdir(path, { recursive: true }).then(() => undefined),
  writeFileExclusive: async (path, content) => writeFile(path, content, { flag: "wx" }),
};
