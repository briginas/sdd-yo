import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const executeFile = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const skillRoot = join(repositoryRoot, "skills/sdd-yo");
const checker = join(skillRoot, "scripts/check-cli-compatibility");

async function fakeCli(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sdd-skill-cli-"));
  const executable = join(root, "sdd");
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
const command = args[0];
const mode = process.env.SDD_SKILL_FAKE_MODE ?? "valid";
if (mode === "malformed") process.stdout.write("not json");
else if (mode === "interrupted") process.kill(process.pid, "SIGTERM");
else {
  const rootIndex = args.indexOf("--root");
  const projectRoot = rootIndex === -1 ? undefined : args[rootIndex + 1];
  if (command === "init" && projectRoot !== undefined) {
    mkdirSync(join(projectRoot, ".sdd"), { recursive: true });
    mkdirSync(join(projectRoot, "spec/capabilities"), { recursive: true });
    mkdirSync(join(projectRoot, "spec/concepts"), { recursive: true });
    writeFileSync(join(projectRoot, ".sdd/config.yaml"), "project_id: SDD-A1000001\\n");
    writeFileSync(join(projectRoot, "spec/README.md"), "# Specification\\n");
  }
  const schema_version = mode === "incompatible" ? "2.0" : "1.0";
  const result = command === "init"
    ? { created_paths: [".sdd/config.yaml", "spec/README.md", "spec/capabilities", "spec/concepts"] }
    : { valid: true, fingerprints: [] };
  process.stdout.write(JSON.stringify({ schema_version, command, project_id: "SDD-A1000001", status: "ok", result, diagnostics: [] }));
}
`,
  );
  await chmod(executable, 0o755);
  return executable;
}

async function runChecker(
  cli: string,
  args: readonly string[],
  mode = "valid",
): Promise<{ readonly stdout: string; readonly stderr: string; readonly code: number }> {
  try {
    const result = await executeFile(process.execPath, [checker, "--cli", cli, "--", ...args], {
      env: { ...process.env, SDD_SKILL_FAKE_MODE: mode },
    });
    return { stdout: result.stdout, stderr: result.stderr, code: 0 };
  } catch (error) {
    const failure = error as { readonly stdout: string; readonly stderr: string; readonly code: number };
    return { stdout: failure.stdout, stderr: failure.stderr, code: failure.code };
  }
}

test("REQ-0361538D skill package discloses only the bounded 8.1 routes", async () => {
  const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
  const references = await readdir(join(skillRoot, "references"));
  const scripts = await readdir(join(skillRoot, "scripts"));

  assert.match(skill, /^---\nname: sdd-yo\n/u);
  assert.deepEqual(references.toSorted(), ["diagnostics.md", "object-model.md", "onboarding.md"]);
  assert.deepEqual(scripts, ["check-cli-compatibility"]);
  assert.doesNotMatch(skill, /references\/(?:modes|authoring|proposal-gate|verification|semantic-review)\.md/u);
});

test("REQ-382BBBD6 REQ-BFC18F28 compatibility wrapper verifies only reported init paths", async () => {
  const cli = await fakeCli();
  const projectRoot = await mkdtemp(join(tmpdir(), "sdd-skill-project-"));
  await writeFile(join(projectRoot, "unrelated.txt"), "preserve\n");

  const result = await runChecker(cli, ["init", "--root", projectRoot, "--adoption", "incremental"]);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as {
    readonly schema_version: string;
    readonly project_id: string;
    readonly result: { readonly created_paths: readonly string[] };
  };
  assert.equal(response.schema_version, "1.0");
  assert.equal(response.project_id, "SDD-A1000001");
  assert.deepEqual(response.result.created_paths, [
    ".sdd/config.yaml",
    "spec/README.md",
    "spec/capabilities",
    "spec/concepts",
  ]);
  assert.equal(await readFile(join(projectRoot, "unrelated.txt"), "utf8"), "preserve\n");
});

test("REQ-0361538D compatibility wrapper fails closed on unavailable or invalid CLI results", async () => {
  const cli = await fakeCli();
  const selector = ["validate", "--cwd", repositoryRoot] as const;

  for (const mode of ["malformed", "incompatible", "interrupted"] as const) {
    const result = await runChecker(cli, selector, mode);
    assert.equal(result.code, 3, `${mode}: ${result.stderr}`);
  }

  const missing = await runChecker(join(repositoryRoot, "does-not-exist-sdd"), selector);
  assert.equal(missing.code, 3);
  assert.match(missing.stderr, /CLI is missing/u);

  const unsupported = await runChecker(cli, ["proposal", "validate", "--cwd", repositoryRoot]);
  assert.equal(unsupported.code, 3);
  assert.match(unsupported.stderr, /permits only init, validate, inspect, and trace/u);
});
