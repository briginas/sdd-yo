import { readFile } from "node:fs/promises";

type CurrentPackageIdentity = {
  readonly name: "sdd-yo";
  readonly version: string;
};

function parseCurrentPackageIdentity(value: unknown): CurrentPackageIdentity {
  if (
    !value ||
    typeof value !== "object" ||
    !("name" in value) ||
    value.name !== "sdd-yo" ||
    !("version" in value) ||
    typeof value.version !== "string" ||
    value.version.length === 0
  )
    throw new Error("package.json does not declare the current sdd-yo identity.");
  return { name: value.name, version: value.version };
}

export const currentPackageIdentity = parseCurrentPackageIdentity(
  JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")),
);

export const currentCompatibilityIdentity = {
  package: currentPackageIdentity,
  cli: { name: "sdd", version: currentPackageIdentity.version },
  json_schema: { version: "1.0", compatible_major: 1 },
  skill: { name: "sdd-yo", protocol_version: "1.0", compatible_major: 1 },
} as const;
