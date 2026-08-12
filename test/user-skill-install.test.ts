import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createNodeUserSkillInstaller } from "../src/platform/node-user-skill-installer.ts";
import { SkillInstallationError } from "../src/skill-install/installer.ts";

const repositoryRoot = join(import.meta.dirname, "..");
const compatibility = {
  package: { name: "sdd-yo", version: "0.5.2" },
  cli: { name: "sdd", version: "0.5.2" },
  json_schema: { version: "1.0", compatible_major: 1 },
  skill: { name: "sdd-yo", protocol_version: "1.0", compatible_major: 1 },
} as const;

function compatibilityFor(version: string) {
  return { ...compatibility, package: { ...compatibility.package, version }, cli: { ...compatibility.cli, version } };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "sdd-user-skill-"));
  const home = join(root, "home");
  const applicationSupport = join(home, "Library", "Application Support");
  const packageRoot = join(root, "package");
  const cliPath = join(packageRoot, "dist", "bin", "sdd.js");
  await mkdir(applicationSupport, { recursive: true });
  await mkdir(join(packageRoot, "dist", "bin"), { recursive: true });
  await cp(join(repositoryRoot, "skills", "sdd-yo"), join(packageRoot, "skills", "sdd-yo"), { recursive: true });
  await writeFile(
    join(packageRoot, "package.json"),
    `${JSON.stringify({ name: "sdd-yo", version: "0.5.2", type: "module", bin: { sdd: "./dist/bin/sdd.js" } }, null, 2)}\n`,
  );
  await writeFile(cliPath, "#!/usr/bin/env node\n");
  await chmod(cliPath, 0o755);
  return { root, home, applicationSupport, packageRoot, cliPath };
}

async function replacePackage(value: Awaited<ReturnType<typeof fixture>>, version: string, skillText: string) {
  const skillRoot = join(value.packageRoot, "skills", "sdd-yo");
  await writeFile(join(skillRoot, "SKILL.md"), skillText);
  const manifestPath = join(skillRoot, "payload-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    package: { version: string };
    files: { path: string; sha256: string }[];
  };
  manifest.package.version = version;
  const entry = manifest.files.find((candidate) => candidate.path === "SKILL.md");
  assert.ok(entry);
  entry.sha256 = `sha256:${createHash("sha256").update(skillText).digest("hex")}`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const packageManifest = JSON.parse(await readFile(join(value.packageRoot, "package.json"), "utf8")) as {
    version: string;
  };
  packageManifest.version = version;
  await writeFile(join(value.packageRoot, "package.json"), `${JSON.stringify(packageManifest, null, 2)}\n`);
}

test("REQ-778099C0 installs one exact macOS user Skill and private CLI without changing a repository", async () => {
  const value = await fixture();
  try {
    const result = await createNodeUserSkillInstaller().install({
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
      roots: { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" },
    });
    assert.equal(result.scope, "user");
    assert.equal(result.cli_destination, join(await realpath(value.applicationSupport), "sdd-yo", "cli", "0.5.2"));
    assert.match(result.package_fingerprint, /^sha256:[0-9a-f]{64}$/u);
    assert.deepEqual(result.owned_paths, [...result.owned_paths].sort());
    const binding = JSON.parse(await readFile(join(result.skill_destination, "installation.json"), "utf8")) as {
      cli: { path: string };
    };
    assert.equal(binding.cli.path, join(result.cli_destination, "dist", "bin", "sdd.js"));
    await assert.rejects(readFile(join(value.root, ".sdd", "config.yaml")), /ENOENT/u);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-DEB23207 removes only verified user-owned paths and REQ-C18AEE90 refuses non-macOS", async () => {
  const value = await fixture();
  try {
    const installer = createNodeUserSkillInstaller();
    const input = {
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
      roots: { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" },
    } as const;
    const installed = await installer.install(input);
    const sibling = join(value.applicationSupport, "sdd-yo", "keep.txt");
    await writeFile(sibling, "keep\n");
    const removed = await installer.remove(input);
    assert.deepEqual(removed.removed_paths, installed.owned_paths);
    assert.equal(await readFile(sibling, "utf8"), "keep\n");
    await assert.rejects(
      installer.install({ ...input, roots: { ...input.roots, platform: "linux" } }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_PLATFORM_UNSUPPORTED",
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-C18AEE90 refuses a stale packaged Skill manifest before creating user destinations", async () => {
  const value = await fixture();
  try {
    await writeFile(join(value.packageRoot, "skills", "sdd-yo", "SKILL.md"), "modified\n");
    await assert.rejects(
      createNodeUserSkillInstaller().install({
        packageRoot: value.packageRoot,
        cliPath: value.cliPath,
        compatibility,
        roots: { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" },
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_PACKAGE_INVALID",
    );
    await assert.rejects(readFile(join(value.home, ".agents", "skills", "sdd-yo", "installation.json")), /ENOENT/u);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-778099C0 REQ-C18AEE90 refuses an incompatible executing package identity before mutation", async () => {
  const value = await fixture();
  try {
    await writeFile(
      join(value.packageRoot, "package.json"),
      `${JSON.stringify({ name: "foreign-package", version: "0.5.2", type: "module", bin: { sdd: "./dist/bin/sdd.js" } }, null, 2)}\n`,
    );
    await assert.rejects(
      createNodeUserSkillInstaller().install({
        packageRoot: value.packageRoot,
        cliPath: value.cliPath,
        compatibility,
        roots: { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" },
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_PACKAGE_INVALID",
    );
    await assert.rejects(readFile(join(value.home, ".agents", "skills", "sdd-yo", "installation.json")), /ENOENT/u);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-2B49D454 updates an owned user installation and reports an exact no-op", async () => {
  const value = await fixture();
  try {
    const installer = createNodeUserSkillInstaller();
    const roots = { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" } as const;
    await installer.install({ packageRoot: value.packageRoot, cliPath: value.cliPath, compatibility, roots });
    const unchanged = await installer.update({
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
      roots,
    });
    assert.equal(unchanged.outcome, "unchanged");
    await replacePackage(value, "0.5.3", "replacement Skill\n");
    const updated = await installer.update({
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility: compatibilityFor("0.5.3"),
      roots,
    });
    assert.equal(updated.outcome, "updated");
    assert.equal(await readFile(join(updated.skill_destination, "SKILL.md"), "utf8"), "replacement Skill\n");
    await assert.rejects(
      readFile(join(value.applicationSupport, "sdd-yo", "cli", "0.5.2", "dist", "bin", "sdd.js")),
      /ENOENT/u,
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-C18AEE90 preserves concurrent changes before update and removal publication", async () => {
  const updateValue = await fixture();
  const removeValue = await fixture();
  try {
    const rootsFor = (value: Awaited<ReturnType<typeof fixture>>) =>
      ({ home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" }) as const;
    await createNodeUserSkillInstaller().install({
      packageRoot: updateValue.packageRoot,
      cliPath: updateValue.cliPath,
      compatibility,
      roots: rootsFor(updateValue),
    });
    await replacePackage(updateValue, "0.5.3", "replacement Skill\n");
    const updateSentinel = join(updateValue.home, ".agents", "skills", "sdd-yo", "concurrent.txt");
    const concurrentUpdate = createNodeUserSkillInstaller({
      beforeUpdatePublish: () => writeFile(updateSentinel, "preserve\n"),
    });
    await assert.rejects(
      concurrentUpdate.update({
        packageRoot: updateValue.packageRoot,
        cliPath: updateValue.cliPath,
        compatibility: compatibilityFor("0.5.3"),
        roots: rootsFor(updateValue),
      }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
    );
    assert.equal(await readFile(updateSentinel, "utf8"), "preserve\n");

    await createNodeUserSkillInstaller().install({
      packageRoot: removeValue.packageRoot,
      cliPath: removeValue.cliPath,
      compatibility,
      roots: rootsFor(removeValue),
    });
    const removeSentinel = join(removeValue.home, ".agents", "skills", "sdd-yo", "concurrent.txt");
    const concurrentRemove = createNodeUserSkillInstaller({
      beforeRemovePublish: () => writeFile(removeSentinel, "preserve\n"),
    });
    await assert.rejects(
      concurrentRemove.remove({
        packageRoot: removeValue.packageRoot,
        cliPath: removeValue.cliPath,
        compatibility,
        roots: rootsFor(removeValue),
      }),
      (error: unknown) =>
        error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
    );
    assert.equal(await readFile(removeSentinel, "utf8"), "preserve\n");
  } finally {
    await Promise.all([updateValue.root, removeValue.root].map((path) => rm(path, { recursive: true, force: true })));
  }
});

test("REQ-C18AEE90 retains verified recovery state when publication is interrupted", async () => {
  const value = await fixture();
  try {
    const roots = { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" } as const;
    const interrupted = createNodeUserSkillInstaller({
      afterInstallCliPublish: () => {
        throw new Error("interrupted");
      },
    });
    await assert.rejects(
      interrupted.install({ packageRoot: value.packageRoot, cliPath: value.cliPath, compatibility, roots }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_INSTALL_FAILED",
    );
    assert.equal(
      await readFile(join(value.applicationSupport, "sdd-yo", "cli", "0.5.2", "dist", "bin", "sdd.js"), "utf8"),
      "#!/usr/bin/env node\n",
    );
    await assert.rejects(readFile(join(value.home, ".agents", "skills", "sdd-yo", "installation.json")), /ENOENT/u);
    const recovered = await createNodeUserSkillInstaller().install({
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
      roots,
    });
    assert.equal(
      await readFile(join(recovered.skill_destination, "installation.json"), "utf8")
        .then(JSON.parse)
        .then((binding) => binding.scope),
      "user",
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-2B49D454 reconciles an interrupted verified update on the next explicit update", async () => {
  const value = await fixture();
  try {
    const roots = { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" } as const;
    await createNodeUserSkillInstaller().install({
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility,
      roots,
    });
    await replacePackage(value, "0.5.3", "replacement Skill\n");
    const replacementCompatibility = compatibilityFor("0.5.3");
    const interrupted = createNodeUserSkillInstaller({
      afterUpdateCliPublish: () => {
        throw new Error("interrupted");
      },
    });
    await assert.rejects(
      interrupted.update({
        packageRoot: value.packageRoot,
        cliPath: value.cliPath,
        compatibility: replacementCompatibility,
        roots,
      }),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_UPDATE_FAILED",
    );
    const recovered = await createNodeUserSkillInstaller().update({
      packageRoot: value.packageRoot,
      cliPath: value.cliPath,
      compatibility: replacementCompatibility,
      roots,
    });
    assert.equal(recovered.outcome, "updated");
    assert.equal(await readFile(join(recovered.skill_destination, "SKILL.md"), "utf8"), "replacement Skill\n");
    await assert.rejects(
      readFile(join(value.home, ".agents", "skills", "sdd-yo.previous", "installation.json")),
      /ENOENT/u,
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-50351033 user lifecycle preserves a separate repository-scoped installation", async () => {
  const value = await fixture();
  try {
    const repositorySkill = join(value.root, "repository", ".agents", "skills", "sdd-yo");
    const repositorySentinel = join(repositorySkill, "repository-owned.txt");
    await mkdir(repositorySkill, { recursive: true });
    await writeFile(repositorySentinel, "repository installation\n");
    const roots = { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" } as const;
    const installer = createNodeUserSkillInstaller();
    await installer.install({ packageRoot: value.packageRoot, cliPath: value.cliPath, compatibility, roots });
    assert.equal(await readFile(repositorySentinel, "utf8"), "repository installation\n");
    await installer.remove({ packageRoot: value.packageRoot, cliPath: value.cliPath, compatibility, roots });
    assert.equal(await readFile(repositorySentinel, "utf8"), "repository installation\n");
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("REQ-DEB23207 REQ-C18AEE90 interrupted removal restores both verified destinations", async () => {
  const value = await fixture();
  try {
    const roots = { home: value.home, applicationSupport: value.applicationSupport, platform: "darwin" } as const;
    const input = { packageRoot: value.packageRoot, cliPath: value.cliPath, compatibility, roots };
    const installed = await createNodeUserSkillInstaller().install(input);
    const interrupted = createNodeUserSkillInstaller({
      afterRemoveDetach: () => {
        throw new Error("interrupted");
      },
    });
    await assert.rejects(
      interrupted.remove(input),
      (error: unknown) => error instanceof SkillInstallationError && error.code === "SDD_USER_SKILL_REMOVE_FAILED",
    );
    assert.equal(
      JSON.parse(await readFile(join(installed.skill_destination, "installation.json"), "utf8")).scope,
      "user",
    );
    assert.equal(
      await readFile(join(installed.cli_destination, "dist", "bin", "sdd.js"), "utf8"),
      "#!/usr/bin/env node\n",
    );
    const removed = await createNodeUserSkillInstaller().remove(input);
    assert.equal(removed.scope, "user");
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});
