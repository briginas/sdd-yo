export const TECHNICAL_UNAVAILABLE_EXIT_CODE = 3 as const;

export type CliRuntime = {
  readonly argv: readonly string[];
  readonly writeStandardError: (message: string) => void;
};

export function runCli(runtime: CliRuntime): typeof TECHNICAL_UNAVAILABLE_EXIT_CODE {
  void runtime.argv;
  runtime.writeStandardError("sdd: no product commands are implemented in this bootstrap package.\n");
  return TECHNICAL_UNAVAILABLE_EXIT_CODE;
}
