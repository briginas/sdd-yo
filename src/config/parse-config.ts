import { parseDocument } from "yaml";

import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { Diagnostic, DiagnosticDetails } from "../contracts/diagnostics.ts";
import { isProjectId, isProjectPath } from "../contracts/identifiers.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import { CONFIG_SCHEMA_VERSION_V1 } from "../contracts/versions.ts";
import type { ConfigurationResult } from "./result.ts";
import { DEFAULT_TEST_IMPORT_LIMITS } from "./types.ts";
import type {
  CommandTestAdapter,
  JunitTestAdapter,
  ProjectConfiguration,
  TestAdapter,
  TestImportLimits,
} from "./types.ts";

type UnknownRecord = Record<string, unknown>;
const adapterIdPattern = /^[a-z][a-z0-9-]{0,31}$/u;

function diagnostic(
  codeValue: string,
  message: string,
  details: DiagnosticDetails,
  location?: ProjectPath,
): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid internal diagnostic code: ${codeValue}`);
  return {
    code: codeValue,
    severity: "error",
    message,
    details: { ...details, remediation: "Correct the reported configuration field and run the command again." },
    ...(location === undefined ? {} : { location: { path: location } }),
  };
}

function failure<Value>(item: Diagnostic): ConfigurationResult<Value> {
  return { ok: false, diagnostics: [item] };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: UnknownRecord,
  required: readonly string[],
  field: string,
  location: ProjectPath | undefined,
  optional: readonly string[] = [],
): Diagnostic | undefined {
  const unknown = Object.keys(value)
    .filter((key) => !required.includes(key) && !optional.includes(key))
    .sort()[0];
  if (unknown !== undefined) {
    return diagnostic(
      "SDD_CONFIG_UNKNOWN_FIELD",
      `Unsupported configuration field ${field}.${unknown}.`,
      { field: `${field}.${unknown}` },
      location,
    );
  }
  const missing = required.find((key) => !Object.hasOwn(value, key));
  if (missing !== undefined) {
    return diagnostic(
      "SDD_CONFIG_MISSING_FIELD",
      `Required configuration field ${field}.${missing} is missing.`,
      { field: `${field}.${missing}` },
      location,
    );
  }
  return undefined;
}

function invalidField(field: string, location: ProjectPath | undefined): Diagnostic {
  return diagnostic(
    "SDD_CONFIG_INVALID_FIELD",
    `Configuration field ${field} has an invalid value.`,
    { field },
    location,
  );
}

function parseArgv(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  if (!value.every((item) => typeof item === "string" && item.length > 0 && !item.includes("\0"))) return undefined;
  return value;
}

function parseImportLimits(value: unknown, location: ProjectPath | undefined): ConfigurationResult<TestImportLimits> {
  if (!isRecord(value)) return failure(invalidField("tests.import_limits", location));
  const fields = ["max_jsonl_bytes", "max_report_bytes", "max_xml_depth", "max_suite_count", "max_test_count"] as const;
  const keyError = exactKeys(value, fields, "tests.import_limits", location);
  if (keyError !== undefined) return failure(keyError);
  for (const field of fields) {
    if (!Number.isSafeInteger(value[field]) || (value[field] as number) < 1) {
      return failure(invalidField(`tests.import_limits.${field}`, location));
    }
  }
  return {
    ok: true,
    value: Object.fromEntries(fields.map((field) => [field, value[field]])) as TestImportLimits,
    diagnostics: [],
  };
}

function isProjectPattern(value: unknown): value is string {
  return typeof value === "string" && isProjectPath(value.replaceAll(/[*?\[\]{}]/gu, "x"));
}

function parseAdapter(
  value: unknown,
  index: number,
  location: ProjectPath | undefined,
): ConfigurationResult<TestAdapter> {
  const field = `tests.adapters[${index}]`;
  if (!isRecord(value) || typeof value.type !== "string") return failure(invalidField(field, location));
  if (typeof value.id !== "string" || !adapterIdPattern.test(value.id)) {
    return failure(invalidField(`${field}.id`, location));
  }

  if (value.type === "junit") {
    const keyError = exactKeys(value, ["id", "type", "discover"], field, location);
    if (keyError !== undefined) return failure(keyError);
    if (!isRecord(value.discover)) return failure(invalidField(`${field}.discover`, location));
    const discoverKeyError = exactKeys(value.discover, ["reports"], `${field}.discover`, location);
    if (discoverKeyError !== undefined) return failure(discoverKeyError);
    if (!Array.isArray(value.discover.reports) || value.discover.reports.length === 0) {
      return failure(invalidField(`${field}.discover.reports`, location));
    }
    const reports: string[] = [];
    for (const report of value.discover.reports) {
      if (!isProjectPattern(report)) return failure(invalidField(`${field}.discover.reports`, location));
      reports.push(report);
    }
    const adapter: JunitTestAdapter = { id: value.id, type: "junit", discover: { reports } };
    return { ok: true, value: adapter, diagnostics: [] };
  }

  if (value.type === "command") {
    const keyError = exactKeys(value, ["id", "type", "protocol", "timeout_ms", "max_output_bytes"], field, location, [
      "discover",
      "execute",
    ]);
    if (keyError !== undefined) return failure(keyError);
    if (value.protocol !== "jsonl-v1") return failure(invalidField(`${field}.protocol`, location));
    if (value.discover === undefined && value.execute === undefined) return failure(invalidField(field, location));

    let discoverArgv: readonly string[] | undefined;
    if (value.discover !== undefined) {
      if (!isRecord(value.discover)) return failure(invalidField(`${field}.discover`, location));
      const discoverKeyError = exactKeys(value.discover, ["argv"], `${field}.discover`, location);
      if (discoverKeyError !== undefined) return failure(discoverKeyError);
      discoverArgv = parseArgv(value.discover.argv);
      if (discoverArgv === undefined) return failure(invalidField(`${field}.discover.argv`, location));
    }

    let executeArgv: readonly string[] | undefined;
    if (value.execute !== undefined) {
      if (!isRecord(value.execute)) return failure(invalidField(`${field}.execute`, location));
      const executeKeyError = exactKeys(value.execute, ["argv"], `${field}.execute`, location);
      if (executeKeyError !== undefined) return failure(executeKeyError);
      executeArgv = parseArgv(value.execute.argv);
      if (executeArgv === undefined) return failure(invalidField(`${field}.execute.argv`, location));
    }
    if (!Number.isSafeInteger(value.timeout_ms) || (value.timeout_ms as number) <= 0) {
      return failure(invalidField(`${field}.timeout_ms`, location));
    }
    if (!Number.isSafeInteger(value.max_output_bytes) || (value.max_output_bytes as number) <= 0) {
      return failure(invalidField(`${field}.max_output_bytes`, location));
    }
    const adapter: CommandTestAdapter = {
      id: value.id,
      type: "command",
      protocol: "jsonl-v1",
      ...(discoverArgv === undefined ? {} : { discover: { argv: discoverArgv } }),
      ...(executeArgv === undefined ? {} : { execute: { argv: executeArgv } }),
      timeout_ms: value.timeout_ms as number,
      max_output_bytes: value.max_output_bytes as number,
    };
    return { ok: true, value: adapter, diagnostics: [] };
  }

  return failure(invalidField(`${field}.type`, location));
}

function parseValue(value: unknown, location: ProjectPath | undefined): ConfigurationResult<ProjectConfiguration> {
  if (!isRecord(value)) return failure(invalidField("configuration", location));
  const topLevelError = exactKeys(
    value,
    ["schema_version", "project_id", "spec", "adoption", "git", "ids", "tests", "evidence"],
    "configuration",
    location,
  );
  if (topLevelError !== undefined) return failure(topLevelError);

  if (value.schema_version !== CONFIG_SCHEMA_VERSION_V1) {
    const code =
      typeof value.schema_version === "number" && value.schema_version > CONFIG_SCHEMA_VERSION_V1
        ? "SDD_CONFIG_UNSUPPORTED_SCHEMA_VERSION"
        : "SDD_CONFIG_INVALID_FIELD";
    return failure(
      diagnostic(
        code,
        "Configuration schema version is not supported.",
        { schema_version: typeof value.schema_version === "number" ? value.schema_version : null },
        location,
      ),
    );
  }
  if (!isProjectId(value.project_id)) return failure(invalidField("project_id", location));

  if (!isRecord(value.spec)) return failure(invalidField("spec", location));
  const specError = exactKeys(value.spec, ["root", "entrypoint"], "spec", location);
  if (specError !== undefined) return failure(specError);
  if (!isProjectPath(value.spec.root)) return failure(invalidField("spec.root", location));
  if (!isProjectPath(value.spec.entrypoint)) return failure(invalidField("spec.entrypoint", location));

  if (!isRecord(value.adoption)) return failure(invalidField("adoption", location));
  const adoptionError = exactKeys(value.adoption, ["mode"], "adoption", location);
  if (adoptionError !== undefined) return failure(adoptionError);
  if (value.adoption.mode !== "incremental" && value.adoption.mode !== "complete") {
    return failure(invalidField("adoption.mode", location));
  }

  if (!isRecord(value.git)) return failure(invalidField("git", location));
  const gitError = exactKeys(value.git, ["default_target_ref"], "git", location);
  if (gitError !== undefined) return failure(gitError);
  if (
    typeof value.git.default_target_ref !== "string" ||
    value.git.default_target_ref.length === 0 ||
    value.git.default_target_ref.includes("\0")
  ) {
    return failure(invalidField("git.default_target_ref", location));
  }

  if (!isRecord(value.ids)) return failure(invalidField("ids", location));
  const idsError = exactKeys(value.ids, ["suffix_length", "alphabet"], "ids", location);
  if (idsError !== undefined) return failure(idsError);
  if (value.ids.suffix_length !== 8) return failure(invalidField("ids.suffix_length", location));
  if (value.ids.alphabet !== "hex-uppercase") return failure(invalidField("ids.alphabet", location));

  if (!isRecord(value.tests)) return failure(invalidField("tests", location));
  const testsError = exactKeys(value.tests, ["adapters"], "tests", location, ["import_limits"]);
  if (testsError !== undefined) return failure(testsError);
  if (!Array.isArray(value.tests.adapters)) return failure(invalidField("tests.adapters", location));
  const adapters: TestAdapter[] = [];
  const adapterIds = new Set<string>();
  for (const [index, candidate] of value.tests.adapters.entries()) {
    const parsed = parseAdapter(candidate, index, location);
    if (!parsed.ok) return parsed;
    if (adapterIds.has(parsed.value.id)) {
      return failure(
        diagnostic(
          "SDD_CONFIG_DUPLICATE_ADAPTER_ID",
          `Test adapter ID ${parsed.value.id} is configured more than once.`,
          { adapter_id: parsed.value.id },
          location,
        ),
      );
    }
    adapterIds.add(parsed.value.id);
    adapters.push(parsed.value);
  }
  const importLimits =
    value.tests.import_limits === undefined
      ? { ok: true as const, value: DEFAULT_TEST_IMPORT_LIMITS, diagnostics: [] as const }
      : parseImportLimits(value.tests.import_limits, location);
  if (!importLimits.ok) return importLimits;

  if (!isRecord(value.evidence)) return failure(invalidField("evidence", location));
  const evidenceError = exactKeys(value.evidence, ["allowed_issuers"], "evidence", location);
  if (evidenceError !== undefined) return failure(evidenceError);
  if (
    !Array.isArray(value.evidence.allowed_issuers) ||
    !value.evidence.allowed_issuers.every(
      (issuer) => typeof issuer === "string" && issuer.length > 0 && !issuer.includes("\0"),
    ) ||
    new Set(value.evidence.allowed_issuers).size !== value.evidence.allowed_issuers.length
  ) {
    return failure(invalidField("evidence.allowed_issuers", location));
  }

  return {
    ok: true,
    value: {
      schema_version: CONFIG_SCHEMA_VERSION_V1,
      project_id: value.project_id,
      spec: { root: value.spec.root, entrypoint: value.spec.entrypoint },
      adoption: { mode: value.adoption.mode },
      git: { default_target_ref: value.git.default_target_ref },
      ids: { suffix_length: 8, alphabet: "hex-uppercase" },
      tests: { adapters, import_limits: importLimits.value },
      evidence: { allowed_issuers: value.evidence.allowed_issuers },
    },
    diagnostics: [],
  };
}

export function parseProjectConfiguration(
  bytes: Uint8Array,
  location?: ProjectPath,
): ConfigurationResult<ProjectConfiguration> {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return failure(diagnostic("SDD_CONFIG_INVALID_UTF8", "Configuration is not valid UTF-8.", {}, location));
  }

  const document = parseDocument(source, { customTags: [], uniqueKeys: true, version: "1.2" });
  const yamlProblem = [...document.errors, ...document.warnings][0];
  if (yamlProblem !== undefined) {
    const yamlCode = yamlProblem.code === "DUPLICATE_KEY" ? "SDD_CONFIG_DUPLICATE_KEY" : "SDD_CONFIG_INVALID_YAML";
    return failure(
      diagnostic(
        yamlCode,
        "Configuration YAML is invalid or uses an unsupported feature.",
        { yaml_code: yamlProblem.code ?? "UNKNOWN" },
        location,
      ),
    );
  }

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    return failure(diagnostic("SDD_CONFIG_YAML_ALIAS", "Configuration YAML aliases are not supported.", {}, location));
  }
  return parseValue(value, location);
}
