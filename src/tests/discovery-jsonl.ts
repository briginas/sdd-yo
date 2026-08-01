import { relative, resolve } from "node:path";

import { isProjectPath } from "../contracts/identifiers.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import type { CommandTestAdapter, ResolvedProject } from "../config/types.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import { ProcessRunError } from "../platform/process-runner.ts";
import type { ProcessRunner } from "../platform/process-runner.ts";

const adapterIdPattern = /^[a-z][a-z0-9-]{0,31}$/u;

export type DiscoveryStreamHeader = {
  readonly schema_version: "1.0";
  readonly record_type: "test_stream";
  readonly operation: "discover";
  readonly adapter_id: string;
};

export type DiscoverySuiteRecord = {
  readonly schema_version: "1.0";
  readonly record_type: "suite";
  readonly local_id: string;
  readonly parent_id: string | null;
  readonly name: string;
};

export type DiscoveryTestRecord = {
  readonly schema_version: "1.0";
  readonly record_type: "test";
  readonly local_id: string;
  readonly parent_id: string | null;
  readonly name: string;
  readonly source?: {
    readonly path: ProjectPath;
    readonly line: number;
  };
};

export type DiscoveryRecord = DiscoverySuiteRecord | DiscoveryTestRecord;

export type ImportedDiscoveryStream = {
  readonly header: DiscoveryStreamHeader;
  readonly records: readonly DiscoveryRecord[];
};

export class AdapterImportError extends Error {
  readonly code:
    | "SDD_ADAPTER_COMMAND_FAILED"
    | "SDD_ADAPTER_COMMAND_OUTPUT_OVERFLOW"
    | "SDD_ADAPTER_COMMAND_SIGNALLED"
    | "SDD_ADAPTER_COMMAND_TIMEOUT"
    | "SDD_ADAPTER_COMMAND_UNAVAILABLE"
    | "SDD_ADAPTER_FILE_NOT_REGULAR"
    | "SDD_ADAPTER_FILE_OUT_OF_SCOPE"
    | "SDD_ADAPTER_FILE_READ_FAILED"
    | "SDD_ADAPTER_STREAM_INVALID_HEADER"
    | "SDD_ADAPTER_STREAM_INVALID_JSONL"
    | "SDD_ADAPTER_STREAM_INVALID_RECORD"
    | "SDD_ADAPTER_STREAM_INVALID_UTF8"
    | "SDD_ADAPTER_STREAM_TOO_LARGE";

  constructor(code: AdapterImportError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdapterImportError";
    this.code = code;
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: UnknownRecord, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.includes("\0");
}

function normalizedName(value: unknown): string | undefined {
  if (typeof value !== "string" || value.includes("\0")) return undefined;
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function parseHeader(value: unknown, expectedAdapterId?: string): DiscoveryStreamHeader {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "record_type", "operation", "adapter_id"]) ||
    value.schema_version !== "1.0" ||
    value.record_type !== "test_stream" ||
    value.operation !== "discover" ||
    typeof value.adapter_id !== "string" ||
    !adapterIdPattern.test(value.adapter_id) ||
    (expectedAdapterId !== undefined && value.adapter_id !== expectedAdapterId)
  ) {
    throw new AdapterImportError("SDD_ADAPTER_STREAM_INVALID_HEADER", "Discovery stream header is invalid.");
  }
  return {
    schema_version: "1.0",
    record_type: "test_stream",
    operation: "discover",
    adapter_id: value.adapter_id,
  };
}

function parseSource(value: unknown): DiscoveryTestRecord["source"] | undefined {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["path", "line"]) ||
    !isProjectPath(value.path) ||
    !Number.isSafeInteger(value.line) ||
    (value.line as number) < 1
  ) {
    throw new AdapterImportError("SDD_ADAPTER_STREAM_INVALID_RECORD", "Discovery test source is invalid.");
  }
  return { path: value.path, line: value.line as number };
}

function parseDiscoveryRecord(value: unknown): DiscoveryRecord {
  if (!isRecord(value) || value.schema_version !== "1.0") {
    throw new AdapterImportError("SDD_ADAPTER_STREAM_INVALID_RECORD", "Discovery stream record is invalid.");
  }
  const commonValid =
    isBoundedString(value.local_id) &&
    (value.parent_id === null || isBoundedString(value.parent_id)) &&
    normalizedName(value.name) !== undefined;
  if (!commonValid) {
    throw new AdapterImportError("SDD_ADAPTER_STREAM_INVALID_RECORD", "Discovery stream record is invalid.");
  }
  const name = normalizedName(value.name);
  if (name === undefined) throw new Error("Unreachable invalid discovery name.");
  if (
    value.record_type === "suite" &&
    hasExactKeys(value, ["schema_version", "record_type", "local_id", "parent_id", "name"])
  ) {
    return {
      schema_version: "1.0",
      record_type: "suite",
      local_id: value.local_id as string,
      parent_id: value.parent_id as string | null,
      name,
    };
  }
  if (
    value.record_type === "test" &&
    hasExactKeys(value, ["schema_version", "record_type", "local_id", "parent_id", "name"], ["source"])
  ) {
    const source = parseSource(value.source);
    return {
      schema_version: "1.0",
      record_type: "test",
      local_id: value.local_id as string,
      parent_id: value.parent_id as string | null,
      name,
      ...(source === undefined ? {} : { source }),
    };
  }
  throw new AdapterImportError("SDD_ADAPTER_STREAM_INVALID_RECORD", "Discovery stream record is invalid.");
}

export function parseDiscoveryJsonl(
  bytes: Uint8Array,
  options: { readonly maxBytes: number; readonly expectedAdapterId?: string },
): ImportedDiscoveryStream {
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1 || bytes.byteLength > options.maxBytes) {
    throw new AdapterImportError("SDD_ADAPTER_STREAM_TOO_LARGE", "Discovery stream exceeds its byte limit.");
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new AdapterImportError("SDD_ADAPTER_STREAM_INVALID_UTF8", "Discovery stream is not valid UTF-8.", {
      cause: error,
    });
  }
  const lines = source.endsWith("\n") ? source.slice(0, -1).split("\n") : source.split("\n");
  if (lines.length === 0 || lines[0] === "" || lines.some((line) => line === "")) {
    throw new AdapterImportError(
      "SDD_ADAPTER_STREAM_INVALID_JSONL",
      "Discovery stream must contain one JSON object per non-empty line.",
    );
  }
  let values: unknown[];
  try {
    values = lines.map((line) => JSON.parse(line) as unknown);
  } catch (error) {
    throw new AdapterImportError("SDD_ADAPTER_STREAM_INVALID_JSONL", "Discovery stream contains malformed JSON.", {
      cause: error,
    });
  }
  const [first, ...rest] = values;
  return { header: parseHeader(first, options.expectedAdapterId), records: rest.map(parseDiscoveryRecord) };
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !path.includes("\0"));
}

export async function importDiscoveryJsonlFile(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  options: { readonly maxBytes: number; readonly expectedAdapterId?: string },
): Promise<ImportedDiscoveryStream> {
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realFile = await fileSystem.realPath(resolve(realRoot, ...path.split("/")));
    if (!isWithin(realRoot, realFile)) {
      throw new AdapterImportError(
        "SDD_ADAPTER_FILE_OUT_OF_SCOPE",
        "Discovery JSONL file resolves outside the selected project.",
      );
    }
    const metadata = await fileSystem.metadata(realFile);
    if (metadata.kind !== "file") {
      throw new AdapterImportError("SDD_ADAPTER_FILE_NOT_REGULAR", "Discovery JSONL input is not a regular file.");
    }
    if (metadata.size > options.maxBytes) {
      throw new AdapterImportError("SDD_ADAPTER_STREAM_TOO_LARGE", "Discovery stream exceeds its byte limit.");
    }
    return parseDiscoveryJsonl(await fileSystem.readFile(realFile), options);
  } catch (error) {
    if (error instanceof AdapterImportError) throw error;
    throw new AdapterImportError("SDD_ADAPTER_FILE_READ_FAILED", "Discovery JSONL file could not be read.", {
      cause: error,
    });
  }
}

export async function runCommandDiscovery(
  runner: ProcessRunner,
  project: ResolvedProject,
  adapter: CommandTestAdapter,
  allowedEnvironment: Readonly<Record<string, string>> = {},
): Promise<ImportedDiscoveryStream> {
  const argv = adapter.discover?.argv;
  if (argv === undefined) {
    throw new AdapterImportError("SDD_ADAPTER_COMMAND_UNAVAILABLE", "The selected adapter has no discovery command.");
  }
  let result;
  try {
    result = await runner.run({
      executable: argv[0] as string,
      arguments: argv.slice(1),
      workingDirectory: project.project_root,
      environment: {
        ...allowedEnvironment,
        SDD_OPERATION: "discover",
        SDD_PROJECT_ID: project.configuration.project_id,
        SDD_PROJECT_ROOT: project.project_root,
      },
      inheritEnvironment: false,
      timeoutMilliseconds: adapter.timeout_ms,
      maxOutputBytes: adapter.max_output_bytes,
    });
  } catch (error) {
    if (error instanceof ProcessRunError && error.code === "TIMEOUT") {
      throw new AdapterImportError("SDD_ADAPTER_COMMAND_TIMEOUT", "Discovery adapter exceeded its timeout.", {
        cause: error,
      });
    }
    if (error instanceof ProcessRunError && error.code === "OUTPUT_LIMIT") {
      throw new AdapterImportError(
        "SDD_ADAPTER_COMMAND_OUTPUT_OVERFLOW",
        "Discovery adapter exceeded its output limit.",
        { cause: error },
      );
    }
    throw new AdapterImportError("SDD_ADAPTER_COMMAND_FAILED", "Discovery adapter could not be executed.", {
      cause: error,
    });
  }
  if (result.signal !== null) {
    throw new AdapterImportError("SDD_ADAPTER_COMMAND_SIGNALLED", "Discovery adapter terminated because of a signal.");
  }
  if (result.exitCode !== 0) {
    throw new AdapterImportError("SDD_ADAPTER_COMMAND_FAILED", "Discovery adapter exited unsuccessfully.");
  }
  return parseDiscoveryJsonl(result.standardOutput, {
    maxBytes: adapter.max_output_bytes,
    expectedAdapterId: adapter.id,
  });
}
