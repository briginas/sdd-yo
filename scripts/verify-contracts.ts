#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
type Diagnostic = {
  file: string;
  code: string;
  message: string;
};

type FixtureEntry = Record<string, unknown> & {
  case_id?: string;
  pair_id?: string;
  golden_id?: string;
  path?: string;
  file?: string;
  root?: string;
  entrypoint?: string;
  variants?: Array<string | FixtureEntry>;
  before?: string | FixtureEntry;
  after?: string | FixtureEntry;
  parse_valid?: boolean;
  stream_valid?: boolean;
  utf8_valid?: boolean;
};

type FixtureManifest = Record<string, unknown> & {
  status?: string;
  fixture_manifest_version?: string;
  fixture_matrix_version?: string;
  fixture_family_id?: string;
  contract_id?: string;
  contracts?: string[];
  requirements?: string[];
  authorities?: string[];
  schema?: string;
  manifests?: Array<{ schema?: string; manifest?: string }>;
  cases?: FixtureEntry[];
  pairs?: FixtureEntry[];
  approval_mode_matrix?: FixtureEntry[];
  delta_goldens?: FixtureEntry[];
  inventory_required_case_coverage?: Record<string, string[]>;
};

type InventoryFamily = {
  fixture_family_id: string;
  requirements?: string[];
  required_cases: string[];
};

type InventoryContract = {
  contract_id: string;
  requirements?: string[];
};

type Inventory = {
  contracts: InventoryContract[];
  fixture_families: InventoryFamily[];
};

type ParsedManifest = {
  file: string;
  value: FixtureManifest;
};

type NamedCollection = {
  location: string;
  key: string;
  names: string[];
};

const diagnostics: Diagnostic[] = [];
let checks = 0;

const ID_PATTERNS = {
  CAP: /^CAP-[0-9A-F]{8}$/,
  CON: /^CON-[0-9A-F]{8}$/,
  REQ: /^REQ-[0-9A-F]{8}$/,
  SDD: /^SDD-[0-9A-F]{8}$/,
};

function relative(file: string): string {
  return path.relative(repositoryRoot, file).split(path.sep).join("/") || ".";
}

function record(file: string, code: string, message: string): void {
  diagnostics.push({ file: relative(file), code, message });
}

function assert(condition: unknown, file: string, code: string, message: string): void {
  checks += 1;
  if (!condition) record(file, code, message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorStack(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return false;
    throw error;
  }
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

async function parseJson<T = unknown>(file: string, code = "CONTRACT_JSON_PARSE"): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    record(file, code, errorMessage(error));
    return undefined;
  } finally {
    checks += 1;
  }
}

function collectIds(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") {
    const matches = value.match(/\b(?:CAP|CON|REQ|SDD)-[A-Za-z0-9-]+/g) ?? [];
    output.push(...matches);
  } else if (Array.isArray(value)) {
    for (const item of value) collectIds(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectIds(item, output);
  }
  return output;
}

function validateIds(value: unknown, file: string): void {
  for (const id of collectIds(value)) {
    const prefix = id.slice(0, 3);
    const pattern = ID_PATTERNS[prefix as keyof typeof ID_PATTERNS];
    assert(pattern?.test(id), file, "CONTRACT_ID_FORMAT", `invalid identifier ${JSON.stringify(id)}`);
  }
}

function collectNamedEntries(
  value: unknown,
  location = "$",
  output: NamedCollection[] = [],
): NamedCollection[] {
  if (Array.isArray(value)) {
    const keys = ["case_id", "golden_id", "pair_id", "variant_id"];
    for (const key of keys) {
      const named = value.filter(isRecord).filter((item) => typeof item[key] === "string");
      if (named.length > 0) output.push({ location, key, names: named.map((item) => item[key] as string) });
    }
    if (location.endsWith(".variants") && value.every((item) => typeof item === "string")) {
      output.push({ location, key: "variant", names: value });
    }
    value.forEach((item, index) => collectNamedEntries(item, `${location}[${index}]`, output));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collectNamedEntries(item, `${location}.${key}`, output);
  }
  return output;
}

function validateDuplicateNames(value: unknown, file: string): void {
  for (const collection of collectNamedEntries(value)) {
    const seen = new Set<string>();
    for (const name of collection.names) {
      assert(!seen.has(name), file, "CONTRACT_DUPLICATE_FIXTURE_NAME", `duplicate ${collection.key} ${JSON.stringify(name)} at ${collection.location}`);
      seen.add(name);
    }
  }
}

function localTarget(source: string, reference: string): string {
  const [target = ""] = reference.split("#", 1);
  return path.resolve(path.dirname(source), target);
}

async function validateTarget(source: string, reference: string, code = "CONTRACT_MISSING_TARGET"): Promise<boolean> {
  const target = localTarget(source, reference);
  const inRepository = target === repositoryRoot || target.startsWith(`${repositoryRoot}${path.sep}`);
  assert(inRepository, source, "CONTRACT_PATH_ESCAPE", `reference escapes the repository: ${JSON.stringify(reference)}`);
  if (!inRepository) return false;
  const present = await exists(target);
  assert(present, source, code, `missing target ${JSON.stringify(reference)}`);
  if (present) {
    const [realRepository, realTarget] = await Promise.all([realpath(repositoryRoot), realpath(target)]);
    const realInRepository = realTarget === realRepository || realTarget.startsWith(`${realRepository}${path.sep}`);
    assert(realInRepository, source, "CONTRACT_PATH_ESCAPE", `reference resolves through a symlink outside the repository: ${JSON.stringify(reference)}`);
    if (!realInRepository) return false;
  }
  return present;
}

function slugifyHeading(heading: string): string {
  return heading
    .replace(/<!--.*?-->/g, "")
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function validateAnchor(source: string, reference: string): Promise<void> {
  const hashIndex = reference.indexOf("#");
  if (hashIndex < 0) return;
  const anchor = decodeURIComponent(reference.slice(hashIndex + 1)).toLowerCase();
  if (!anchor) return;
  const target = localTarget(source, reference);
  if (!(await exists(target)) || path.extname(target).toLowerCase() !== ".md") return;
  const text = await readFile(target, "utf8");
  const anchors = new Set();
  for (const line of text.split(/\r?\n/)) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading?.[2]) anchors.add(slugifyHeading(heading[2]));
    for (const match of line.matchAll(/<a\s+(?:name|id)=["']([^"']+)["'][^>]*>/gi)) {
      const explicitAnchor = match[1];
      if (explicitAnchor) anchors.add(explicitAnchor.toLowerCase());
    }
  }
  assert(anchors.has(anchor), source, "CONTRACT_MISSING_ANCHOR", `missing anchor #${anchor} in ${relative(target)}`);
}

async function validateAuthorities(manifest: FixtureManifest, file: string): Promise<void> {
  for (const authority of manifest.authorities ?? []) {
    if (typeof authority !== "string") continue;
    const [authorityPath = "", authorityAnchor] = authority.split("#", 2);
    const present = await validateTarget(file, path.relative(path.dirname(file), path.join(repositoryRoot, authorityPath)) + (authorityAnchor === undefined ? "" : `#${authorityAnchor}`));
    if (present) await validateAnchor(path.join(repositoryRoot, ".contract-root"), authority);
  }
}

async function validateMarkdownLinks(files: string[]): Promise<void> {
  for (const file of files.filter((item) => item.endsWith(".md"))) {
    const text = await readFile(file, "utf8");
    let inFence = false;
    const prose = text
      .split(/\r?\n/)
      .map((line) => {
        if (/^\s*```/.test(line)) {
          inFence = !inFence;
          return "";
        }
        return inFence ? "" : line;
      })
      .join("\n");
    for (const match of prose.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
      const reference = match[1]?.trim().replace(/^<|>$/g, "") ?? "";
      if (!reference || /^(?:https?:|mailto:)/i.test(reference)) continue;
      const present = reference.startsWith("#")
        ? true
        : await validateTarget(file, reference, "CONTRACT_MARKDOWN_LINK_TARGET");
      if (present) await validateAnchor(file, reference);
    }
  }
}

function decodeJsonPointer(root: unknown, fragment: string): unknown {
  if (!fragment || fragment === "#") return root;
  if (!fragment.startsWith("#/")) return undefined;
  const parts = fragment
    .slice(2)
    .split("/")
    .map((part) => decodeURIComponent(part).replaceAll("~1", "/").replaceAll("~0", "~"));
  let current = root;
  for (const part of parts) {
    if (!isRecord(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function collectSchemaRefs(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => collectSchemaRefs(item, output));
  else if (isRecord(value)) {
    if (typeof value.$ref === "string") output.push(value.$ref);
    Object.values(value).forEach((item) => collectSchemaRefs(item, output));
  }
  return output;
}

async function validateSchemaRefs(schemaFiles: string[], parsedJson: Map<string, unknown>): Promise<void> {
  for (const file of schemaFiles) {
    const schema = parsedJson.get(file);
    if (!schema) continue;
    for (const reference of collectSchemaRefs(schema)) {
      const [targetPart, fragment = ""] = reference.split("#", 2);
      const target = targetPart ? path.resolve(path.dirname(file), targetPart) : file;
      const present = await validateTarget(file, targetPart || path.basename(file), "CONTRACT_SCHEMA_REF_TARGET");
      if (!present) continue;
      const targetSchema = target === file ? schema : parsedJson.get(target) ?? (await parseJson(target));
      assert(decodeJsonPointer(targetSchema, fragment ? `#${fragment}` : "#") !== undefined, file, "CONTRACT_SCHEMA_REF_POINTER", `unresolved $ref ${JSON.stringify(reference)}`);
    }
  }
}

function manifestCaseIds(manifest: FixtureManifest): Set<string> {
  const ids = new Set<string>();
  for (const key of ["cases", "pairs", "approval_mode_matrix", "delta_goldens"] as const) {
    for (const item of manifest[key] ?? []) {
      for (const idKey of ["case_id", "pair_id", "golden_id"]) {
        if (typeof item[idKey] === "string") ids.add(item[idKey]);
      }
    }
  }
  return ids;
}

async function validateManifestReferences(manifest: FixtureManifest, file: string): Promise<void> {
  if (typeof manifest.schema === "string") await validateTarget(file, manifest.schema);

  for (const entry of manifest.manifests ?? []) {
    if (typeof entry.schema === "string") await validateTarget(file, entry.schema);
    if (typeof entry.manifest === "string") await validateTarget(file, entry.manifest);
  }

  for (const item of [...(manifest.cases ?? []), ...(manifest.pairs ?? [])]) {
    if (typeof item.path === "string") await validateTarget(file, item.path);
    if (typeof item.file === "string") await validateTarget(file, item.file);
    if (typeof item.root === "string") {
      const root = path.resolve(path.dirname(file), item.root);
      assert(await exists(root), file, "CONTRACT_MISSING_TARGET", `missing fixture root ${JSON.stringify(item.root)}`);
      if (typeof item.entrypoint === "string") await validateTarget(file, path.join(item.root, item.entrypoint));
    }
    for (const variant of item.variants ?? []) {
      if (typeof variant === "string") await validateTarget(file, variant);
      else if (typeof variant.root === "string" && typeof variant.entrypoint === "string") {
        await validateTarget(file, path.join(variant.root, variant.entrypoint));
      }
    }
    for (const side of ["before", "after"] as const) {
      const sideValue = item[side];
      if (typeof sideValue === "string") await validateTarget(file, sideValue);
      else if (sideValue && typeof sideValue.root === "string" && typeof sideValue.entrypoint === "string") {
        await validateTarget(file, path.join(sideValue.root, sideValue.entrypoint));
      }
    }
  }

  await validateAuthorities(manifest, file);
}

function validateFingerprintGoldens(manifest: FixtureManifest, file: string): void {
  function visit(value: unknown): void {
    if (Array.isArray(value)) value.forEach(visit);
    else if (isRecord(value)) {
      if (typeof value.canonical_json_utf8 === "string" && typeof value.expected_fingerprint === "string") {
        const actual = `sha256:${createHash("sha256").update(value.canonical_json_utf8, "utf8").digest("hex")}`;
        assert(actual === value.expected_fingerprint, file, "CONTRACT_FINGERPRINT_MISMATCH", `expected ${value.expected_fingerprint}, calculated ${actual}`);
      }
      Object.values(value).forEach(visit);
    }
  }
  visit(manifest);
}

async function validateJsonl(manifests: ParsedManifest[]): Promise<void> {
  const declarations = new Map<string, FixtureEntry>();
  for (const { file, value } of manifests) {
    for (const item of value.cases ?? []) {
      if (typeof item.path === "string" && item.path.endsWith(".jsonl")) {
        declarations.set(path.resolve(path.dirname(file), item.path), item);
      }
      for (const variant of item.variants ?? []) {
        if (typeof variant === "string" && variant.endsWith(".jsonl")) {
          declarations.set(path.resolve(path.dirname(file), variant), item);
        }
      }
    }
  }

  const jsonlFiles = (await walk(path.join(repositoryRoot, "fixtures"))).filter((file) => file.endsWith(".jsonl"));
  for (const file of jsonlFiles) {
    const declaration = declarations.get(file);
    assert(Boolean(declaration), file, "CONTRACT_UNDECLARED_FIXTURE", "JSONL fixture is not declared by a manifest");
    if (!declaration || declaration.stream_valid === false || declaration.utf8_valid === false) continue;
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(await readFile(file));
      checks += 1;
    } catch (error) {
      checks += 1;
      record(file, "CONTRACT_JSONL_UTF8", errorMessage(error));
      continue;
    }
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (!line) continue;
      try {
        JSON.parse(line);
        checks += 1;
      } catch (error) {
        checks += 1;
        record(file, "CONTRACT_JSONL_PARSE", `line ${index + 1}: ${errorMessage(error)}`);
      }
    }
  }
}

function validateCoverage(manifests: ParsedManifest[], inventory: Inventory): void {
  const families = new Map(inventory.fixture_families.map((family) => [family.fixture_family_id, family]));
  const byFamily = new Map<string, ParsedManifest[]>();
  for (const entry of manifests) {
    const familyId = entry.value.fixture_family_id;
    if (!familyId) continue;
    const group = byFamily.get(familyId) ?? [];
    group.push(entry);
    byFamily.set(familyId, group);
  }

  for (const [familyId, entries] of byFamily) {
    const firstEntry = entries[0];
    if (!firstEntry) continue;
    const inventoryFamily = families.get(familyId);
    assert(Boolean(inventoryFamily), firstEntry.file, "CONTRACT_UNKNOWN_FIXTURE_FAMILY", `fixture family ${JSON.stringify(familyId)} is absent from inventory`);
    if (!inventoryFamily) continue;

    const actualIds = new Set(entries.flatMap((entry) => [...manifestCaseIds(entry.value)]));
    const coverage = new Map();
    for (const entry of entries) {
      for (const [requiredCase, caseIds] of Object.entries(entry.value.inventory_required_case_coverage ?? {})) {
        assert(!coverage.has(requiredCase), entry.file, "CONTRACT_DUPLICATE_COVERAGE_KEY", `duplicate coverage key ${JSON.stringify(requiredCase)} for family ${familyId}`);
        coverage.set(requiredCase, { caseIds, file: entry.file });
      }
    }

    for (const requiredCase of inventoryFamily.required_cases) {
      const mapped = coverage.get(requiredCase);
      const covered = mapped ? Array.isArray(mapped.caseIds) && mapped.caseIds.length > 0 : actualIds.has(requiredCase);
      assert(covered, firstEntry.file, "CONTRACT_TRUTH_TABLE_INCOMPLETE", `required case ${JSON.stringify(requiredCase)} is not covered for family ${familyId}`);
      for (const caseId of mapped?.caseIds ?? []) {
        assert(actualIds.has(caseId), mapped.file, "CONTRACT_COVERAGE_TARGET", `coverage target ${JSON.stringify(caseId)} does not name a case in family ${familyId}`);
      }
    }
  }
}

async function validateSpecificationModels(modelFiles: string[], manifests: ParsedManifest[], inventory: Inventory): Promise<void> {
  const definitions = new Map<string, string>();
  for (const file of modelFiles.filter((item) => item.endsWith(".md"))) {
    const text = await readFile(file, "utf8");
    const candidates = [
      ...text.matchAll(/^\s*id:\s*((?:CAP|CON)-[0-9A-F]{8})\s*$/gm),
      ...text.matchAll(/^##\s+(REQ-[0-9A-F]{8})\b.*$/gm),
    ].sort((a, b) => a.index - b.index);
    for (const match of candidates) {
      const id = match[1];
      if (!id) continue;
      const previous = definitions.get(id);
      assert(!previous, file, "CONTRACT_DUPLICATE_MODEL_ID", `${id} is already defined in ${previous ? relative(previous) : "the canonical specification model"}`);
      if (!previous) definitions.set(id, file);
    }

    const requirementMatches = [...text.matchAll(/^##\s+(REQ-[0-9A-F]{8})\b.*$/gm)];
    for (const [index, match] of requirementMatches.entries()) {
      const end = requirementMatches[index + 1]?.index ?? text.length;
      const block = text.slice(match.index, end);
      const id = match[1] ?? "unknown Requirement";
      assert(/```sdd\s+[\s\S]*?\bkind:\s*\S+[\s\S]*?\bverification:\s*\S+[\s\S]*?```/.test(block), file, "CONTRACT_REQUIREMENT_SHAPE", `${id} is missing its kind and verification metadata block`);
      assert(/^### Statement\s+<!--\s*sdd:statement\s*-->\s*$/m.test(block), file, "CONTRACT_REQUIREMENT_SHAPE", `${id} is missing its Statement section`);
      assert(/^### Acceptance criteria\s+<!--\s*sdd:acceptance\s*-->\s*$/m.test(block), file, "CONTRACT_REQUIREMENT_SHAPE", `${id} is missing its Acceptance criteria section`);
    }
  }

  const referencedRequirements = new Set<string>();
  for (const contract of inventory.contracts ?? []) for (const id of contract.requirements ?? []) referencedRequirements.add(id);
  for (const family of inventory.fixture_families ?? []) for (const id of family.requirements ?? []) referencedRequirements.add(id);
  for (const { value } of manifests) for (const id of value.requirements ?? []) referencedRequirements.add(id);
  for (const id of referencedRequirements) {
    assert(definitions.has(id), path.join(repositoryRoot, "contracts", "v1", "inventory.json"), "CONTRACT_UNKNOWN_REQUIREMENT", `referenced Requirement ${id} has no canonical definition`);
  }
}

async function main(): Promise<void> {
  const [nodeMajorText = "0", nodeMinorText = "0"] = process.versions.node.split(".");
  const nodeMajor = Number.parseInt(nodeMajorText, 10);
  const nodeMinor = Number.parseInt(nodeMinorText, 10);
  const supportedNode = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 18);
  assert(supportedNode, path.join(repositoryRoot, "scripts", "verify-contracts.ts"), "CONTRACT_NODE_VERSION", `Node.js 22.18 or newer is required; found ${process.versions.node}`);

  const contractsRoot = path.join(repositoryRoot, "contracts", "v1");
  const fixturesRoot = path.join(repositoryRoot, "fixtures", "v1");
  const contractFiles = await walk(contractsRoot);
  const fixtureFiles = await walk(fixturesRoot);
  const manifestFiles = fixtureFiles.filter((file) => path.basename(file) === "cases.json");
  const manifests: ParsedManifest[] = [];
  const parsedJson = new Map<string, unknown>();

  for (const file of manifestFiles) {
    const value = await parseJson<FixtureManifest>(file, "CONTRACT_MANIFEST_PARSE");
    if (!value) continue;
    manifests.push({ file, value });
    parsedJson.set(file, value);
    assert(value.status === "contract-fixture-manifest" || value.status === "contract-artifact-fixture-matrix", file, "CONTRACT_MANIFEST_SHAPE", "unexpected or missing contract manifest status");
    if (value.status === "contract-fixture-manifest") {
      assert(value.fixture_manifest_version === "1.0", file, "CONTRACT_MANIFEST_SHAPE", "fixture_manifest_version must be 1.0");
      assert(Array.isArray(value.cases) || Array.isArray(value.pairs), file, "CONTRACT_MANIFEST_SHAPE", "fixture manifest must declare cases or pairs");
    } else {
      assert(value.fixture_matrix_version === "1.0", file, "CONTRACT_MANIFEST_SHAPE", "fixture_matrix_version must be 1.0");
      assert(Array.isArray(value.manifests), file, "CONTRACT_MANIFEST_SHAPE", "artifact fixture matrix must declare manifests");
    }
    validateIds(value, file);
    validateDuplicateNames(value, file);
    validateFingerprintGoldens(value, file);
    await validateManifestReferences(value, file);
  }

  const intentionallyMalformedJson = new Set<string>();
  const declaredArtifactJson = new Set<string>();
  for (const { file, value } of manifests) {
    for (const item of value.cases ?? []) {
      if (value.contract_id?.startsWith("artifact.") && typeof item.path === "string" && item.path.endsWith(".json")) {
        const fixture = path.resolve(path.dirname(file), item.path);
        assert(!declaredArtifactJson.has(fixture), file, "CONTRACT_DUPLICATE_FIXTURE_NAME", `artifact fixture ${JSON.stringify(item.path)} is declared more than once`);
        declaredArtifactJson.add(fixture);
      }
      if (item.parse_valid === false && typeof item.path === "string" && item.path.endsWith(".json")) {
        intentionallyMalformedJson.add(path.resolve(path.dirname(file), item.path));
      }
    }
  }

  for (const file of fixtureFiles.filter((item) => item.endsWith(".json") && relative(item).startsWith("fixtures/v1/artifacts/") && path.basename(item) !== "cases.json")) {
    assert(declaredArtifactJson.has(file), file, "CONTRACT_UNDECLARED_FIXTURE", "artifact JSON fixture is not declared by its manifest");
  }

  for (const file of [...contractFiles, ...fixtureFiles].filter((item) => item.endsWith(".json"))) {
    if (parsedJson.has(file)) continue;
    if (intentionallyMalformedJson.has(file)) {
      try {
        JSON.parse(await readFile(file, "utf8"));
        assert(false, file, "CONTRACT_EXPECTED_MALFORMED_JSON", "fixture is declared parse_invalid but contains valid JSON");
      } catch {
        checks += 1;
      }
      continue;
    }
    const value = await parseJson(file);
    if (value !== undefined) {
      parsedJson.set(file, value);
      validateIds(value, file);
    }
  }

  const inventoryFile = path.join(contractsRoot, "inventory.json");
  const inventory = parsedJson.get(inventoryFile) as Inventory | undefined;
  if (inventory) {
    const contractIds = inventory.contracts.map((contract) => contract.contract_id);
    assert(new Set(contractIds).size === contractIds.length, inventoryFile, "CONTRACT_DUPLICATE_CONTRACT", "inventory contains duplicate contract_id values");
    const familyIds = inventory.fixture_families.map((family) => family.fixture_family_id);
    assert(new Set(familyIds).size === familyIds.length, inventoryFile, "CONTRACT_DUPLICATE_FIXTURE_FAMILY", "inventory contains duplicate fixture_family_id values");
    const knownContracts = new Set(contractIds);
    for (const { file, value } of manifests) {
      for (const contract of [...(value.contracts ?? []), ...(value.contract_id ? [value.contract_id] : [])]) {
        assert(knownContracts.has(contract), file, "CONTRACT_UNKNOWN_CONTRACT", `contract ${JSON.stringify(contract)} is absent from inventory`);
      }
    }
    validateCoverage(manifests, inventory);
  }

  const schemaFiles = contractFiles.filter((file) => file.endsWith(".schema.json"));
  await validateSchemaRefs(schemaFiles, parsedJson);
  await validateJsonl(manifests);

  const proposalFiles = await walk(path.join(repositoryRoot, "proposal"));
  const canonicalFiles = await walk(path.join(repositoryRoot, "spec"));
  if (inventory) await validateSpecificationModels(canonicalFiles, manifests, inventory);
  const documentationFiles = [
    ...proposalFiles,
    ...canonicalFiles,
    path.join(repositoryRoot, "README.md"),
    path.join(repositoryRoot, "IMPLEMENTATION_PLAN.md"),
  ];
  if (await exists(path.join(repositoryRoot, "docs"))) documentationFiles.push(...(await walk(path.join(repositoryRoot, "docs"))));
  await validateMarkdownLinks(documentationFiles);

  for (const file of [...contractFiles, ...fixtureFiles, ...documentationFiles]) {
    if (!/\.(?:json|jsonl|md|ts)$/.test(file)) continue;
    const text = await readFile(file, "utf8");
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (/[ \t]+$/.test(line)) record(file, "CONTRACT_TRAILING_WHITESPACE", `line ${index + 1} has trailing whitespace`);
      checks += 1;
    }
    if (!relative(file).startsWith("fixtures/v1/security/prompt-injection/")) {
      const todoSurface = file.endsWith(".md")
        ? text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "")
        : text;
      assert(!/\bTODO\b/.test(todoSurface), file, "CONTRACT_UNRESOLVED_TODO", "unresolved TODO marker");
    }
  }

  diagnostics.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(`${diagnostic.file} [${diagnostic.code}] ${diagnostic.message}`);
    console.error(`Contract verification failed: ${diagnostics.length} ${diagnostics.length === 1 ? "error" : "errors"}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Contract verification passed: ${checks} checks`);
}

main().catch((error) => {
  console.error(`scripts/verify-contracts.ts [CONTRACT_INTERNAL_ERROR] ${errorStack(error)}`);
  console.error("Contract verification failed: 1 error");
  process.exitCode = 1;
});
