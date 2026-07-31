import type { Diagnostic } from "./diagnostics.ts";
import type { ProjectId } from "./identifiers.ts";
import type { JsonSchemaVersion } from "./versions.ts";

export type ResultEnvelope<Status extends string, Result, DiagnosticType = Diagnostic> = {
  readonly status: Status;
  readonly result: Result;
  readonly diagnostics: readonly DiagnosticType[];
};

export type CliResponseEnvelope<Command extends string, Status extends string, Result> = ResultEnvelope<
  Status,
  Result
> & {
  readonly schema_version: JsonSchemaVersion;
  readonly command: Command;
  readonly project_id: ProjectId;
};
