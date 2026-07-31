import type { ProjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { ConfigSchemaVersion } from "../contracts/versions.ts";

export type JunitTestAdapter = {
  readonly id: string;
  readonly type: "junit";
  readonly discover: {
    readonly reports: readonly string[];
  };
};

export type CommandTestAdapter = {
  readonly id: string;
  readonly type: "command";
  readonly protocol: "jsonl-v1";
  readonly discover?: {
    readonly argv: readonly string[];
  };
  readonly execute?: {
    readonly argv: readonly string[];
  };
  readonly timeout_ms: number;
  readonly max_output_bytes: number;
};

export type TestAdapter = JunitTestAdapter | CommandTestAdapter;

export type ProjectConfiguration = {
  readonly schema_version: ConfigSchemaVersion;
  readonly project_id: ProjectId;
  readonly spec: {
    readonly root: ProjectPath;
    readonly entrypoint: ProjectPath;
  };
  readonly adoption: {
    readonly mode: "incremental" | "complete";
  };
  readonly git: {
    readonly default_target_ref: string;
  };
  readonly ids: {
    readonly suffix_length: 8;
    readonly alphabet: "hex-uppercase";
  };
  readonly tests: {
    readonly adapters: readonly TestAdapter[];
  };
  readonly evidence: {
    readonly allowed_issuers: readonly string[];
  };
};

export type ResolvedProject = {
  readonly config_path: string;
  readonly project_root: string;
  readonly configuration: ProjectConfiguration;
};
