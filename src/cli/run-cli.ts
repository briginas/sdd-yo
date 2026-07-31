import type { Diagnostic } from "../contracts/diagnostics.ts";
import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { ObjectId, ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import { isObjectId, isProjectPath } from "../contracts/identifiers.ts";
import type { CliResponseEnvelope } from "../contracts/result.ts";
import { resolve } from "node:path";
import type { FileSystem } from "../platform/filesystem.ts";
import { fingerprintValidatedObject } from "../fingerprint/object-fingerprint.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import { validateSpecificationGraph } from "../graph/validate-graph.ts";
import { loadSpecificationDocuments } from "../markdown/load-documents.ts";
import type { CapabilityDocument, ConceptDocument, Requirement, SpecificationDocument } from "../markdown/types.ts";
import { resolveConfiguredPath, resolveProject } from "../config/resolve-project.ts";

export const VALID_EXIT_CODE = 0 as const;
export const BLOCKED_EXIT_CODE = 1 as const;
export const TECHNICAL_FAILURE_EXIT_CODE = 3 as const;

type ExitCode = typeof VALID_EXIT_CODE | typeof BLOCKED_EXIT_CODE | typeof TECHNICAL_FAILURE_EXIT_CODE;
type OutputFormat = "human" | "json";
type Command = "validate" | "inspect";
type ResponseCommand = Command | "unknown";

export type CliRuntime = {
  readonly argv: readonly string[];
  readonly workingDirectory: string;
  readonly fileSystem: FileSystem;
  readonly writeStandardOutput: (message: string) => void;
  readonly writeStandardError: (message: string) => void;
  readonly writeOutputFile: (path: string, message: string) => void;
};

type Invocation = {
  readonly command: Command;
  readonly format: OutputFormat;
  readonly configPath?: string;
  readonly cwd?: string;
  readonly objectId?: ObjectId;
  readonly outputPath?: ProjectPath;
  readonly includeExplanatory: boolean;
};

export type ValidateResult = {
  readonly valid: true;
  readonly object_counts: { readonly capabilities: number; readonly requirements: number; readonly concepts: number };
  readonly fingerprints: readonly {
    readonly type: "capability" | "requirement" | "concept";
    readonly id: ObjectId;
    readonly semantic?: string;
    readonly structural: string;
  }[];
};

export type InspectResult = {
  readonly object: Readonly<Record<string, unknown>>;
  readonly document_path: ProjectPath;
  readonly reverse_relations: readonly { readonly type: string; readonly source_id: ObjectId }[];
  readonly fingerprints: Readonly<Record<string, string>>;
};

export type CliResponse =
  | CliResponseEnvelope<"validate", "ok", ValidateResult>
  | CliResponseEnvelope<"inspect", "ok", InspectResult>
  | CliResponseEnvelope<Command, "blocked", { readonly valid: false } | null>
  | CliResponseEnvelope<ResponseCommand, "error", null>;

function cliDiagnostic(codeValue: string, message: string, remediation: string): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid CLI diagnostic ${codeValue}.`);
  return { code: codeValue, severity: "error", message, details: { remediation } };
}

function parseInvocation(
  argv: readonly string[],
): { ok: true; value: Invocation } | { ok: false; diagnostic: Diagnostic } {
  const command = argv[0];
  if (command !== "validate" && command !== "inspect")
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_COMMAND_INVALID",
        "The command is missing or unsupported.",
        "Use sdd validate or sdd inspect <object-id>.",
      ),
    };
  let format: OutputFormat = "human";
  let configPath: string | undefined;
  let cwd: string | undefined;
  let objectId: ObjectId | undefined;
  let outputPath: ProjectPath | undefined;
  let includeExplanatory = false;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--format" || argument === "--config" || argument === "--cwd" || argument === "--output") {
      const value = argv[index + 1];
      if (value === undefined)
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_OPTION_VALUE_REQUIRED",
            `${argument} requires a value.`,
            "Supply the option value.",
          ),
        };
      index += 1;
      if (argument === "--format") {
        if (value !== "human" && value !== "json")
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_FORMAT_INVALID",
              "Output format is unsupported.",
              "Use human or json.",
            ),
          };
        format = value;
      } else if (argument === "--config") configPath = value;
      else if (argument === "--cwd") cwd = value;
      else {
        if (!isProjectPath(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_OUTPUT_INVALID",
              "The output path must be project-relative and portable.",
              "Use a path inside the selected project without traversal segments.",
            ),
          };
        outputPath = value;
      }
    } else if (argument === "--quiet") {
      // The current commands emit no progress or non-primary human logs.
    } else if (argument === "--include") {
      if (argv[index + 1] !== "explanatory")
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_INCLUDE_INVALID",
            "The inspect include value is unsupported.",
            "Use --include explanatory.",
          ),
        };
      includeExplanatory = true;
      index += 1;
    } else if (command === "inspect" && objectId === undefined && isObjectId(argument)) objectId = argument;
    else
      return {
        ok: false,
        diagnostic: cliDiagnostic(
          "SDD_CONFIG_CLI_ARGUMENT_INVALID",
          "A command argument is invalid.",
          "Correct the command arguments.",
        ),
      };
  }
  if (configPath !== undefined && cwd !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_PROJECT_SELECTOR_CONFLICT",
        "--config and --cwd are mutually exclusive.",
        "Select exactly one project resolution option.",
      ),
    };
  if (command === "inspect" && objectId === undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_OBJECT_ID_REQUIRED",
        "inspect requires an object ID.",
        "Supply a CAP, REQ, or CON ID.",
      ),
    };
  if (command === "validate" && includeExplanatory)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "--include applies only to inspect.",
        "Remove --include.",
      ),
    };
  return {
    ok: true,
    value: {
      command,
      format,
      ...(configPath === undefined ? {} : { configPath }),
      ...(cwd === undefined ? {} : { cwd }),
      ...(objectId === undefined ? {} : { objectId }),
      ...(outputPath === undefined ? {} : { outputPath }),
      includeExplanatory,
    },
  };
}

function response(
  command: ResponseCommand,
  projectId: ProjectId | null,
  status: CliResponse["status"],
  result: unknown,
  diagnostics: readonly Diagnostic[],
): CliResponse {
  return { schema_version: "1.0", command, project_id: projectId, status, result, diagnostics } as CliResponse;
}

function owningDocument(graph: ValidatedSpecificationGraph, objectId: ObjectId): SpecificationDocument | undefined {
  for (const document of graph.documents.values()) {
    if ((document.type === "capability" || document.type === "concept") && document.id === objectId) return document;
    if (
      (document.type === "capability" || document.type === "capability-fragment") &&
      document.requirements.some((requirement) => requirement.id === objectId)
    )
      return document;
  }
  return undefined;
}

type ObjectFingerprints = { readonly structural: string; readonly semantic?: string };

function fingerprints(graph: ValidatedSpecificationGraph, objectId: ObjectId): ObjectFingerprints {
  const object = graph.objects.get(objectId);
  if (object === undefined) throw new Error("Cannot fingerprint an unknown object.");
  return !("anchor" in object) && object.type === "capability"
    ? { structural: fingerprintValidatedObject(graph, objectId, "structural") }
    : {
        semantic: fingerprintValidatedObject(graph, objectId, "semantic"),
        structural: fingerprintValidatedObject(graph, objectId, "structural"),
      };
}

function relations(object: CapabilityDocument | ConceptDocument | Requirement): readonly {
  type: string;
  target_id: ObjectId;
}[] {
  if (!("anchor" in object) && object.type === "capability") return [];
  return object.relations
    .map((relation) => ({ type: relation.type, target_id: relation.target_id }))
    .toSorted((left, right) =>
      left.type !== right.type
        ? left.type < right.type
          ? -1
          : 1
        : left.target_id < right.target_id
          ? -1
          : left.target_id > right.target_id
            ? 1
            : 0,
    );
}

function inspectResult(
  graph: ValidatedSpecificationGraph,
  objectId: ObjectId,
  explanatory: boolean,
): InspectResult | undefined {
  const object = graph.objects.get(objectId);
  if (object === undefined) return undefined;
  const document = owningDocument(graph, objectId);
  if (document === undefined) throw new Error("Validated object has no owning document.");
  const reverseRelations = [...graph.objects.values()]
    .flatMap((candidate) =>
      relations(candidate)
        .filter((relation) => relation.target_id === objectId)
        .map((relation) => ({ type: relation.type, source_id: candidate.id })),
    )
    .toSorted((left, right) =>
      left.type !== right.type
        ? left.type < right.type
          ? -1
          : 1
        : left.source_id < right.source_id
          ? -1
          : left.source_id > right.source_id
            ? 1
            : 0,
    );
  let value: Record<string, unknown>;
  if ("anchor" in object)
    value = {
      type: "requirement",
      id: object.id,
      title: object.title,
      kind: object.kind,
      verification: object.verification,
      owner_capability_id: object.owner,
      statement: object.statement,
      acceptance: object.acceptance,
      constraints: object.constraints,
      relations: relations(object),
      ...(explanatory ? { rationale: object.rationale ?? null, examples: object.examples ?? null } : {}),
    };
  else if (object.type === "concept")
    value = {
      type: "concept",
      id: object.id,
      title: object.title,
      definition: object.definition,
      identity: object.identity ?? null,
      states: object.states,
      relations: relations(object),
      ...(explanatory ? { rationale: object.rationale ?? null, examples: object.examples ?? null } : {}),
    };
  else
    value = {
      type: "capability",
      id: object.id,
      title: object.title,
      requirement_ids: [...graph.objects.values()]
        .filter((candidate): candidate is Requirement => "anchor" in candidate && candidate.owner === object.id)
        .map((requirement) => requirement.id)
        .toSorted(),
      ...(explanatory ? { purpose: object.purpose ?? null } : {}),
    };
  return {
    object: value,
    document_path: document.path,
    reverse_relations: reverseRelations,
    fingerprints: fingerprints(graph, objectId),
  };
}

function validateResult(graph: ValidatedSpecificationGraph): ValidateResult {
  const capabilities = [...graph.objects.values()].filter(
    (object) => !("anchor" in object) && object.type === "capability",
  );
  const concepts = [...graph.objects.values()].filter((object) => !("anchor" in object) && object.type === "concept");
  const requirements = [...graph.objects.values()].filter((object) => "anchor" in object);
  return {
    valid: true,
    object_counts: { capabilities: capabilities.length, requirements: requirements.length, concepts: concepts.length },
    fingerprints: [...graph.objects.entries()]
      .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([id, object]) => ({
        type: "anchor" in object ? "requirement" : object.type,
        id,
        ...fingerprints(graph, id),
      })),
  };
}

function humanView(value: CliResponse): string {
  const lines = [`${value.command}: ${value.status}`];
  if (value.project_id !== null) lines.push(`project: ${value.project_id}`);
  if (value.command === "validate" && value.status === "ok") {
    const counts = (value.result as { object_counts: { capabilities: number; requirements: number; concepts: number } })
      .object_counts;
    lines.push(
      `objects: ${counts.capabilities} capabilities, ${counts.requirements} requirements, ${counts.concepts} concepts`,
    );
  } else if (value.command === "inspect" && value.status === "ok") {
    const result = value.result as unknown as { object: { id: string; title: string }; document_path: string };
    lines.push(`${result.object.id} — ${result.object.title}`, `document: ${result.document_path}`);
  }
  for (const diagnostic of value.diagnostics)
    lines.push(`${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`);
  return `${lines.join("\n")}\n`;
}

function emit(runtime: CliRuntime, format: OutputFormat, value: CliResponse, outputTarget?: string): void {
  const rendered = format === "json" ? `${JSON.stringify(value)}\n` : humanView(value);
  if (outputTarget === undefined) runtime.writeStandardOutput(rendered);
  else runtime.writeOutputFile(outputTarget, rendered);
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function resolveSafeOutputTarget(
  fileSystem: FileSystem,
  projectRoot: string,
  outputPath: ProjectPath,
): Promise<{ ok: true; target: string } | { ok: false; diagnostic: Diagnostic }> {
  const segments = outputPath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const partial = segments.slice(0, index + 1).join("/");
    const target = resolveConfiguredPath(projectRoot, partial as ProjectPath);
    try {
      const metadata = await fileSystem.metadata(target);
      if (metadata.kind === "symbolic-link" || (index < segments.length - 1 && metadata.kind !== "directory"))
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_OUTPUT_UNSAFE",
            "The output path contains an unsafe component.",
            "Use an existing in-project directory path without symbolic links.",
          ),
        };
      if (index === segments.length - 1 && metadata.kind !== "file")
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_OUTPUT_INVALID",
            "The output target is not a regular file.",
            "Select a new path or an existing regular file.",
          ),
        };
    } catch (error) {
      if (isNotFound(error) && index === segments.length - 1) return { ok: true, target };
      return {
        ok: false,
        diagnostic: cliDiagnostic(
          "SDD_CONFIG_CLI_OUTPUT_PARENT_INVALID",
          "The output parent directory is unavailable.",
          "Create a safe in-project parent directory and run the command again.",
        ),
      };
    }
  }
  return { ok: true, target: resolveConfiguredPath(projectRoot, outputPath) };
}

export async function runCli(runtime: CliRuntime): Promise<ExitCode> {
  const parsed = parseInvocation(runtime.argv);
  const inferredCommand: ResponseCommand =
    runtime.argv[0] === "inspect" || runtime.argv[0] === "validate" ? runtime.argv[0] : "unknown";
  const inferredFormat: OutputFormat = runtime.argv.some(
    (argument, index) => argument === "--format" && runtime.argv[index + 1] === "json",
  )
    ? "json"
    : "human";
  if (!parsed.ok) {
    emit(runtime, inferredFormat, response(inferredCommand, null, "error", null, [parsed.diagnostic]));
    return TECHNICAL_FAILURE_EXIT_CODE;
  }
  const invocation = parsed.value;
  try {
    const selected = await resolveProject(
      runtime.fileSystem,
      invocation.configPath === undefined
        ? {
            kind: "nearest",
            start_directory:
              invocation.cwd === undefined
                ? runtime.workingDirectory
                : resolve(runtime.workingDirectory, invocation.cwd),
          }
        : { kind: "explicit", config_path: invocation.configPath, working_directory: runtime.workingDirectory },
    );
    if (!selected.ok) {
      emit(runtime, invocation.format, response(invocation.command, null, "error", null, selected.diagnostics));
      return TECHNICAL_FAILURE_EXIT_CODE;
    }
    const project = selected.value;
    const selectedOutput =
      invocation.outputPath === undefined
        ? undefined
        : await resolveSafeOutputTarget(runtime.fileSystem, project.project_root, invocation.outputPath);
    if (selectedOutput !== undefined && !selectedOutput.ok) {
      emit(
        runtime,
        invocation.format,
        response(invocation.command, project.configuration.project_id, "error", null, [selectedOutput.diagnostic]),
      );
      return TECHNICAL_FAILURE_EXIT_CODE;
    }
    const outputTarget = selectedOutput?.target;
    const loaded = await loadSpecificationDocuments(
      runtime.fileSystem,
      project.project_root,
      project.configuration.spec.root,
    );
    if (!loaded.ok) {
      const technical = loaded.diagnostics.some((item) => /_READ_FAILED$/u.test(item.code));
      emit(
        runtime,
        invocation.format,
        response(
          invocation.command,
          project.configuration.project_id,
          technical ? "error" : "blocked",
          invocation.command === "validate" && !technical ? { valid: false } : null,
          loaded.diagnostics,
        ),
        outputTarget,
      );
      return technical ? TECHNICAL_FAILURE_EXIT_CODE : BLOCKED_EXIT_CODE;
    }
    const graph = validateSpecificationGraph(loaded.value, project.configuration.spec.entrypoint);
    if (!graph.ok) {
      emit(
        runtime,
        invocation.format,
        response(
          invocation.command,
          project.configuration.project_id,
          "blocked",
          invocation.command === "validate" ? { valid: false } : null,
          graph.diagnostics,
        ),
        outputTarget,
      );
      return BLOCKED_EXIT_CODE;
    }
    if (invocation.command === "inspect") {
      const result = inspectResult(graph.value, invocation.objectId!, invocation.includeExplanatory);
      if (result === undefined) {
        const diagnostic = cliDiagnostic(
          "SDD_GRAPH_OBJECT_UNKNOWN",
          "The requested object does not exist in the active graph.",
          "Use an active CAP, REQ, or CON ID.",
        );
        emit(
          runtime,
          invocation.format,
          response(invocation.command, project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      emit(
        runtime,
        invocation.format,
        response(invocation.command, project.configuration.project_id, "ok", result, graph.diagnostics),
        outputTarget,
      );
      return VALID_EXIT_CODE;
    }
    emit(
      runtime,
      invocation.format,
      response(
        invocation.command,
        project.configuration.project_id,
        "ok",
        validateResult(graph.value),
        graph.diagnostics,
      ),
      outputTarget,
    );
    return VALID_EXIT_CODE;
  } catch {
    const diagnostic = cliDiagnostic(
      "SDD_CONFIG_CLI_INTERNAL_FAILURE",
      "The command did not complete.",
      "Retry the command and report the stable diagnostic code if it persists.",
    );
    emit(runtime, invocation.format, response(invocation.command, null, "error", null, [diagnostic]));
    runtime.writeStandardError("sdd: command failed with an internal technical error.\n");
    return TECHNICAL_FAILURE_EXIT_CODE;
  }
}
