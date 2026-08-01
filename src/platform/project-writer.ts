export type ProjectWriter = {
  createDirectory(path: string): Promise<void>;
  writeFileExclusive(path: string, content: Uint8Array): Promise<void>;
};
