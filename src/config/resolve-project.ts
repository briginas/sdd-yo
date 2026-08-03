import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { Diagnostic } from "../contracts/diagnostics.ts";
import { isProjectPath } from "../contracts/identifiers.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem, FileSystemMetadata } from "../platform/filesystem.ts";
import { parseProjectConfiguration } from "./parse-config.ts";
import type { ConfigurationResult } from "./result.ts";
import type { ResolvedProject } from "./types.ts";

const configRelativePath = join(".sdd", "config.yaml");

export type ProjectResolutionRequest =
  | {
      readonly kind: "explicit";
      readonly config_path: string;
      readonly working_directory: string;
    }
  | {
      readonly kind: "nearest";
      readonly start_directory: string;
    };

function resolutionDiagnostic(codeValue: string, message: string, details: Record<string, string>): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid internal diagnostic code: ${codeValue}`);
  return {
    code: codeValue,
    severity: "error",
    message,
    details: {
      ...details,
      remediation: "Use --cwd <project-root> or --config <project-root>/.sdd/config.yaml to select one SDD Project.",
    },
  };
}

function failure<Value>(item: Diagnostic): ConfigurationResult<Value> {
  return { ok: false, diagnostics: [item] };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function optionalMetadata(fileSystem: FileSystem, path: string): Promise<FileSystemMetadata | undefined> {
  try {
    return await fileSystem.metadata(path);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

async function findNearestConfig(fileSystem: FileSystem, startDirectory: string): Promise<string | undefined> {
  let directory = await fileSystem.realPath(resolve(startDirectory));
  while (true) {
    const candidate = join(directory, configRelativePath);
    const metadata = await optionalMetadata(fileSystem, candidate);
    if (metadata !== undefined) return candidate;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function hasExactConfigShape(path: string): boolean {
  return relative(dirname(dirname(path)), path) === configRelativePath;
}

export async function resolveProject(
  fileSystem: FileSystem,
  request: ProjectResolutionRequest,
): Promise<ConfigurationResult<ResolvedProject>> {
  let selectedPath: string | undefined;
  try {
    if (request.kind === "explicit") {
      selectedPath = resolve(request.working_directory, request.config_path);
      if (!hasExactConfigShape(selectedPath)) {
        return failure(
          resolutionDiagnostic(
            "SDD_CONFIG_PATH_INVALID",
            "The explicit configuration path must name .sdd/config.yaml.",
            { selection: "explicit" },
          ),
        );
      }
    } else {
      selectedPath = await findNearestConfig(fileSystem, request.start_directory);
    }
  } catch {
    return failure(
      resolutionDiagnostic("SDD_CONFIG_RESOLUTION_FAILED", "The configuration search path could not be resolved.", {
        selection: request.kind,
      }),
    );
  }

  if (selectedPath === undefined) {
    return failure(
      resolutionDiagnostic("SDD_CONFIG_NOT_FOUND", "No .sdd/config.yaml was found for the requested project.", {
        selection: request.kind,
      }),
    );
  }

  let metadata: FileSystemMetadata | undefined;
  try {
    metadata = await optionalMetadata(fileSystem, selectedPath);
  } catch {
    return failure(
      resolutionDiagnostic("SDD_CONFIG_READ_FAILED", "The selected configuration could not be inspected.", {
        selection: request.kind,
      }),
    );
  }
  if (metadata === undefined) {
    return failure(
      resolutionDiagnostic("SDD_CONFIG_NOT_FOUND", "The selected configuration does not exist.", {
        selection: request.kind,
      }),
    );
  }
  if (metadata.kind !== "file") {
    return failure(
      resolutionDiagnostic("SDD_CONFIG_NOT_FILE", "The selected configuration is not a regular file.", {
        selection: request.kind,
      }),
    );
  }

  let realConfigPath: string;
  let bytes: Uint8Array;
  try {
    realConfigPath = await fileSystem.realPath(selectedPath);
    bytes = await fileSystem.readFile(realConfigPath);
  } catch {
    return failure(
      resolutionDiagnostic("SDD_CONFIG_READ_FAILED", "The selected configuration could not be read.", {
        selection: request.kind,
      }),
    );
  }

  const configLocationValue: unknown = ".sdd/config.yaml";
  if (!isProjectPath(configLocationValue)) throw new Error("Internal configuration path is invalid.");
  const parsed = parseProjectConfiguration(bytes, configLocationValue);
  if (!parsed.ok) return parsed;

  return {
    ok: true,
    value: {
      config_path: realConfigPath,
      project_root: dirname(dirname(realConfigPath)),
      configuration: parsed.value,
    },
    diagnostics: [],
  };
}

export function resolveConfiguredPath(projectRoot: string, projectPath: ProjectPath): string {
  if (!isAbsolute(projectRoot)) throw new Error("Project root must be absolute.");
  return resolve(projectRoot, ...projectPath.split("/"));
}
