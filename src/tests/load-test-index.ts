import { relative, resolve } from "node:path";

import { isFingerprint, isGitObjectId, isProjectId, isProjectPath, isRequirementId } from "../contracts/identifiers.ts";
import type { Fingerprint, GitObjectId, ProjectId, ProjectPath, RequirementId } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { TestIndex, TestIndexEntry } from "./test-index.ts";

const adapterIdPattern = /^[a-z][a-z0-9-]{0,31}$/u;
const utcTimestampPattern =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/u;

export class TestIndexInputError extends Error {
  readonly code:
    | "SDD_ADAPTER_TEST_INDEX_FILE_NOT_REGULAR"
    | "SDD_ADAPTER_TEST_INDEX_FILE_OUT_OF_SCOPE"
    | "SDD_ADAPTER_TEST_INDEX_FILE_READ_FAILED"
    | "SDD_ADAPTER_TEST_INDEX_INVALID"
    | "SDD_ADAPTER_TEST_INDEX_SUBJECT_MISMATCH"
    | "SDD_ADAPTER_TEST_INDEX_TOO_LARGE";

  constructor(code: TestIndexInputError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TestIndexInputError";
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

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

function validUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = utcTimestampPattern.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;
}

function parseSource(value: unknown): TestIndexEntry["source"] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !hasExactKeys(value, ["path"], ["line", "column"]) || !isProjectPath(value.path)) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_INVALID", "TestIndex source location is invalid.");
  }
  if (
    (value.line !== undefined && !positiveInteger(value.line)) ||
    (value.column !== undefined && !positiveInteger(value.column))
  ) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_INVALID", "TestIndex source coordinates are invalid.");
  }
  return {
    path: value.path,
    ...(value.line === undefined ? {} : { line: value.line as number }),
    ...(value.column === undefined ? {} : { column: value.column as number }),
  };
}

function parseTest(value: unknown): TestIndexEntry {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["test_ref", "adapter_id", "local_id", "full_name", "requirement_ids"], ["source"]) ||
    typeof value.adapter_id !== "string" ||
    !adapterIdPattern.test(value.adapter_id) ||
    !nonEmpty(value.local_id) ||
    !nonEmpty(value.full_name) ||
    value.test_ref !== `${value.adapter_id}:${value.local_id}` ||
    !Array.isArray(value.requirement_ids) ||
    !value.requirement_ids.every(isRequirementId)
  ) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_INVALID", "TestIndex test entry is invalid.");
  }
  const requirementIds = value.requirement_ids as RequirementId[];
  if (
    new Set(requirementIds).size !== requirementIds.length ||
    requirementIds.some((id, index) => index > 0 && id < requirementIds[index - 1]!)
  ) {
    throw new TestIndexInputError(
      "SDD_ADAPTER_TEST_INDEX_INVALID",
      "TestIndex Requirement mappings are not canonical.",
    );
  }
  const source = parseSource(value.source);
  return {
    test_ref: value.test_ref,
    adapter_id: value.adapter_id,
    local_id: value.local_id,
    full_name: value.full_name,
    requirement_ids: requirementIds,
    ...(source === undefined ? {} : { source }),
  };
}

function parseProducer(value: unknown): TestIndex["producer"] | undefined {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["name", "version"]) ||
    !nonEmpty(value.name) ||
    !nonEmpty(value.version)
  ) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_INVALID", "TestIndex producer is invalid.");
  }
  return { name: value.name, version: value.version };
}

export function parseTestIndex(bytes: Uint8Array, maxBytes: number): TestIndex {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || bytes.byteLength > maxBytes) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_TOO_LARGE", "TestIndex exceeds its byte limit.");
  }
  let value: unknown;
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(source) as unknown;
  } catch (error) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_INVALID", "TestIndex is not valid UTF-8 JSON.", {
      cause: error,
    });
  }
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["schema_version", "artifact_type", "project_id", "subject", "tests"],
      ["created_at", "producer"],
    ) ||
    value.schema_version !== "1.0" ||
    value.artifact_type !== "test_index" ||
    !isProjectId(value.project_id) ||
    (value.created_at !== undefined && !validUtcTimestamp(value.created_at)) ||
    !isRecord(value.subject) ||
    !hasExactKeys(value.subject, ["head_ref", "config_fingerprint", "adapter_fingerprints"]) ||
    !isGitObjectId(value.subject.head_ref) ||
    !isFingerprint(value.subject.config_fingerprint) ||
    !isRecord(value.subject.adapter_fingerprints) ||
    Object.keys(value.subject.adapter_fingerprints).length === 0 ||
    Object.entries(value.subject.adapter_fingerprints).some(
      ([id, fingerprint]) => !adapterIdPattern.test(id) || !isFingerprint(fingerprint),
    ) ||
    !Array.isArray(value.tests)
  ) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_INVALID", "TestIndex envelope or subject is invalid.");
  }
  const tests = value.tests.map(parseTest);
  if (
    new Set(tests.map((test) => test.test_ref)).size !== tests.length ||
    tests.some((test, index) => index > 0 && test.test_ref < tests[index - 1]!.test_ref)
  ) {
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_INVALID", "TestIndex entries are not canonical.");
  }
  const producer = parseProducer(value.producer);
  return {
    schema_version: "1.0",
    artifact_type: "test_index",
    project_id: value.project_id,
    ...(value.created_at === undefined ? {} : { created_at: value.created_at as string }),
    ...(producer === undefined ? {} : { producer }),
    subject: {
      head_ref: value.subject.head_ref,
      config_fingerprint: value.subject.config_fingerprint,
      adapter_fingerprints: value.subject.adapter_fingerprints as Readonly<Record<string, Fingerprint>>,
    },
    tests,
  };
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !path.includes("\0"));
}

export async function importTestIndexFile(
  fileSystem: FileSystem,
  projectRoot: string,
  path: ProjectPath,
  maxBytes: number,
): Promise<TestIndex> {
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realFile = await fileSystem.realPath(resolve(realRoot, ...path.split("/")));
    if (!isWithin(realRoot, realFile)) {
      throw new TestIndexInputError(
        "SDD_ADAPTER_TEST_INDEX_FILE_OUT_OF_SCOPE",
        "TestIndex resolves outside the selected project.",
      );
    }
    const metadata = await fileSystem.metadata(realFile);
    if (metadata.kind !== "file") {
      throw new TestIndexInputError(
        "SDD_ADAPTER_TEST_INDEX_FILE_NOT_REGULAR",
        "TestIndex input is not a regular file.",
      );
    }
    if (metadata.size > maxBytes) {
      throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_TOO_LARGE", "TestIndex exceeds its byte limit.");
    }
    return parseTestIndex(await fileSystem.readFile(realFile), maxBytes);
  } catch (error) {
    if (error instanceof TestIndexInputError) throw error;
    throw new TestIndexInputError("SDD_ADAPTER_TEST_INDEX_FILE_READ_FAILED", "TestIndex could not be read.", {
      cause: error,
    });
  }
}

export function validateTestIndexSubject(
  index: TestIndex,
  expected: {
    readonly project_id: ProjectId;
    readonly head_ref: GitObjectId;
    readonly known_requirement_ids: ReadonlySet<RequirementId>;
  },
): void {
  if (
    index.project_id !== expected.project_id ||
    index.subject.head_ref !== expected.head_ref ||
    index.tests.some((test) => test.requirement_ids.some((id) => !expected.known_requirement_ids.has(id)))
  ) {
    throw new TestIndexInputError(
      "SDD_ADAPTER_TEST_INDEX_SUBJECT_MISMATCH",
      "TestIndex does not match the selected project graph and Git subject.",
    );
  }
}
