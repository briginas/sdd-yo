export type ProcessRequest = {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly workingDirectory?: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly inheritEnvironment?: boolean;
  readonly standardInput?: Uint8Array;
  readonly timeoutMilliseconds?: number;
  readonly maxOutputBytes?: number;
};

export class ProcessRunError extends Error {
  readonly code: "OUTPUT_LIMIT" | "SPAWN_FAILED" | "TIMEOUT";

  constructor(code: ProcessRunError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProcessRunError";
    this.code = code;
  }
}

export type ProcessResult = {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly standardOutput: Uint8Array;
  readonly standardError: Uint8Array;
};

export type ProcessRunner = {
  run(request: ProcessRequest): Promise<ProcessResult>;
};
