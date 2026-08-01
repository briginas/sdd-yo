import type { Diagnostic } from "../contracts/diagnostics.ts";
import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { GitObjectId, ObjectId, ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import { isObjectId, isProjectPath } from "../contracts/identifiers.ts";
import type { CliResponseEnvelope } from "../contracts/result.ts";
import { resolve } from "node:path";
import type { FileSystem } from "../platform/filesystem.ts";
import type { ProjectWriter } from "../platform/project-writer.ts";
import type { Randomness } from "../platform/randomness.ts";
import type { ProcessRunner } from "../platform/process-runner.ts";
import { discoverProcessGitReader, GitReadError } from "../platform/process-git-reader.ts";
import { initializeProject } from "../init/initialize-project.ts";
import type { GeneratedId, IdKind } from "../ids/generate-id.ts";
import { generateRandomIds, isIdKind, MAX_GENERATED_ID_COUNT } from "../ids/generate-id.ts";
import {
  buildCanonicalHistoryIndex,
  HistoryIndexError,
  loadCanonicalProjectObjectIdsAt,
} from "../ids/history-index.ts";
import { buildCurrentProjectIdentityIndex, ProjectIdentityError } from "../ids/project-identity.ts";
import { fingerprintValidatedObject } from "../fingerprint/object-fingerprint.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import { validateSpecificationGraph } from "../graph/validate-graph.ts";
import type { GraphTrace } from "../graph/query-graph.ts";
import { directReverseRelations, traceGraphObject } from "../graph/query-graph.ts";
import { loadSpecificationDocuments } from "../markdown/load-documents.ts";
import type { CapabilityDocument, ConceptDocument, Requirement, SpecificationDocument } from "../markdown/types.ts";
import { resolveConfiguredPath, resolveProject } from "../config/resolve-project.ts";

export const VALID_EXIT_CODE = 0 as const;
export const BLOCKED_EXIT_CODE = 1 as const;
export const TECHNICAL_FAILURE_EXIT_CODE = 3 as const;

type ExitCode = typeof VALID_EXIT_CODE | typeof BLOCKED_EXIT_CODE | typeof TECHNICAL_FAILURE_EXIT_CODE;
type OutputFormat = "human" | "json";
type Command = "init" | "id" | "validate" | "inspect" | "trace";
type ResponseCommand = Command | "unknown";

export type CliRuntime = {
  readonly argv: readonly string[];
  readonly workingDirectory: string;
  readonly fileSystem: FileSystem;
  readonly projectWriter: ProjectWriter;
  readonly randomness: Randomness;
  readonly processRunner: ProcessRunner;
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
  readonly root?: string;
  readonly specPath?: ProjectPath;
  readonly adoption?: "incremental" | "complete";
  readonly idKind?: IdKind;
  readonly count?: number;
  readonly historyRef?: string;
};

export type InitResult = {
  readonly created_paths: readonly ProjectPath[];
};

export type IdResult = {
  readonly candidates: readonly GeneratedId[];
  readonly history: {
    readonly status: "complete" | "incomplete" | "unchecked";
    readonly resolved_ref: GitObjectId | null;
  };
};

export type ValidateResult = {
  readonly valid: true;
  readonly history: {
    readonly status: "complete" | "incomplete";
    readonly resolved_ref: GitObjectId | null;
  };
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

export type TraceResult = GraphTrace;

export type CliResponse =
  | CliResponseEnvelope<"init", "ok", InitResult>
  | CliResponseEnvelope<"id", "ok", IdResult>
  | CliResponseEnvelope<"validate", "ok", ValidateResult>
  | CliResponseEnvelope<"inspect", "ok", InspectResult>
  | CliResponseEnvelope<"trace", "ok", TraceResult>
  | CliResponseEnvelope<Command, "blocked", { readonly valid: false } | null>
  | CliResponseEnvelope<ResponseCommand, "error", null>;

function cliDiagnostic(
  codeValue: string,
  message: string,
  remediation: string,
  severity: Diagnostic["severity"] = "error",
): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid CLI diagnostic ${codeValue}.`);
  return { code: codeValue, severity, message, details: { remediation } };
}

function parseInvocation(
  argv: readonly string[],
): { ok: true; value: Invocation } | { ok: false; diagnostic: Diagnostic } {
  const command = argv[0];
  if (command !== "init" && command !== "id" && command !== "validate" && command !== "inspect" && command !== "trace")
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_COMMAND_INVALID",
        "The command is missing or unsupported.",
        "Use sdd init, sdd id, sdd validate, sdd inspect <object-id>, or sdd trace <object-id>.",
      ),
    };
  let format: OutputFormat = "human";
  let configPath: string | undefined;
  let cwd: string | undefined;
  let objectId: ObjectId | undefined;
  let outputPath: ProjectPath | undefined;
  let includeExplanatory = false;
  let root: string | undefined;
  let specPath: ProjectPath | undefined;
  let adoption: "incremental" | "complete" | undefined;
  let idKind: IdKind | undefined;
  let count: number | undefined;
  let historyRef: string | undefined;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      argument === "--format" ||
      argument === "--config" ||
      argument === "--cwd" ||
      argument === "--output" ||
      argument === "--root" ||
      argument === "--spec-path" ||
      argument === "--adoption" ||
      argument === "--count" ||
      argument === "--history-ref"
    ) {
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
      else if (argument === "--root") root = value;
      else if (argument === "--spec-path") {
        if (!isProjectPath(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_SPEC_PATH_INVALID",
              "The specification path must be project-relative and portable.",
              "Use a path inside the selected project without traversal segments.",
            ),
          };
        specPath = value;
      } else if (argument === "--adoption") {
        if (value !== "incremental" && value !== "complete")
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_ADOPTION_INVALID",
              "The adoption mode is unsupported.",
              "Use incremental or complete.",
            ),
          };
        adoption = value;
      } else if (argument === "--count") {
        const parsedCount = Number(value);
        if (
          !Number.isSafeInteger(parsedCount) ||
          parsedCount < 1 ||
          parsedCount > MAX_GENERATED_ID_COUNT ||
          String(parsedCount) !== value
        )
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_ID_COUNT_INVALID",
              "The requested ID count is invalid.",
              `Use an integer from 1 through ${MAX_GENERATED_ID_COUNT}.`,
            ),
          };
        count = parsedCount;
      } else if (argument === "--history-ref") {
        if (value.length === 0 || value.includes("\0"))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_ID_HISTORY_REF_INVALID",
              "The history ref is invalid.",
              "Supply a non-empty Git ref.",
            ),
          };
        historyRef = value;
      } else {
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
    } else if ((command === "inspect" || command === "trace") && objectId === undefined && isObjectId(argument))
      objectId = argument;
    else if (command === "id" && idKind === undefined && isIdKind(argument)) idKind = argument;
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
  if (
    command === "init" &&
    (configPath !== undefined || cwd !== undefined || outputPath !== undefined || includeExplanatory)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "An option does not apply to init.",
        "Use --root, --spec-path, --adoption, --format, or --quiet with init.",
      ),
    };
  if (command !== "init" && (root !== undefined || specPath !== undefined || adoption !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "An initialization option was used with another command.",
        "Use initialization options only with sdd init.",
      ),
    };
  if (command === "id" && outputPath !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "Projectless ID output cannot select a project-relative output file.",
        "Read the ID result from standard output.",
      ),
    };
  if (command !== "id" && (idKind !== undefined || count !== undefined || historyRef !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "An ID-generation option was used with another command.",
        "Use ID-generation options only with sdd id.",
      ),
    };
  if (command === "id" && idKind === undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_ID_KIND_REQUIRED",
        "id requires an ID kind.",
        "Supply project, capability, requirement, or concept.",
      ),
    };
  if ((command === "inspect" || command === "trace") && objectId === undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_OBJECT_ID_REQUIRED",
        `${command} requires an object ID.`,
        "Supply a CAP, REQ, or CON ID.",
      ),
    };
  if (command !== "inspect" && includeExplanatory)
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
      ...(root === undefined ? {} : { root }),
      ...(specPath === undefined ? {} : { specPath }),
      ...(adoption === undefined ? {} : { adoption }),
      ...(idKind === undefined ? {} : { idKind }),
      ...(command === "id" ? { count: count ?? 1 } : {}),
      ...(historyRef === undefined ? {} : { historyRef }),
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
  const reverseRelations = directReverseRelations(graph, objectId);
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

function validateResult(graph: ValidatedSpecificationGraph, history: ValidateResult["history"]): ValidateResult {
  const capabilities = [...graph.objects.values()].filter(
    (object) => !("anchor" in object) && object.type === "capability",
  );
  const concepts = [...graph.objects.values()].filter((object) => !("anchor" in object) && object.type === "concept");
  const requirements = [...graph.objects.values()].filter((object) => "anchor" in object);
  return {
    valid: true,
    history,
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
  } else if (value.command === "trace" && value.status === "ok") {
    const result = value.result as TraceResult;
    lines.push(
      `object: ${result.object_id}`,
      `ancestry: ${result.ancestry.join(", ") || "none"}`,
      `dependencies: ${result.dependencies.join(", ") || "none"}`,
      `dependents: ${result.dependents.join(", ") || "none"}`,
      `referrers: ${result.referrers.map((item) => `${item.source_id} (${item.type})`).join(", ") || "none"}`,
    );
  } else if (value.command === "init" && value.status === "ok") {
    const result = value.result as InitResult;
    lines.push(...result.created_paths.map((path) => `created: ${path}`));
  } else if (value.command === "id" && value.status === "ok") {
    const result = value.result as IdResult;
    lines.push(...result.candidates, `history: ${result.history.status}`);
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

function historyTechnicalDiagnostic(error: unknown): Diagnostic {
  if (error instanceof GitReadError && error.code === "GIT_REF_UNRESOLVED")
    return cliDiagnostic(
      "SDD_GIT_REF_UNRESOLVED",
      "The configured Git history ref could not be resolved.",
      "Fetch or correct the requested integration ref and run the command again.",
    );
  if (error instanceof HistoryIndexError)
    return cliDiagnostic(
      "SDD_ID_HISTORY_INVALID",
      "Reachable canonical history could not be validated.",
      "Repair the reachable project configuration and specification history before reserving IDs.",
    );
  if (error instanceof ProjectIdentityError)
    return cliDiagnostic(
      "SDD_ID_PROJECT_IDENTITY_INVALID",
      "Current repository project identities could not be validated.",
      "Repair repository .sdd/config.yaml files before reserving IDs.",
    );
  return cliDiagnostic(
    "SDD_ID_HISTORY_UNAVAILABLE",
    "Canonical Git history is unavailable for ID reservation.",
    "Run the command in a Git repository with the configured integration ref available.",
  );
}

function historyIncompleteDiagnostic(severity: Diagnostic["severity"]): Diagnostic {
  return cliDiagnostic(
    "SDD_GIT_HISTORY_INCOMPLETE",
    "Reachable canonical Git history is incomplete.",
    "Fetch complete history before relying on identifier-reuse guarantees.",
    severity,
  );
}

function duplicateProjectIdDiagnostic(): Diagnostic {
  return cliDiagnostic(
    "SDD_ID_PROJECT_DUPLICATE",
    "A project ID is duplicated by current SDD Projects in this Git repository.",
    "Assign every current SDD Project in the repository a distinct SDD ID.",
  );
}

function reusedObjectIdDiagnostic(objectId: ObjectId): Diagnostic {
  return {
    ...cliDiagnostic(
      "SDD_ID_REUSED",
      "A newly introduced canonical object ID was already defined in reachable project history.",
      "Assign the object a new random ID and preserve the historical ID as permanently reserved.",
    ),
    object_id: objectId,
  };
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
    runtime.argv[0] === "init" ||
    runtime.argv[0] === "id" ||
    runtime.argv[0] === "inspect" ||
    runtime.argv[0] === "trace" ||
    runtime.argv[0] === "validate"
      ? runtime.argv[0]
      : "unknown";
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
    if (invocation.command === "init") {
      const initialized = await initializeProject(
        { fileSystem: runtime.fileSystem, writer: runtime.projectWriter, randomness: runtime.randomness },
        {
          root: resolve(runtime.workingDirectory, invocation.root ?? "."),
          specPath: invocation.specPath ?? ("spec" as ProjectPath),
          adoption: invocation.adoption ?? "incremental",
        },
      );
      if (!initialized.ok) {
        const failure = initialized.failure;
        const diagnostic = cliDiagnostic(
          failure.code === "TARGET_CONFLICT"
            ? "SDD_INIT_TARGET_CONFLICT"
            : failure.code === "ROOT_INVALID"
              ? "SDD_INIT_ROOT_INVALID"
              : "SDD_INIT_TARGET_UNSAFE",
          failure.code === "TARGET_CONFLICT"
            ? "Initialization would overwrite an existing SDD Project file."
            : failure.code === "ROOT_INVALID"
              ? "The initialization root is not an existing directory."
              : "An initialization target is unsafe.",
          "Select an existing project root whose initialization targets do not conflict.",
        );
        emit(runtime, invocation.format, response("init", null, "error", null, [diagnostic]));
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      emit(
        runtime,
        invocation.format,
        response("init", initialized.value.projectId, "ok", { created_paths: initialized.value.createdPaths }, []),
      );
      return VALID_EXIT_CODE;
    }
    if (invocation.command === "id") {
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
      if (selected.ok) {
        const project = selected.value;
        try {
          const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
          const identities = await buildCurrentProjectIdentityIndex(reader, runtime.fileSystem);
          if (identities.duplicateProjectIds.size > 0) {
            emit(
              runtime,
              invocation.format,
              response("id", project.configuration.project_id, "blocked", null, [duplicateProjectIdDiagnostic()]),
            );
            return BLOCKED_EXIT_CODE;
          }
          const resolvedRef = await reader.resolveRevision(
            invocation.historyRef ?? project.configuration.git.default_target_ref,
          );
          const history = await buildCanonicalHistoryIndex(reader, resolvedRef, project.configuration.project_id);
          if (history.status === "incomplete") {
            emit(
              runtime,
              invocation.format,
              response("id", project.configuration.project_id, "error", null, [historyIncompleteDiagnostic("error")]),
            );
            return TECHNICAL_FAILURE_EXIT_CODE;
          }
          if (invocation.idKind === undefined || invocation.count === undefined) {
            throw new Error("Parsed ID invocation is missing required values.");
          }
          const forbidden = new Set<GeneratedId>(
            invocation.idKind === "project"
              ? [...history.reservedProjectIds, ...identities.projectIdsByPath.values()]
              : history.reservedObjectIds,
          );
          if (invocation.idKind !== "project") {
            const loaded = await loadSpecificationDocuments(
              runtime.fileSystem,
              project.project_root,
              project.configuration.spec.root,
            );
            if (!loaded.ok) {
              emit(
                runtime,
                invocation.format,
                response("id", project.configuration.project_id, "blocked", null, loaded.diagnostics),
              );
              return BLOCKED_EXIT_CODE;
            }
            const graph = validateSpecificationGraph(loaded.value, project.configuration.spec.entrypoint);
            if (!graph.ok) {
              emit(
                runtime,
                invocation.format,
                response("id", project.configuration.project_id, "blocked", null, graph.diagnostics),
              );
              return BLOCKED_EXIT_CODE;
            }
            for (const objectId of graph.value.objects.keys()) forbidden.add(objectId);
          }
          const result: IdResult = {
            candidates: generateRandomIds(invocation.idKind, invocation.count, runtime.randomness, forbidden),
            history: { status: "complete", resolved_ref: resolvedRef },
          };
          emit(runtime, invocation.format, response("id", project.configuration.project_id, "ok", result, []));
          return VALID_EXIT_CODE;
        } catch (error) {
          const diagnostic = historyTechnicalDiagnostic(error);
          emit(
            runtime,
            invocation.format,
            response("id", project.configuration.project_id, "error", null, [diagnostic]),
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
      }
      const noProject = selected.diagnostics.every((diagnostic) => diagnostic.code === "SDD_CONFIG_NOT_FOUND");
      if (!noProject || invocation.configPath !== undefined) {
        emit(runtime, invocation.format, response("id", null, "error", null, selected.diagnostics));
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      if (invocation.historyRef !== undefined) {
        const diagnostic = cliDiagnostic(
          "SDD_ID_HISTORY_REF_REQUIRES_PROJECT",
          "A projectless ID cannot check a history ref.",
          "Remove --history-ref or select an SDD Project after project-aware history support is implemented.",
        );
        emit(runtime, invocation.format, response("id", null, "error", null, [diagnostic]));
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      if (invocation.idKind === undefined || invocation.count === undefined) {
        throw new Error("Parsed ID invocation is missing required values.");
      }
      const result: IdResult = {
        candidates: generateRandomIds(invocation.idKind, invocation.count, runtime.randomness),
        history: { status: "unchecked", resolved_ref: null },
      };
      emit(runtime, invocation.format, response("id", null, "ok", result, []));
      return VALID_EXIT_CODE;
    }
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
    if (invocation.command === "trace") {
      const result = traceGraphObject(graph.value, invocation.objectId!);
      if (result === undefined) {
        const diagnostic = cliDiagnostic(
          "SDD_GRAPH_OBJECT_UNKNOWN",
          "The requested object does not exist in the active graph.",
          "Use an active CAP, REQ, or CON ID.",
        );
        emit(
          runtime,
          invocation.format,
          response("trace", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      emit(
        runtime,
        invocation.format,
        response("trace", project.configuration.project_id, "ok", result, graph.diagnostics),
        outputTarget,
      );
      return VALID_EXIT_CODE;
    }
    let validationHistory: ValidateResult["history"] = { status: "incomplete", resolved_ref: null };
    const historyDiagnostics: Diagnostic[] = [];
    try {
      const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
      const identities = await buildCurrentProjectIdentityIndex(reader, runtime.fileSystem);
      if (identities.duplicateProjectIds.size > 0) {
        emit(
          runtime,
          invocation.format,
          response("validate", project.configuration.project_id, "blocked", { valid: false }, [
            duplicateProjectIdDiagnostic(),
          ]),
          outputTarget,
        );
        return BLOCKED_EXIT_CODE;
      }
      const resolvedRef = await reader.resolveRevision(project.configuration.git.default_target_ref);
      const currentRevision = await reader.resolveRevision("HEAD");
      const mergeBase = await reader.findMergeBase(currentRevision, resolvedRef);
      const historyStatus = await reader.historyStatus();
      validationHistory = { status: mergeBase === undefined ? "incomplete" : historyStatus, resolved_ref: resolvedRef };
      if (mergeBase === undefined) {
        historyDiagnostics.push(historyIncompleteDiagnostic("warning"));
      } else {
        const integrationIds = await loadCanonicalProjectObjectIdsAt(
          reader,
          resolvedRef,
          project.configuration.project_id,
        );
        const baselineIds = await loadCanonicalProjectObjectIdsAt(reader, mergeBase, project.configuration.project_id);
        const newlyIntroducedIds = [...graph.value.objects.keys()].filter((objectId) => !baselineIds.has(objectId));
        const parallelCollisions = newlyIntroducedIds.filter((objectId) => integrationIds.has(objectId));
        let reusedIds: readonly ObjectId[] = parallelCollisions;
        if (newlyIntroducedIds.length > 0) {
          const history = await buildCanonicalHistoryIndex(reader, resolvedRef, project.configuration.project_id);
          reusedIds = newlyIntroducedIds.filter((objectId) => history.reservedObjectIds.has(objectId));
        }
        const sortedReusedIds = [...new Set(reusedIds)].toSorted();
        if (sortedReusedIds.length > 0) {
          emit(
            runtime,
            invocation.format,
            response(
              "validate",
              project.configuration.project_id,
              "blocked",
              { valid: false },
              sortedReusedIds.map(reusedObjectIdDiagnostic),
            ),
            outputTarget,
          );
          return BLOCKED_EXIT_CODE;
        }
        if (historyStatus === "incomplete") historyDiagnostics.push(historyIncompleteDiagnostic("warning"));
      }
    } catch (error) {
      if (error instanceof HistoryIndexError || error instanceof ProjectIdentityError) {
        emit(
          runtime,
          invocation.format,
          response("validate", project.configuration.project_id, "blocked", { valid: false }, [
            historyTechnicalDiagnostic(error),
          ]),
          outputTarget,
        );
        return BLOCKED_EXIT_CODE;
      }
      if (error instanceof GitReadError && error.code === "GIT_REPOSITORY_UNAVAILABLE") {
        historyDiagnostics.push(historyIncompleteDiagnostic("warning"));
      } else {
        emit(
          runtime,
          invocation.format,
          response("validate", project.configuration.project_id, "error", null, [historyTechnicalDiagnostic(error)]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    emit(
      runtime,
      invocation.format,
      response(
        invocation.command,
        project.configuration.project_id,
        "ok",
        validateResult(graph.value, validationHistory),
        [...graph.diagnostics, ...historyDiagnostics],
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
