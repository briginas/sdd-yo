export type SpecificationWriteOperation =
  | { readonly operation: "create"; readonly target: string; readonly content: Uint8Array }
  | {
      readonly operation: "replace";
      readonly target: string;
      readonly beforeSha256: string;
      readonly content: Uint8Array;
    }
  | { readonly operation: "delete"; readonly target: string; readonly beforeSha256: string };

export type ProjectWriter = {
  createDirectory(path: string): Promise<void>;
  writeFileExclusive(path: string, content: Uint8Array): Promise<void>;
  replaceSpecificationFilesAtomically(
    transactionRoot: string,
    operations: readonly SpecificationWriteOperation[],
  ): Promise<void>;
};
