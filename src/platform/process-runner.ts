export type ProcessRequest = {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly workingDirectory?: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly standardInput?: Uint8Array;
  readonly timeoutMilliseconds?: number;
};

export type ProcessResult = {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly standardOutput: Uint8Array;
  readonly standardError: Uint8Array;
};

export type ProcessRunner = {
  run(request: ProcessRequest): Promise<ProcessResult>;
};
