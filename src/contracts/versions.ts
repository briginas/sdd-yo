export const JSON_SCHEMA_VERSION_V1 = "1.0" as const;
export const CONFIG_SCHEMA_VERSION_V1 = 1 as const;
export const MARKDOWN_DIALECT_VERSION_V1 = 1 as const;
export const JUNIT_IMPORT_VERSION_V1 = 1 as const;
export const FINGERPRINT_CANONICALIZATION_VERSION_V1 = 1 as const;

export type JsonSchemaVersion = typeof JSON_SCHEMA_VERSION_V1;
export type ConfigSchemaVersion = typeof CONFIG_SCHEMA_VERSION_V1;
export type MarkdownDialectVersion = typeof MARKDOWN_DIALECT_VERSION_V1;
export type JunitImportVersion = typeof JUNIT_IMPORT_VERSION_V1;
export type FingerprintCanonicalizationVersion = typeof FINGERPRINT_CANONICALIZATION_VERSION_V1;
