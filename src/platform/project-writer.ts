export type SpecificationWriteOperation =
  | { readonly operation: "create"; readonly target: string; readonly content: Uint8Array }
  | {
      readonly operation: "replace";
      readonly target: string;
      readonly beforeSha256: string;
      readonly content: Uint8Array;
    }
  | { readonly operation: "delete"; readonly target: string; readonly beforeSha256: string };

export class SpecificationWritePreconditionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SpecificationWritePreconditionError";
    this.code = code;
  }
}

export type ProjectWriter = {
  createDirectory(path: string): Promise<void>;
  writeFileExclusive(path: string, content: Uint8Array): Promise<void>;
  replaceSpecificationFilesAtomically(
    transactionRoot: string,
    operations: readonly SpecificationWriteOperation[],
  ): Promise<void>;
};
