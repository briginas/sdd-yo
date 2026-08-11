import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { createNodeSkillInstaller, nodeSkillInstaller } from "../src/platform/node-skill-installer.ts";
import { SkillInstallationError } from "../src/skill-install/installer.ts";

const executeFile = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const compatibility = {
  package: { name: "sdd-yo", version: "0.5.1" },
  cli: { name: "sdd", version: "0.5.1" },
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

async function replacePackagedSkill(packageRoot: string, content: string): Promise<void> {
  const skillRoot = join(packageRoot, "skills/sdd-yo");
  await writeFile(join(skillRoot, "SKILL.md"), content);
  const manifestPath = join(skillRoot, "payload-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    files: { path: string; sha256: string }[];
  };
  const entry = manifest.files.find((candidate) => candidate.path === "SKILL.md");
  assert.ok(entry);
  entry.sha256 = `sha256:${createHash("sha256").update(content).digest("hex")}`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function snapshot(path: string): Promise<Readonly<Record<string, string>>> {
  const entries = await readdir(path, { recursive: true, withFileTypes: true });
  return Object.fromEntries(
    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const relativePath =
            entry.parentPath === path ? entry.name : `${entry.parentPath.slice(path.length + 1)}/${entry.name}`;
          return [
            relativePath,
            createHash("sha256")
              .update(await readFile(join(entry.parentPath, entry.name)))
              .digest("hex"),
          ];
        }),
    ),
  );
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

test("REQ-DAF21960 updates an older compatible owned installation and reports an exact no-op", async () => {
  const value = await fixture();
  try {
    await nodeSkillInstaller.install({
      repositoryRoot: value.root,
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
    });
    const installedRoot = join(value.root, ".agents/skills/sdd-yo");
    const manifestPath = join(installedRoot, "payload-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      package: { name: string; version: string };
    };
    manifest.package.version = "0.0.9";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const bindingPath = join(installedRoot, "installation.json");
    const binding = JSON.parse(await readFile(bindingPath, "utf8")) as {
      package: { name: string; version: string };
      cli: { name: string; version: string; path: string };
    };
    binding.package.version = "0.0.9";
    binding.cli.version = "0.0.9";
    await writeFile(bindingPath, `${JSON.stringify(binding, null, 2)}\n`);
    await replacePackagedSkill(value.packageRoot, "updated packaged Skill\n");

    const updated = await nodeSkillInstaller.update({
      repositoryRoot: value.root,
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
    });
    assert.equal(updated.outcome, "updated");
    assert.equal(await readFile(join(installedRoot, "SKILL.md"), "utf8"), "updated packaged Skill\n");
    assert.deepEqual(updated.owned_paths, [...updated.owned_paths].sort());
    const updatedSnapshot = await snapshot(installedRoot);

    const unchanged = await nodeSkillInstaller.update({
      repositoryRoot: value.root,
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
    });
    assert.equal(unchanged.outcome, "unchanged");
    assert.deepEqual(await snapshot(installedRoot), updatedSnapshot);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-8DC50806 removes only the verified installation and preserves repository siblings", async () => {
  const value = await fixture();
  try {
    const sentinel = join(value.root, ".agents/skills/keep.txt");
    await mkdir(join(value.root, ".agents/skills"), { recursive: true });
    await writeFile(sentinel, "keep\n");
    const installed = await nodeSkillInstaller.install({
      repositoryRoot: value.root,
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
    });
    const removed = await nodeSkillInstaller.remove({
      repositoryRoot: value.root,
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
    });
    assert.equal(removed.destination, installed.destination);
    assert.deepEqual(removed.removed_paths, installed.installed_paths);
    await assert.rejects(readFile(join(value.root, removed.destination, "installation.json")), /ENOENT/u);
    assert.equal(await readFile(sentinel, "utf8"), "keep\n");
    await assert.rejects(
      nodeSkillInstaller.remove({
        repositoryRoot: value.root,
        packageRoot: value.packageRoot,
        cliPath: value.cliPath,
        compatibility,
      }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_SKILL_LIFECYCLE_INSTALLATION_MISSING",
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-AA165BDE handled update and removal interruption preserve the published installation", async () => {
  const updateValue = await fixture();
  const removeValue = await fixture();
  try {
    await nodeSkillInstaller.install({
      repositoryRoot: updateValue.root,
      packageRoot: updateValue.packageRoot,
      cliPath: updateValue.cliPath,
      compatibility,
    });
    await replacePackagedSkill(updateValue.packageRoot, "interrupted replacement\n");
    const updateRoot = join(updateValue.root, ".agents/skills/sdd-yo");
    const updateBefore = await snapshot(updateRoot);
    const interruptedUpdate = createNodeSkillInstaller({
      beforeUpdatePublish: () => {
        throw new Error("simulated update interruption");
      },
    });
    await assert.rejects(
      interruptedUpdate.update({
        repositoryRoot: updateValue.root,
        packageRoot: updateValue.packageRoot,
        cliPath: updateValue.cliPath,
        compatibility,
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_SKILL_UPDATE_FAILED",
    );
    assert.deepEqual(await snapshot(updateRoot), updateBefore);
    await assert.rejects(readFile(join(updateValue.root, ".agents/skills/.sdd-yo.lifecycle-next/SKILL.md")), /ENOENT/u);

    await nodeSkillInstaller.install({
      repositoryRoot: removeValue.root,
      packageRoot: removeValue.packageRoot,
      cliPath: removeValue.cliPath,
      compatibility,
    });
    const removeRoot = join(removeValue.root, ".agents/skills/sdd-yo");
    const removeBefore = await snapshot(removeRoot);
    const interruptedRemove = createNodeSkillInstaller({
      beforeRemovePublish: () => {
        throw new Error("simulated removal interruption");
      },
    });
    await assert.rejects(
      interruptedRemove.remove({
        repositoryRoot: removeValue.root,
        packageRoot: removeValue.packageRoot,
        cliPath: removeValue.cliPath,
        compatibility,
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_SKILL_REMOVE_FAILED",
    );
    assert.deepEqual(await snapshot(removeRoot), removeBefore);
  } finally {
    await Promise.all([updateValue.root, removeValue.root].map((path) => rm(path, { recursive: true, force: true })));
  }
});

test("REQ-AA165BDE rejects stale, undeclared, and symbolic-link installation bytes without adjacent mutation", async () => {
  const stale = await fixture();
  const linked = await fixture();
  const adjacent = await fixture();
  try {
    for (const value of [stale, linked])
      await nodeSkillInstaller.install({
        repositoryRoot: value.root,
        packageRoot: value.packageRoot,
        cliPath: value.cliPath,
        compatibility,
      });
    const adjacentSentinel = join(adjacent.root, "sentinel");
    await writeFile(adjacentSentinel, "adjacent\n");
    await writeFile(join(stale.root, ".agents/skills/sdd-yo/undeclared.txt"), "unowned\n");
    await assert.rejects(
      nodeSkillInstaller.remove({
        repositoryRoot: stale.root,
        packageRoot: stale.packageRoot,
        cliPath: stale.cliPath,
        compatibility,
      }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
    );
    assert.equal(await readFile(join(stale.root, ".agents/skills/sdd-yo/undeclared.txt"), "utf8"), "unowned\n");

    await symlink(adjacentSentinel, join(linked.root, ".agents/skills/sdd-yo/linked"));
    await assert.rejects(
      nodeSkillInstaller.update({
        repositoryRoot: linked.root,
        packageRoot: linked.packageRoot,
        cliPath: linked.cliPath,
        compatibility,
      }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
    );
    assert.equal(await readFile(adjacentSentinel, "utf8"), "adjacent\n");
  } finally {
    await Promise.all(
      [stale.root, linked.root, adjacent.root].map((path) => rm(path, { recursive: true, force: true })),
    );
  }
});

test("REQ-AA165BDE preserves a concurrent destination change instead of overwriting it", async () => {
  const value = await fixture();
  try {
    await nodeSkillInstaller.install({
      repositoryRoot: value.root,
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
    });
    await replacePackagedSkill(value.packageRoot, "concurrent replacement\n");
    const destination = join(value.root, ".agents/skills/sdd-yo");
    const concurrentPath = join(destination, "concurrent.txt");
    const concurrentUpdate = createNodeSkillInstaller({
      beforeUpdatePublish: async () => await writeFile(concurrentPath, "preserve\n"),
    });
    await assert.rejects(
      concurrentUpdate.update({
        repositoryRoot: value.root,
        packageRoot: value.packageRoot,
        cliPath: value.cliPath,
        compatibility,
      }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
    );
    assert.equal(await readFile(concurrentPath, "utf8"), "preserve\n");
    assert.notEqual(await readFile(join(destination, "SKILL.md"), "utf8"), "concurrent replacement\n");
    await assert.rejects(readFile(join(value.root, ".agents/skills/.sdd-yo.lifecycle-next/SKILL.md")), /ENOENT/u);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});
