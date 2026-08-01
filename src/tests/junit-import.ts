import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";

import { SaxesParser } from "saxes";

import { isProjectPath } from "../contracts/identifiers.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";

export type JunitImportLimits = {
  readonly max_report_bytes: number;
  readonly max_xml_depth: number;
  readonly max_suite_count: number;
  readonly max_test_count: number;
};

export type ImportedJunitSuite = {
  readonly local_id: string;
  readonly parent_id: string | null;
  readonly name: string;
  readonly suite_path: readonly string[];
};

export type ImportedJunitTest = {
  readonly local_id: string;
  readonly parent_id: string;
  readonly name: string;
  readonly classname: string;
  readonly status: "failed" | "passed" | "skipped";
  readonly source?: {
    readonly path: ProjectPath;
    readonly line?: number;
  };
  readonly time_seconds?: string;
};

export type ImportedJunitReport = {
  readonly adapter_id: string;
  readonly report_path: ProjectPath;
  readonly suites: readonly ImportedJunitSuite[];
  readonly tests: readonly ImportedJunitTest[];
  readonly hierarchy: {
    readonly retained: boolean;
    readonly diagnostics: readonly string[];
  };
};

export class JunitImportError extends Error {
  readonly code:
    | "SDD_ADAPTER_JUNIT_DTD_FORBIDDEN"
    | "SDD_ADAPTER_JUNIT_FILE_NOT_REGULAR"
    | "SDD_ADAPTER_JUNIT_FILE_OUT_OF_SCOPE"
    | "SDD_ADAPTER_JUNIT_FILE_READ_FAILED"
    | "SDD_ADAPTER_JUNIT_INVALID_SOURCE"
    | "SDD_ADAPTER_JUNIT_INVALID_UTF8"
    | "SDD_ADAPTER_JUNIT_MALFORMED_XML"
    | "SDD_ADAPTER_JUNIT_REPORT_TOO_LARGE"
    | "SDD_ADAPTER_JUNIT_SUITE_LIMIT"
    | "SDD_ADAPTER_JUNIT_TEST_LIMIT"
    | "SDD_ADAPTER_JUNIT_XML_DEPTH_LIMIT";

  constructor(code: JunitImportError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "JunitImportError";
    this.code = code;
  }
}

type MutableTest = {
  local_id: string;
  parent_id: string;
  name: string;
  classname: string;
  failed: boolean;
  skipped: boolean;
  source?: { path: ProjectPath; line?: number };
  time_seconds?: string;
};

function assertLimits(limits: JunitImportLimits): void {
  for (const value of Object.values(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error("JUnit import limits must be positive integers.");
  }
}

function stableId(kind: "suite" | "test", components: readonly unknown[]): string {
  const digest = createHash("sha256").update(JSON.stringify(components), "utf8").digest("hex").slice(0, 32);
  return `${kind}-${digest}`;
}

type XmlAttributes = Record<string, string | { readonly value: string }>;

function attributeValue(attributes: XmlAttributes, name: string): string | undefined {
  const value = attributes[name];
  return typeof value === "string" ? value : value?.value;
}

function parseSource(attributes: XmlAttributes): { readonly path: ProjectPath; readonly line?: number } | undefined {
  const path = attributeValue(attributes, "file");
  const lineValue = attributeValue(attributes, "line");
  if (path === undefined && lineValue === undefined) return undefined;
  const line = lineValue === undefined ? undefined : Number(lineValue);
  if (path === undefined || !isProjectPath(path) || (line !== undefined && (!Number.isSafeInteger(line) || line < 1))) {
    throw new JunitImportError("SDD_ADAPTER_JUNIT_INVALID_SOURCE", "JUnit testcase source is invalid.");
  }
  return { path, ...(line === undefined ? {} : { line }) };
}

function parseTime(attributes: XmlAttributes): string | undefined {
  const value = attributeValue(attributes, "time");
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit testcase time is invalid.");
  }
  return value;
}

export function importJunitXml(
  bytes: Uint8Array,
  adapterId: string,
  reportPath: ProjectPath,
  limits: JunitImportLimits,
): ImportedJunitReport {
  assertLimits(limits);
  if (bytes.byteLength > limits.max_report_bytes) {
    throw new JunitImportError("SDD_ADAPTER_JUNIT_REPORT_TOO_LARGE", "JUnit report exceeds its byte limit.");
  }
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new JunitImportError("SDD_ADAPTER_JUNIT_INVALID_UTF8", "JUnit report is not valid UTF-8.", { cause: error });
  }

  const suites: ImportedJunitSuite[] = [];
  const tests: ImportedJunitTest[] = [];
  const suiteStack: ImportedJunitSuite[] = [];
  const elementStack: string[] = [];
  const occurrences = new Map<string, number>();
  let currentTest: MutableTest | undefined;
  let rootSeen = false;
  let nestedSuiteSeen = false;
  const parser = new SaxesParser();
  parser.on("doctype", () => {
    throw new JunitImportError("SDD_ADAPTER_JUNIT_DTD_FORBIDDEN", "JUnit reports cannot contain a DTD.");
  });
  parser.on("error", (error) => {
    throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit report XML is malformed.", { cause: error });
  });
  parser.on("opentag", (tag) => {
    elementStack.push(tag.name);
    if (elementStack.length > limits.max_xml_depth) {
      throw new JunitImportError("SDD_ADAPTER_JUNIT_XML_DEPTH_LIMIT", "JUnit XML exceeds its depth limit.");
    }
    if (elementStack.length === 1) {
      if (tag.name !== "testsuite" && tag.name !== "testsuites") {
        throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit report root is unsupported.");
      }
      rootSeen = true;
    }
    if (tag.name === "testsuite") {
      if (suites.length >= limits.max_suite_count) {
        throw new JunitImportError("SDD_ADAPTER_JUNIT_SUITE_LIMIT", "JUnit report exceeds its suite limit.");
      }
      const name = attributeValue(tag.attributes, "name");
      if (name === undefined || name.includes("\0")) {
        throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit testsuite name is invalid.");
      }
      const parent = suiteStack.at(-1);
      const suitePath = [...(parent?.suite_path ?? []), name];
      const occurrence = suites.filter(
        (suite) => JSON.stringify(suite.suite_path) === JSON.stringify(suitePath),
      ).length;
      const suite: ImportedJunitSuite = {
        local_id: stableId("suite", [reportPath, suitePath, occurrence]),
        parent_id: parent?.local_id ?? null,
        name,
        suite_path: suitePath,
      };
      if (parent !== undefined) nestedSuiteSeen = true;
      suites.push(suite);
      suiteStack.push(suite);
    } else if (tag.name === "testcase") {
      if (tests.length >= limits.max_test_count || currentTest !== undefined) {
        throw new JunitImportError(
          "SDD_ADAPTER_JUNIT_TEST_LIMIT",
          "JUnit report exceeds its test limit or nests testcases.",
        );
      }
      const suite = suiteStack.at(-1);
      const name = attributeValue(tag.attributes, "name");
      if (suite === undefined || name === undefined || name.includes("\0")) {
        throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit testcase placement or name is invalid.");
      }
      const classname = attributeValue(tag.attributes, "classname") ?? "";
      const occurrenceKey = JSON.stringify([reportPath, suite.suite_path, classname, name]);
      const occurrence = occurrences.get(occurrenceKey) ?? 0;
      occurrences.set(occurrenceKey, occurrence + 1);
      const source = parseSource(tag.attributes);
      const time = parseTime(tag.attributes);
      currentTest = {
        local_id: stableId("test", [reportPath, suite.suite_path, classname, name, occurrence]),
        parent_id: suite.local_id,
        name,
        classname,
        failed: false,
        skipped: false,
        ...(source === undefined ? {} : { source }),
        ...(time === undefined ? {} : { time_seconds: time }),
      };
    } else if (currentTest !== undefined && (tag.name === "failure" || tag.name === "error")) {
      currentTest.failed = true;
    } else if (currentTest !== undefined && tag.name === "skipped") {
      currentTest.skipped = true;
    }
  });
  parser.on("closetag", (tag) => {
    if (tag.name === "testcase") {
      if (currentTest === undefined) {
        throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit testcase close is unmatched.");
      }
      const { failed, skipped, ...test } = currentTest;
      tests.push({ ...test, status: failed ? "failed" : skipped ? "skipped" : "passed" });
      currentTest = undefined;
    } else if (tag.name === "testsuite") {
      suiteStack.pop();
    }
    elementStack.pop();
  });

  try {
    parser.write(xml).close();
  } catch (error) {
    if (error instanceof JunitImportError) throw error;
    throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit report XML is malformed.", { cause: error });
  }
  if (!rootSeen || currentTest !== undefined || suiteStack.length !== 0 || elementStack.length !== 0) {
    throw new JunitImportError("SDD_ADAPTER_JUNIT_MALFORMED_XML", "JUnit report XML is incomplete.");
  }
  const lostHierarchy = tests.some((test) => test.classname.length > 0) && !nestedSuiteSeen;
  return {
    adapter_id: adapterId,
    report_path: reportPath,
    suites,
    tests,
    hierarchy: {
      retained: !lostHierarchy,
      diagnostics: lostHierarchy ? ["SDD_ADAPTER_JUNIT_HIERARCHY_UNAVAILABLE"] : [],
    },
  };
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !path.includes("\0"));
}

export async function importJunitFile(
  fileSystem: FileSystem,
  projectRoot: string,
  adapterId: string,
  reportPath: ProjectPath,
  limits: JunitImportLimits,
): Promise<ImportedJunitReport> {
  assertLimits(limits);
  try {
    const realRoot = await fileSystem.realPath(projectRoot);
    const realFile = await fileSystem.realPath(resolve(realRoot, ...reportPath.split("/")));
    if (!isWithin(realRoot, realFile)) {
      throw new JunitImportError(
        "SDD_ADAPTER_JUNIT_FILE_OUT_OF_SCOPE",
        "JUnit report resolves outside the selected project.",
      );
    }
    const metadata = await fileSystem.metadata(realFile);
    if (metadata.kind !== "file") {
      throw new JunitImportError("SDD_ADAPTER_JUNIT_FILE_NOT_REGULAR", "JUnit report is not a regular file.");
    }
    if (metadata.size > limits.max_report_bytes) {
      throw new JunitImportError("SDD_ADAPTER_JUNIT_REPORT_TOO_LARGE", "JUnit report exceeds its byte limit.");
    }
    return importJunitXml(await fileSystem.readFile(realFile), adapterId, reportPath, limits);
  } catch (error) {
    if (error instanceof JunitImportError) throw error;
    throw new JunitImportError("SDD_ADAPTER_JUNIT_FILE_READ_FAILED", "JUnit report could not be read.", {
      cause: error,
    });
  }
}
