import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import test from "node:test";
import { parseArgs } from "node:util";

import { Ajv2020 } from "ajv/dist/2020.js";
import formatsPluginModule from "ajv-formats";
import { compileFromFile } from "json-schema-to-typescript";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { SaxesParser } from "saxes";
import { unified } from "unified";
import { parseDocument } from "yaml";

const expectedDependencies = {
  ajv: "8.20.0",
  "ajv-formats": "3.0.1",
  "remark-frontmatter": "5.0.0",
  "remark-gfm": "4.0.1",
  "remark-parse": "11.0.0",
  saxes: "6.0.0",
  unified: "11.0.5",
  yaml: "2.9.0",
} as const;

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  assert.ok(isRecord(value));
  return value;
}

test("bootstrap dependency contract keeps every selected package exact-pinned", async () => {
  const manifest = (await readJson("package.json")) as PackageManifest;
  assert.deepEqual(manifest.dependencies, expectedDependencies);
  assert.equal(manifest.devDependencies?.["json-schema-to-typescript"], "15.0.4");
});

test("bootstrap dependency contract validates Draft 2020-12 local refs and formats", async () => {
  const addFormats = formatsPluginModule.default;
  const validator = new Ajv2020({ allErrors: true, strictSchema: true, strictTypes: false });
  validator.addKeyword({ keyword: "x-sdd-ordering", schemaType: "string", valid: true });
  addFormats(validator);

  validator.addSchema(await readJson("contracts/v1/schemas/common.schema.json"));
  const validate = validator.compile(await readJson("contracts/v1/schemas/change-descriptor.schema.json"));
  const fingerprint = `sha256:${"0".repeat(64)}`;
  const valid = {
    schema_version: "1.0",
    artifact_type: "change_descriptor",
    project_id: "SDD-17EF8B29",
    mode: "spec-code",
    integration_ref: "integration",
    proposal_ref: "proposal",
    approved_delta: { semantic: fingerprint, structural: fingerprint },
    code_targets: [],
  };

  assert.equal(validate(valid), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...valid, unknown: true }), false);

  const validateTimestamp = validator.compile({
    $ref: "common.schema.json#/$defs/utcTimestamp",
  });
  assert.equal(validateTimestamp("2026-07-31T12:00:00Z"), true);
  assert.equal(validateTimestamp("2026-99-99T12:00:00Z"), false);
});

test("bootstrap dependency contract rejects unsafe YAML features before typed use", () => {
  const duplicate = parseDocument("project_id: first\nproject_id: second\n", {
    customTags: [],
    uniqueKeys: true,
  });
  assert.ok(duplicate.errors.some((error) => error.code === "DUPLICATE_KEY"));

  const customTag = parseDocument("project_id: !include secret.yaml\n", {
    customTags: [],
    uniqueKeys: true,
  });
  assert.ok(customTag.warnings.some((warning) => warning.code === "TAG_RESOLVE_FAILED"));

  const alias = parseDocument("value: &value [one]\ncopy: *value\n");
  assert.throws(() => alias.toJS({ maxAliasCount: 0 }), /Alias resolution is disabled|Excessive alias count/);
});

test("bootstrap dependency contract preserves Markdown AST positions and extensions", () => {
  const tree = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .parse("---\nsdd:\n  type: index\n---\n# Index\n\n| Name |\n| --- |\n| value |\n");

  assert.deepEqual(
    tree.children.map((node) => [node.type, node.position?.start.line]),
    [
      ["yaml", 1],
      ["heading", 5],
      ["table", 7],
    ],
  );
});

test("bootstrap dependency contract rejects XML doctypes before entity processing", async () => {
  const xml = await readFile("fixtures/v1/adapters/junit/external-entity.xml", "utf8");
  const parser = new SaxesParser();
  let elementSeen = false;
  let doctypeSeen = false;
  parser.on("opentag", () => {
    elementSeen = true;
  });
  parser.on("doctype", () => {
    doctypeSeen = true;
    throw new Error("DTD is forbidden");
  });

  assert.throws(() => parser.write(xml).close(), /DTD is forbidden/);
  assert.equal(doctypeSeen, true);
  assert.equal(elementSeen, false);
});

test("bootstrap dependency contract generates TypeScript from checked-in schema refs", async () => {
  const source = await compileFromFile("contracts/v1/schemas/change-descriptor.schema.json", {
    bannerComment: "",
    unknownAny: true,
  });
  assert.match(source, /export type SDDYoChangeDescriptor/);
  assert.match(source, /export interface ArtifactEnvelope/);
  assert.doesNotMatch(source, /\bany\b/);
});

test("bootstrap dependency contract uses Node CLI and direct-spawn boundaries", async () => {
  const parsed = parseArgs({
    args: ["--config", ".sdd/config.yaml"],
    options: { config: { type: "string" } },
    strict: true,
  });
  assert.equal(parsed.values.config, ".sdd/config.yaml");

  const literal = "$(touch must-not-exist); & |";
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", "process.stdout.write(process.argv[1])", literal], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) reject(new Error(`child exited with ${String(code)}`));
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
  assert.equal(output, literal);
});
