import { dirname, resolve } from "node:path";

import type { ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { ProjectWriter } from "../platform/project-writer.ts";
import type { Randomness } from "../platform/randomness.ts";
import { generateRandomId } from "../ids/generate-id.ts";

const encoder = new TextEncoder();

export type InitializeProjectOptions = {
  readonly root: string;
  readonly specPath: ProjectPath;
  readonly adoption: "incremental" | "complete";
};

export type InitializeProjectResult = {
  readonly projectId: ProjectId;
  readonly projectRoot: string;
  readonly createdPaths: readonly ProjectPath[];
};

export type InitializeProjectFailure = {
  readonly code: "ROOT_INVALID" | "TARGET_CONFLICT" | "TARGET_UNSAFE";
  readonly path?: string;
};

export type InitializeProjectDependencies = {
  readonly fileSystem: FileSystem;
  readonly writer: ProjectWriter;
  readonly randomness: Randomness;
};

function configSource(id: ProjectId, specPath: ProjectPath, adoption: "incremental" | "complete"): string {
  const entrypoint = `${specPath}/README.md`;
  return `schema_version: 1
project_id: ${id}
spec:
  root: ${JSON.stringify(specPath)}
  entrypoint: ${JSON.stringify(entrypoint)}
adoption:
  mode: ${adoption}
git:
  default_target_ref: main
ids:
  suffix_length: 8
  alphabet: hex-uppercase
tests:
  adapters: []
evidence:
  allowed_issuers: []
`;
}

function indexSource(): string {
  return `---
sdd:
  type: index
---

# Product specification

## Capabilities <!-- sdd:capabilities -->

## Domain concepts <!-- sdd:concepts -->
`;
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function initializeProject(
  dependencies: InitializeProjectDependencies,
  options: InitializeProjectOptions,
): Promise<{ ok: true; value: InitializeProjectResult } | { ok: false; failure: InitializeProjectFailure }> {
  let root: string;
  try {
    const metadata = await dependencies.fileSystem.metadata(options.root);
    if (metadata.kind !== "directory") return { ok: false, failure: { code: "ROOT_INVALID" } };
    root = await dependencies.fileSystem.realPath(options.root);
  } catch {
    return { ok: false, failure: { code: "ROOT_INVALID" } };
  }

  if (options.specPath === ".sdd" || options.specPath.startsWith(".sdd/")) {
    return { ok: false, failure: { code: "TARGET_UNSAFE", path: options.specPath } };
  }

  const specParents = options.specPath.split("/").map((_, index, segments) => segments.slice(0, index + 1).join("/"));
  const directories = [".sdd", ...specParents, `${options.specPath}/capabilities`, `${options.specPath}/concepts`];
  const files = [".sdd/config.yaml", `${options.specPath}/README.md`] as const;

  for (const relativePath of directories) {
    const target = resolve(root, relativePath);
    try {
      const metadata = await dependencies.fileSystem.metadata(target);
      if (metadata.kind !== "directory") return { ok: false, failure: { code: "TARGET_UNSAFE", path: relativePath } };
    } catch (error) {
      if (!isNotFound(error)) return { ok: false, failure: { code: "TARGET_UNSAFE", path: relativePath } };
    }
  }
  for (const relativePath of files) {
    try {
      await dependencies.fileSystem.metadata(resolve(root, relativePath));
      return { ok: false, failure: { code: "TARGET_CONFLICT", path: relativePath } };
    } catch (error) {
      if (!isNotFound(error)) return { ok: false, failure: { code: "TARGET_UNSAFE", path: relativePath } };
    }
  }

  const id = generateRandomId("project", dependencies.randomness) as ProjectId;
  for (const relativePath of directories) await dependencies.writer.createDirectory(resolve(root, relativePath));
  const contents = [configSource(id, options.specPath, options.adoption), indexSource()] as const;
  for (let index = 0; index < files.length; index += 1) {
    const target = resolve(root, files[index]!);
    await dependencies.writer.createDirectory(dirname(target));
    await dependencies.writer.writeFileExclusive(target, encoder.encode(contents[index]!));
  }

  return {
    ok: true,
    value: {
      projectId: id,
      projectRoot: root,
      createdPaths: [files[0], files[1], `${options.specPath}/capabilities`, `${options.specPath}/concepts`]
        .map((path) => path as ProjectPath)
        .toSorted(),
    },
  };
}
