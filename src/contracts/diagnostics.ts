import type { ObjectId, ProjectPath } from "./identifiers.ts";

declare const diagnosticCodeValue: unique symbol;

export type DiagnosticCode = string & {
  readonly [diagnosticCodeValue]: "DiagnosticCode";
};

export const DIAGNOSTIC_SEVERITIES = ["info", "warning", "error"] as const;
export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[number];

export const DIAGNOSTIC_NAMESPACES = [
  "SDD_CONFIG",
  "SDD_MARKDOWN",
  "SDD_ID",
  "SDD_GRAPH",
  "SDD_GIT",
  "SDD_PATCH",
  "SDD_ADAPTER",
  "SDD_EVIDENCE",
  "SDD_FINDING",
  "SDD_GATE",
] as const;
export type DiagnosticNamespace = (typeof DIAGNOSTIC_NAMESPACES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { readonly [key: string]: JsonValue } | readonly JsonValue[];
export type DiagnosticDetails = Readonly<Record<string, JsonValue>>;

export type DiagnosticLocation = {
  readonly path: ProjectPath;
  readonly line?: number;
  readonly column?: number;
};

export type Diagnostic = {
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly details: DiagnosticDetails;
  readonly location?: DiagnosticLocation;
  readonly object_id?: ObjectId;
};

const diagnosticCodePattern = /^SDD_[A-Z0-9_]+$/u;

export function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  return typeof value === "string" && diagnosticCodePattern.test(value);
}

export function isDiagnosticSeverity(value: unknown): value is DiagnosticSeverity {
  return typeof value === "string" && DIAGNOSTIC_SEVERITIES.some((severity) => severity === value);
}
