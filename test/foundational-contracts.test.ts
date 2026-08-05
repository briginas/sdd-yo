import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIG_SCHEMA_VERSION_V1,
  FINGERPRINT_CANONICALIZATION_VERSION_V1,
  JSON_SCHEMA_VERSION_V1,
  isCapabilityId,
  isConceptId,
  isDiagnosticCode,
  isDiagnosticSeverity,
  isFindingId,
  isFingerprint,
  isGitObjectId,
  isObjectId,
  isProjectId,
  isRequirementId,
} from "../src/index.ts";
import type {
  CliResponseEnvelope,
  Clock,
  Diagnostic,
  FileSystem,
  GitReader,
  ProcessRunner,
  Randomness,
  ResultEnvelope,
} from "../src/index.ts";

test("foundational contract guards accept only version 1 lexical values", () => {
  assert.equal(isProjectId("SDD-17EF8B29"), true);
  assert.equal(isProjectId("sdd-17EF8B29"), false);
  assert.equal(isCapabilityId("CAP-0B417FC4"), true);
  assert.equal(isRequirementId("REQ-7C848ED0"), true);
  assert.equal(isConceptId("CON-FC16381E"), true);
  assert.equal(isObjectId("REQ-7C848ED0"), true);
  assert.equal(isObjectId("SDD-17EF8B29"), false);
  assert.equal(isFindingId("FND-0123456789AB"), true);
  assert.equal(isFindingId("FND-01234567"), false);
  assert.equal(isFingerprint(`sha256:${"a".repeat(64)}`), true);
  assert.equal(isFingerprint(`SHA256:${"a".repeat(64)}`), false);
  assert.equal(isGitObjectId("opaque-object-id"), true);
  assert.equal(isGitObjectId(""), false);
});

test("foundational contract exposes fixed version 1 values", () => {
  assert.equal(JSON_SCHEMA_VERSION_V1, "1.0");
  assert.equal(CONFIG_SCHEMA_VERSION_V1, 1);
  assert.equal(FINGERPRINT_CANONICALIZATION_VERSION_V1, 1);
});

test("foundational diagnostics keep stable machine values separate from messages", () => {
  assert.equal(isDiagnosticCode("SDD_GRAPH_UNKNOWN_REQUIREMENT"), true);
  assert.equal(isDiagnosticCode("graph_unknown_requirement"), false);
  assert.equal(isDiagnosticSeverity("warning"), true);
  assert.equal(isDiagnosticSeverity("fatal"), false);
});

test("foundational generic envelopes and injected boundaries are structurally usable", () => {
  const projectIdValue: unknown = "SDD-17EF8B29";
  const diagnosticCodeValue: unknown = "SDD_GRAPH_UNKNOWN_REQUIREMENT";
  assert.ok(isProjectId(projectIdValue));
  assert.ok(isDiagnosticCode(diagnosticCodeValue));

  const diagnostic: Diagnostic = {
    code: diagnosticCodeValue,
    severity: "error",
    message: "Unknown Requirement.",
    details: { target: "REQ-12345678", candidates: [] },
  };
  const response: CliResponseEnvelope<
    "validate",
    "blocked",
    { readonly valid: false; readonly adoption: { readonly mode: "incremental" } }
  > = {
    schema_version: JSON_SCHEMA_VERSION_V1,
    command: "validate",
    project_id: projectIdValue,
    status: "blocked",
    result: { valid: false, adoption: { mode: "incremental" } },
    diagnostics: [diagnostic],
  };
  const result: ResultEnvelope<"ok", { readonly count: number }> = {
    status: "ok",
    result: { count: 0 },
    diagnostics: [],
  };

  const fileSystem = {
    readFile: async () => new Uint8Array(),
    readDirectory: async () => [],
    metadata: async () => ({ kind: "file" as const, size: 0 }),
    realPath: async (path: string) => path,
  } satisfies FileSystem;
  const gitReader = {
    repositoryRoot: "/repo",
    resolveRevision: async () => {
      const value: unknown = "opaque-object-id";
      assert.ok(isGitObjectId(value));
      return value;
    },
    findMergeBase: async () => undefined,
    historyStatus: async () => "complete" as const,
    listReachableRevisions: async () => [],
    listWorkingTreeConfigPaths: async () => [],
    listEntriesAt: async () => [],
    listFilesAt: async () => [],
    readBlob: async () => new Uint8Array(),
    readFileAt: async () => undefined,
  } satisfies GitReader;
  const processRunner = {
    run: async () => ({
      exitCode: 0,
      signal: null,
      standardOutput: new Uint8Array(),
      standardError: new Uint8Array(),
    }),
  } satisfies ProcessRunner;
  const clock = { now: () => new Date(0) } satisfies Clock;
  const randomness = { randomBytes: (length: number) => new Uint8Array(length) } satisfies Randomness;

  assert.equal(response.project_id, projectIdValue);
  assert.equal(result.result.count, 0);
  assert.equal(typeof fileSystem.readFile, "function");
  assert.equal(typeof gitReader.resolveRevision, "function");
  assert.equal(typeof processRunner.run, "function");
  assert.equal(clock.now().toISOString(), "1970-01-01T00:00:00.000Z");
  assert.equal(randomness.randomBytes(4).byteLength, 4);
});
