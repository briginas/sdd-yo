import { createRequire } from "node:module";

import { JSON_SCHEMA_VERSION_V1 } from "../contracts/versions.ts";

export const CLI_NAME = "sdd" as const;
export const PACKAGE_NAME = "sdd-yo" as const;
export const SKILL_NAME = "sdd-yo" as const;
export const SKILL_PROTOCOL_VERSION_V1 = "1.0" as const;
export const COMPATIBLE_MAJOR_V1 = 1 as const;

export type CliCompatibilityIdentity = {
  readonly package: { readonly name: typeof PACKAGE_NAME; readonly version: string };
  readonly cli: { readonly name: typeof CLI_NAME; readonly version: string };
  readonly json_schema: {
    readonly version: typeof JSON_SCHEMA_VERSION_V1;
    readonly compatible_major: typeof COMPATIBLE_MAJOR_V1;
  };
  readonly skill: {
    readonly name: typeof SKILL_NAME;
    readonly protocol_version: typeof SKILL_PROTOCOL_VERSION_V1;
    readonly compatible_major: typeof COMPATIBLE_MAJOR_V1;
  };
};

type PackageManifest = {
  readonly name?: unknown;
  readonly version?: unknown;
};

const require = createRequire(import.meta.url);

export function loadCliCompatibilityIdentity(): CliCompatibilityIdentity {
  const manifest: PackageManifest = require("../../package.json") as PackageManifest;
  if (manifest.name !== PACKAGE_NAME || typeof manifest.version !== "string" || manifest.version.length === 0)
    throw new Error("The sdd-yo package manifest identity is invalid.");
  return {
    package: { name: PACKAGE_NAME, version: manifest.version },
    cli: { name: CLI_NAME, version: manifest.version },
    json_schema: { version: JSON_SCHEMA_VERSION_V1, compatible_major: COMPATIBLE_MAJOR_V1 },
    skill: {
      name: SKILL_NAME,
      protocol_version: SKILL_PROTOCOL_VERSION_V1,
      compatible_major: COMPATIBLE_MAJOR_V1,
    },
  };
}
