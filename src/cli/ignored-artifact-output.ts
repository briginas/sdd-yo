import { resolve } from "node:path";

import { resolveConfiguredPath } from "../config/resolve-project.ts";
import type { ResolvedProject } from "../config/types.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { ProcessRunner } from "../platform/process-runner.ts";

export class IgnoredArtifactOutputError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "IgnoredArtifactOutputError";
    this.code = code;
  }
}

function notFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function resolveIgnoredArtifactTarget(input: {
  readonly fileSystem: FileSystem;
  readonly processRunner: ProcessRunner;
  readonly project: ResolvedProject;
  readonly path: ProjectPath;
}): Promise<string> {
  const { project, path } = input;
  if (path === project.configuration.spec.root || path.startsWith(`${project.configuration.spec.root}/`))
    throw new IgnoredArtifactOutputError(
      "SDD_ARTIFACT_TARGET_IN_SPEC",
      "The immutable artifact target is inside the governed specification tree.",
    );
  const segments = path.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const target = resolveConfiguredPath(project.project_root, segments.slice(0, index + 1).join("/") as ProjectPath);
    try {
      const metadata = await input.fileSystem.metadata(target);
      if (
        metadata.kind === "symbolic-link" ||
        (index < segments.length - 1 && metadata.kind !== "directory") ||
        (index === segments.length - 1 && metadata.kind !== "file") ||
        index === segments.length - 1
      )
        throw new IgnoredArtifactOutputError(
          index === segments.length - 1 ? "SDD_ARTIFACT_TARGET_EXISTS" : "SDD_ARTIFACT_TARGET_UNSAFE",
          index === segments.length - 1
            ? "The immutable artifact target already exists."
            : "The immutable artifact target contains an unsafe parent.",
        );
    } catch (error) {
      if (error instanceof IgnoredArtifactOutputError) throw error;
      if (notFound(error) && index === segments.length - 1) break;
      throw new IgnoredArtifactOutputError(
        "SDD_ARTIFACT_TARGET_UNSAFE",
        "The immutable artifact target parent is unavailable or unsafe.",
      );
    }
  }
  const ignored = await input.processRunner.run({
    executable: "git",
    arguments: ["check-ignore", "--quiet", "--", path],
    workingDirectory: project.project_root,
    environment: { GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" },
    timeoutMilliseconds: 30_000,
    maxOutputBytes: 1024 * 1024,
  });
  if (ignored.exitCode === 1)
    throw new IgnoredArtifactOutputError(
      "SDD_ARTIFACT_TARGET_NOT_IGNORED",
      "The immutable artifact target is not ignored by Git.",
    );
  if (ignored.exitCode !== 0)
    throw new IgnoredArtifactOutputError(
      "SDD_ARTIFACT_GIT_CHECK_FAILED",
      "Git could not validate the immutable artifact target.",
    );
  return resolve(project.project_root, ...path.split("/"));
}
