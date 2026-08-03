#!/usr/bin/env node

import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";

const fail = (message) => {
  process.stderr.write(`sdd-yo skill eval: ${message}\n`);
  process.exit(1);
};

const optionValue = (name) => {
  const index = process.argv.indexOf(name, 2);
  if (index === -1 || process.argv[index + 1] === undefined) fail(`${name} is required.`);
  return process.argv[index + 1];
};

const fixtureId = optionValue("--fixture");
const output = resolve(optionValue("--output"));
const fixturesPath = resolve(import.meta.dirname, "../fixtures.json");
const catalog = JSON.parse(await readFile(fixturesPath, "utf8"));
const projectFixture = catalog.project_layouts.find(({ id }) => id === fixtureId);
const skillFixture = catalog.skill_manifests.find(({ id }) => id === fixtureId);
const fixture =
  projectFixture ??
  (skillFixture === undefined
    ? undefined
    : { id: skillFixture.id, files: [{ path: skillFixture.path, content: skillFixture.content }] });
if (fixture === undefined) fail(`unknown materializable fixture ${JSON.stringify(fixtureId)}.`);

let outputMetadata;
try {
  outputMetadata = await lstat(output);
} catch {
  fail("--output must be an existing empty directory.");
}
if (!outputMetadata.isDirectory() || outputMetadata.isSymbolicLink())
  fail("--output must be a regular directory, not a symlink or special entry.");
if ((await readdir(output)).length !== 0) fail("--output must be empty.");

for (const entry of fixture.files) {
  if (
    typeof entry.path !== "string" ||
    entry.path.length === 0 ||
    entry.path.includes("\\") ||
    isAbsolute(entry.path) ||
    entry.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  )
    fail(`fixture contains an unsafe path: ${JSON.stringify(entry.path)}.`);
  const target = resolve(output, entry.path);
  if (target !== output && !target.startsWith(`${output}${sep}`)) fail(`fixture path escapes output: ${entry.path}.`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, entry.content, { encoding: "utf8", flag: "wx" });
}

process.stdout.write(`${fixture.id}: ${fixture.files.length} files materialized beneath ${output}\n`);
