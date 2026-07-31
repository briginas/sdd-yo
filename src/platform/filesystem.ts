export const FILE_SYSTEM_ENTRY_KINDS = ["file", "directory", "symbolic-link", "other"] as const;
export type FileSystemEntryKind = (typeof FILE_SYSTEM_ENTRY_KINDS)[number];

export type FileSystemEntry = {
  readonly name: string;
  readonly kind: FileSystemEntryKind;
};

export type FileSystemMetadata = {
  readonly kind: FileSystemEntryKind;
  readonly size: number;
};

export type FileSystem = {
  readFile(path: string): Promise<Uint8Array>;
  readDirectory(path: string): Promise<readonly FileSystemEntry[]>;
  metadata(path: string): Promise<FileSystemMetadata>;
  realPath(path: string): Promise<string>;
};
