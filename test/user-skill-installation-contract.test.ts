import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";

type FixtureCase = {
  readonly case_id: string;
  readonly path: string;
  readonly parse_valid: boolean;
  readonly schema_valid: boolean;
  readonly context_valid: boolean;
};

type FileEntry = { readonly path: string; readonly sha256: string };

function fingerprint(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function contextValid(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const binding = value as {
    readonly package?: { readonly version?: unknown };
    readonly cli?: { readonly version?: unknown; readonly path?: unknown };
    readonly skill?: { readonly payload_fingerprint?: unknown };
    readonly package_fingerprint?: unknown;
    readonly package_files?: unknown;
    readonly skill_files?: unknown;
  };
  if (!Array.isArray(binding.package_files) || !Array.isArray(binding.skill_files)) return false;
  const packageFiles = binding.package_files as FileEntry[];
  const skillFiles = binding.skill_files as FileEntry[];
  const sortedAndUnique = (entries: readonly FileEntry[]) =>
    entries.every((entry, index) => index === 0 || entry.path > (entries[index - 1]?.path ?? ""));
  return (
    sortedAndUnique(packageFiles) &&
    sortedAndUnique(skillFiles) &&
    binding.package?.version === binding.cli?.version &&
    typeof binding.cli?.version === "string" &&
    typeof binding.cli.path === "string" &&
    binding.cli.path.endsWith(`/cli/${binding.cli.version}/dist/bin/sdd.js`) &&
    binding.package_fingerprint === fingerprint(packageFiles) &&
    binding.skill?.payload_fingerprint === fingerprint(skillFiles)
  );
}

test("REQ-778099C0 REQ-C975AE17 REQ-2B49D454 REQ-DEB23207 REQ-C18AEE90 user installation binding fixtures enforce exact version 1 ownership", async () => {
  const root = "fixtures/v1/artifacts/skill/user-skill-installation";
  const manifest = JSON.parse(await readFile(join(root, "cases.json"), "utf8")) as {
    readonly cases: readonly FixtureCase[];
  };
  const commonSchema = JSON.parse(await readFile("contracts/v1/schemas/common.schema.json", "utf8")) as object;
  const bindingSchema = JSON.parse(
    await readFile("contracts/v1/schemas/user-skill-installation.schema.json", "utf8"),
  ) as object;
  const ajv = new Ajv2020({ allErrors: true, strictSchema: true, strictTypes: false });
  ajv.addKeyword({ keyword: "x-sdd-ordering", schemaType: "string", valid: true });
  ajv.addSchema(commonSchema);
  const validate = ajv.compile(bindingSchema);

  for (const fixture of manifest.cases) {
    assert.equal(fixture.parse_valid, true, fixture.case_id);
    const value: unknown = JSON.parse(await readFile(join(root, fixture.path), "utf8"));
    const schemaValid = validate(value);
    assert.equal(schemaValid, fixture.schema_valid, `${fixture.case_id}: ${JSON.stringify(validate.errors)}`);
    assert.equal(schemaValid && contextValid(value), fixture.context_valid, fixture.case_id);
  }
});
