import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { nodeSkillInstaller } from "../src/platform/node-skill-installer.ts";
import { SkillInstallationError } from "../src/skill-install/installer.ts";

const executeFile = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const compatibility = {
  package: { name: "sdd-yo", version: "0.1.0" },
  cli: { name: "sdd", version: "0.1.0" },
  json_schema: { version: "1.0", compatible_major: 1 },
  skill: { name: "sdd-yo", protocol_version: "1.0", compatible_major: 1 },
} as const;

async function fixture(): Promise<{
  readonly root: string;
  readonly packageRoot: string;
  readonly cliPath: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "sdd-skill-install-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  const packageRoot = join(root, "node_modules/sdd-yo");
  const cliPath = join(packageRoot, "dist/bin/sdd.js");
  await mkdir(join(packageRoot, "dist/bin"), { recursive: true });
  await cp(join(repositoryRoot, "skills/sdd-yo"), join(packageRoot, "skills/sdd-yo"), { recursive: true });
  await writeFile(cliPath, "#!/usr/bin/env node\n");
  await chmod(cliPath, 0o755);
  return { root, packageRoot, cliPath };
}

test("REQ-3F19778B installs exact packaged Skill bytes and a deterministic repository binding", async () => {
  const value = await fixture();
  try {
    const result = await nodeSkillInstaller.install({
      repositoryRoot: value.root,
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
    });
    assert.equal(result.destination, ".agents/skills/sdd-yo");
    assert.match(result.payload_fingerprint, /^sha256:[0-9a-f]{64}$/u);
    assert.deepEqual(result.installed_paths, [...result.installed_paths].sort());
    const installedRoot = join(value.root, result.destination);
    const payloadManifest = JSON.parse(await readFile(join(installedRoot, "payload-manifest.json"), "utf8")) as {
      readonly files: readonly { readonly path: string }[];
    };
    for (const entry of payloadManifest.files)
      assert.deepEqual(
        await readFile(join(installedRoot, entry.path)),
        await readFile(join(value.packageRoot, "skills/sdd-yo", entry.path)),
      );
    const binding = JSON.parse(await readFile(join(installedRoot, "installation.json"), "utf8")) as {
      readonly cli: { readonly path: string };
      readonly skill: { readonly payload_fingerprint: string };
    };
    assert.equal(binding.cli.path, "node_modules/sdd-yo/dist/bin/sdd.js");
    assert.equal(binding.skill.payload_fingerprint, result.payload_fingerprint);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-A0456614 refuses overwrite, modified payload, non-root selection, and symlink escape without mutation", async () => {
  const existing = await fixture();
  const modified = await fixture();
  const linked = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "sdd-skill-outside-"));
  try {
    await nodeSkillInstaller.install({
      repositoryRoot: existing.root,
      packageRoot: existing.packageRoot,
      cliPath: existing.cliPath,
      compatibility,
    });
    const bindingPath = join(existing.root, ".agents/skills/sdd-yo/installation.json");
    const bindingBefore = await readFile(bindingPath);
    await assert.rejects(
      nodeSkillInstaller.install({
        repositoryRoot: existing.root,
        packageRoot: existing.packageRoot,
        cliPath: existing.cliPath,
        compatibility,
      }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_SKILL_INSTALL_DESTINATION_EXISTS",
    );
    assert.deepEqual(await readFile(bindingPath), bindingBefore);

    await writeFile(join(modified.packageRoot, "skills/sdd-yo/SKILL.md"), "modified\n");
    await assert.rejects(
      nodeSkillInstaller.install({
        repositoryRoot: modified.root,
        packageRoot: modified.packageRoot,
        cliPath: modified.cliPath,
        compatibility,
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_SKILL_PACKAGE_INVALID",
    );

    const nested = join(linked.root, "nested");
    await mkdir(nested);
    await assert.rejects(
      nodeSkillInstaller.install({
        repositoryRoot: nested,
        packageRoot: linked.packageRoot,
        cliPath: linked.cliPath,
        compatibility,
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_SKILL_INSTALL_ROOT_INVALID",
    );

    await writeFile(join(outside, "sentinel"), "outside\n");
    await symlink(outside, join(linked.root, ".agents"));
    await assert.rejects(
      nodeSkillInstaller.install({
        repositoryRoot: linked.root,
        packageRoot: linked.packageRoot,
        cliPath: linked.cliPath,
        compatibility,
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_SKILL_INSTALL_TARGET_UNSAFE",
    );
    assert.equal(await readFile(join(outside, "sentinel"), "utf8"), "outside\n");
  } finally {
    await Promise.all(
      [existing.root, modified.root, linked.root, outside].map((path) => rm(path, { recursive: true, force: true })),
    );
  }
});
