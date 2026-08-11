import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  SkillInstallationError,
  type UserSkillInstallationInput,
  type UserSkillInstallationResult,
  type UserSkillInstaller,
  type UserSkillRemovalResult,
  type UserSkillUpdateResult,
} from "../skill-install/installer.ts";

export type NodeUserSkillInstallerHooks = {
  readonly beforeInstallPublish?: () => void | Promise<void>;
  readonly afterInstallCliPublish?: () => void | Promise<void>;
  readonly beforeUpdatePublish?: () => void | Promise<void>;
  readonly afterUpdateCliPublish?: () => void | Promise<void>;
  readonly beforeRemovePublish?: () => void | Promise<void>;
  readonly afterRemoveDetach?: () => void | Promise<void>;
};

type FileEntry = { readonly path: string; readonly sha256: `sha256:${string}` };
type TreeInventory = {
  readonly files: readonly FileEntry[];
  readonly directories: readonly string[];
};
type Binding = {
  readonly schema_version: "1.0";
  readonly artifact_type: "sdd_yo_user_skill_installation";
  readonly scope: "user";
  readonly package: UserSkillInstallationInput["compatibility"]["package"];
  readonly cli: UserSkillInstallationInput["compatibility"]["cli"] & { readonly path: string };
  readonly json_schema: UserSkillInstallationInput["compatibility"]["json_schema"];
  readonly skill: UserSkillInstallationInput["compatibility"]["skill"] & {
    readonly payload_fingerprint: `sha256:${string}`;
  };
  readonly package_fingerprint: `sha256:${string}`;
  readonly package_files: readonly FileEntry[];
  readonly skill_files: readonly FileEntry[];
};

const PRIVATE_CLI_PATH = "dist/bin/sdd.js";

function hash(value: Uint8Array | string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
function portable(path: string): string {
  return path.split(sep).join("/");
}
function contained(root: string, path: string): boolean {
  const result = relative(root, path);
  return result === "" || (!isAbsolute(result) && result !== ".." && !result.startsWith(`..${sep}`));
}
function missing(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
async function metadata(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (missing(error)) return undefined;
    throw error;
  }
}
function fail(code: string, message: string): never {
  throw new SkillInstallationError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(sortedExpected);
}

function safeInventoryPath(path: string): boolean {
  return (
    path !== "" &&
    !isAbsolute(path) &&
    !path.includes("\\") &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function expectedDirectories(paths: readonly string[]): readonly string[] {
  const directories = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) directories.add(parts.slice(0, index).join("/"));
  }
  return [...directories].sort();
}

function validFileEntries(value: unknown): value is readonly FileEntry[] {
  if (!Array.isArray(value)) return false;
  let previous: string | undefined;
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, ["path", "sha256"]) ||
      typeof entry["path"] !== "string" ||
      !safeInventoryPath(entry["path"]) ||
      typeof entry["sha256"] !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(entry["sha256"]) ||
      (previous !== undefined && entry["path"] <= previous)
    )
      return false;
    previous = entry["path"];
  }
  return true;
}

function parseBinding(bytes: Uint8Array, compatibility: UserSkillInstallationInput["compatibility"]): Binding {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The user Skill binding is missing or invalid.");
  }
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "schema_version",
      "artifact_type",
      "scope",
      "package",
      "cli",
      "json_schema",
      "skill",
      "package_fingerprint",
      "package_files",
      "skill_files",
    ]) ||
    value["schema_version"] !== "1.0" ||
    value["artifact_type"] !== "sdd_yo_user_skill_installation" ||
    value["scope"] !== "user" ||
    !isRecord(value["package"]) ||
    !exactKeys(value["package"], ["name", "version"]) ||
    typeof value["package"]["name"] !== "string" ||
    typeof value["package"]["version"] !== "string" ||
    !isRecord(value["cli"]) ||
    !exactKeys(value["cli"], ["name", "version", "path"]) ||
    typeof value["cli"]["name"] !== "string" ||
    typeof value["cli"]["version"] !== "string" ||
    typeof value["cli"]["path"] !== "string" ||
    !isAbsolute(value["cli"]["path"]) ||
    !isRecord(value["json_schema"]) ||
    !exactKeys(value["json_schema"], ["version", "compatible_major"]) ||
    typeof value["json_schema"]["version"] !== "string" ||
    !Number.isInteger(value["json_schema"]["compatible_major"]) ||
    !isRecord(value["skill"]) ||
    !exactKeys(value["skill"], ["name", "protocol_version", "compatible_major", "payload_fingerprint"]) ||
    typeof value["skill"]["name"] !== "string" ||
    typeof value["skill"]["protocol_version"] !== "string" ||
    !Number.isInteger(value["skill"]["compatible_major"]) ||
    typeof value["skill"]["payload_fingerprint"] !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(value["skill"]["payload_fingerprint"]) ||
    typeof value["package_fingerprint"] !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(value["package_fingerprint"]) ||
    !validFileEntries(value["package_files"]) ||
    !validFileEntries(value["skill_files"])
  )
    fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The user Skill binding is invalid.");
  const binding = value as Binding;
  if (
    binding.package.name !== compatibility.package.name ||
    binding.cli.name !== compatibility.cli.name ||
    binding.package.version !== binding.cli.version ||
    binding.json_schema.compatible_major !== compatibility.json_schema.compatible_major ||
    binding.skill.name !== compatibility.skill.name ||
    binding.skill.compatible_major !== compatibility.skill.compatible_major ||
    binding.package_fingerprint !== hash(JSON.stringify(binding.package_files)) ||
    binding.skill.payload_fingerprint !== hash(JSON.stringify(binding.skill_files)) ||
    Buffer.compare(Buffer.from(bytes), Buffer.from(canonical(binding))) !== 0
  )
    fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The user Skill binding is stale or incompatible.");
  return binding;
}

async function safeDirectory(path: string, root: string, code: string): Promise<void> {
  const value = await metadata(path);
  if (value === undefined) return;
  if (!value.isDirectory() || value.isSymbolicLink()) fail(code, "A user Skill lifecycle path is unsafe.");
  if (!contained(root, await realpath(path))) fail(code, "A user Skill lifecycle path escapes its selected root.");
}

async function rootsFor(input: UserSkillInstallationInput) {
  if (input.roots.platform !== "darwin")
    fail("SDD_USER_SKILL_PLATFORM_UNSUPPORTED", "User-scoped Skill lifecycle is supported only on macOS.");
  const selectedHome = resolve(input.roots.home);
  const selectedApplicationSupport = resolve(input.roots.applicationSupport);
  const homeMetadata = await metadata(selectedHome);
  const applicationSupportMetadata = await metadata(selectedApplicationSupport);
  if (homeMetadata === undefined || !homeMetadata.isDirectory() || homeMetadata.isSymbolicLink())
    fail("SDD_USER_SKILL_ROOT_INVALID", "The selected user home is not a safe directory.");
  if (
    applicationSupportMetadata === undefined ||
    !applicationSupportMetadata.isDirectory() ||
    applicationSupportMetadata.isSymbolicLink()
  )
    fail("SDD_USER_SKILL_ROOT_INVALID", "The selected Application Support root is not a safe directory.");
  const home = await realpath(selectedHome).catch(() =>
    fail("SDD_USER_SKILL_ROOT_INVALID", "The selected user home is unavailable."),
  );
  const applicationSupport = await realpath(selectedApplicationSupport).catch(() =>
    fail("SDD_USER_SKILL_ROOT_INVALID", "The selected Application Support root is unavailable."),
  );
  if (!contained(home, applicationSupport))
    fail("SDD_USER_SKILL_ROOT_INVALID", "Application Support is outside the selected user home.");
  const skillRoot = join(home, ".agents", "skills");
  const skillDestination = join(skillRoot, "sdd-yo");
  const cliRoot = join(applicationSupport, "sdd-yo", "cli");
  await safeDirectory(join(home, ".agents"), home, "SDD_USER_SKILL_TARGET_UNSAFE");
  await safeDirectory(skillRoot, home, "SDD_USER_SKILL_TARGET_UNSAFE");
  await safeDirectory(join(applicationSupport, "sdd-yo"), applicationSupport, "SDD_USER_SKILL_TARGET_UNSAFE");
  await safeDirectory(cliRoot, applicationSupport, "SDD_USER_SKILL_TARGET_UNSAFE");
  return { home, applicationSupport, skillRoot, skillDestination, cliRoot };
}

async function inventory(root: string, code: string): Promise<TreeInventory> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  if (entries.some((entry) => entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())))
    fail(code, "The user Skill lifecycle tree contains an unsafe entry.");
  const paths = entries.map((entry) => portable(relative(root, join(entry.parentPath, entry.name))));
  if (paths.some((path) => !safeInventoryPath(path))) fail(code, "The user Skill lifecycle inventory is unsafe.");
  const fileEntries = entries.filter((entry) => entry.isFile());
  const files = await Promise.all(
    fileEntries.map(async (entry) => {
      const path = portable(relative(root, join(entry.parentPath, entry.name)));
      return { path, sha256: hash(await readFile(join(root, path))) };
    }),
  );
  return {
    files: files.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
    directories: entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => portable(relative(root, join(entry.parentPath, entry.name))))
      .sort(),
  };
}

async function sourceFor(input: UserSkillInstallationInput) {
  const packageRoot = await realpath(resolve(input.packageRoot)).catch(() =>
    fail("SDD_USER_SKILL_PACKAGE_INVALID", "The executing package is unavailable."),
  );
  const cliPath = await realpath(resolve(input.cliPath)).catch(() =>
    fail("SDD_USER_SKILL_PACKAGE_INVALID", "The executing CLI is unavailable."),
  );
  if (
    !contained(packageRoot, cliPath) ||
    portable(relative(packageRoot, cliPath)) !== PRIVATE_CLI_PATH ||
    !(await stat(cliPath)).isFile()
  )
    fail("SDD_USER_SKILL_PACKAGE_INVALID", "The executing CLI is outside its package.");
  const skillSource = join(packageRoot, "skills", "sdd-yo");
  if (!(await metadata(skillSource))?.isDirectory())
    fail("SDD_USER_SKILL_PACKAGE_INVALID", "The packaged Skill is unavailable.");
  const packageFiles = (await inventory(packageRoot, "SDD_USER_SKILL_PACKAGE_INVALID")).files;
  const skillFiles = (await inventory(skillSource, "SDD_USER_SKILL_PACKAGE_INVALID")).files;
  let manifest: unknown;
  try {
    manifest = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(await readFile(join(skillSource, "payload-manifest.json"))),
    );
  } catch {
    fail("SDD_USER_SKILL_PACKAGE_INVALID", "The packaged Skill manifest is invalid.");
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    !Array.isArray((manifest as { files?: unknown }).files) ||
    (manifest as { package?: { name?: unknown; version?: unknown } }).package?.name !==
      input.compatibility.package.name ||
    (manifest as { package?: { name?: unknown; version?: unknown } }).package?.version !==
      input.compatibility.package.version ||
    (manifest as { skill?: { name?: unknown; protocol_version?: unknown; compatible_major?: unknown } }).skill?.name !==
      input.compatibility.skill.name ||
    (manifest as { skill?: { protocol_version?: unknown } }).skill?.protocol_version !==
      input.compatibility.skill.protocol_version ||
    (manifest as { skill?: { compatible_major?: unknown } }).skill?.compatible_major !==
      input.compatibility.skill.compatible_major
  )
    fail("SDD_USER_SKILL_PACKAGE_INVALID", "The packaged Skill manifest identity is incompatible.");
  const declared = (manifest as { files: readonly { path?: unknown; sha256?: unknown }[] }).files;
  const payloadFiles = skillFiles.filter((entry) => entry.path !== "payload-manifest.json");
  if (
    declared.length !== payloadFiles.length ||
    declared.some(
      (entry, index) =>
        typeof entry.path !== "string" ||
        typeof entry.sha256 !== "string" ||
        entry.path !== payloadFiles[index]?.path ||
        entry.sha256 !== payloadFiles[index]?.sha256,
    )
  )
    fail("SDD_USER_SKILL_PACKAGE_INVALID", "The packaged Skill payload inventory is stale.");
  return {
    packageRoot,
    skillSource,
    packageFiles,
    skillFiles,
    packageFingerprint: hash(JSON.stringify(packageFiles)),
    payloadFingerprint: hash(JSON.stringify(skillFiles)),
  };
}

function bindingFor(
  input: UserSkillInstallationInput,
  source: Awaited<ReturnType<typeof sourceFor>>,
  cliDestination: string,
): Binding {
  return {
    schema_version: "1.0",
    artifact_type: "sdd_yo_user_skill_installation",
    scope: "user",
    package: input.compatibility.package,
    cli: { ...input.compatibility.cli, path: cliDestination },
    json_schema: input.compatibility.json_schema,
    skill: { ...input.compatibility.skill, payload_fingerprint: source.payloadFingerprint },
    package_fingerprint: source.packageFingerprint,
    package_files: source.packageFiles,
    skill_files: source.skillFiles,
  };
}
async function copyTree(source: string, destination: string, inventory: readonly FileEntry[]) {
  await mkdir(destination, { recursive: true });
  for (const entry of inventory) {
    const target = join(destination, entry.path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(source, entry.path), target);
    await chmod(target, (await stat(join(source, entry.path))).mode);
  }
}
function canonical(binding: Binding): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(binding, null, 2)}\n`);
}
async function verify(
  destination: string,
  expectedRoot: string,
  compatibility: UserSkillInstallationInput["compatibility"],
): Promise<Binding> {
  await safeDirectory(destination, expectedRoot, "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID");
  let bytes: Uint8Array;
  try {
    bytes = await readFile(join(destination, "installation.json"));
  } catch {
    fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The user Skill binding is missing or invalid.");
  }
  const typed = parseBinding(bytes, compatibility);
  const actual = await inventory(destination, "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID");
  const owned = [...typed.skill_files.map((entry) => entry.path), "installation.json"].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  if (
    JSON.stringify(actual.files.map((entry) => entry.path)) !== JSON.stringify(owned) ||
    JSON.stringify(actual.directories) !== JSON.stringify(expectedDirectories(owned))
  )
    fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The user Skill inventory is stale.");
  const installedSkillFiles = actual.files.filter((entry) => entry.path !== "installation.json");
  if (JSON.stringify(installedSkillFiles) !== JSON.stringify(typed.skill_files))
    fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The user Skill bytes are modified.");
  return typed;
}

async function verifyCli(destination: string, expectedRoot: string, binding: Binding): Promise<void> {
  await safeDirectory(destination, expectedRoot, "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID");
  const actual = await inventory(destination, "SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID");
  if (
    JSON.stringify(actual.files) !== JSON.stringify(binding.package_files) ||
    JSON.stringify(actual.directories) !==
      JSON.stringify(expectedDirectories(binding.package_files.map((entry) => entry.path)))
  )
    fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The private CLI inventory is stale.");
}

function installationResult(
  input: UserSkillInstallationInput,
  roots: Awaited<ReturnType<typeof rootsFor>>,
  source: Awaited<ReturnType<typeof sourceFor>>,
  cliDestination: string,
): UserSkillInstallationResult {
  return {
    scope: "user",
    skill_destination: roots.skillDestination,
    cli_destination: cliDestination,
    owned_paths: [
      ...source.skillFiles.map((entry) => `skill/${entry.path}`),
      ...source.packageFiles.map((entry) => `cli/${entry.path}`),
    ].sort(),
    package_fingerprint: source.packageFingerprint,
    payload_fingerprint: source.payloadFingerprint,
    compatibility: input.compatibility,
  };
}

export function createNodeUserSkillInstaller(hooks: NodeUserSkillInstallerHooks = {}): UserSkillInstaller {
  return {
    async install(input) {
      const roots = await rootsFor(input);
      const source = await sourceFor(input);
      const cliDestination = join(roots.cliRoot, input.compatibility.package.version);
      const stagedSkill = `${roots.skillDestination}.next`;
      const stagedCli = `${cliDestination}.next`;
      if (
        (await metadata(roots.skillDestination)) === undefined &&
        (await metadata(cliDestination)) !== undefined &&
        (await metadata(stagedSkill)) !== undefined &&
        (await metadata(stagedCli)) === undefined
      ) {
        const recoveredBinding = await verify(stagedSkill, roots.home, input.compatibility);
        const expectedBinding = bindingFor(input, source, join(cliDestination, PRIVATE_CLI_PATH));
        if (JSON.stringify(recoveredBinding) !== JSON.stringify(expectedBinding))
          fail(
            "SDD_USER_SKILL_RECOVERY_INVALID",
            "The interrupted user Skill installation does not match this package.",
          );
        await verifyCli(cliDestination, roots.applicationSupport, recoveredBinding);
        await rename(stagedSkill, roots.skillDestination);
        return installationResult(input, roots, source, cliDestination);
      }
      if ((await metadata(roots.skillDestination)) || (await metadata(cliDestination)))
        fail("SDD_USER_SKILL_INSTALL_DESTINATION_EXISTS", "A user-scoped Skill destination already exists.");
      if ((await metadata(stagedSkill)) || (await metadata(stagedCli)))
        fail("SDD_USER_SKILL_RECOVERY_REQUIRED", "A previous user Skill lifecycle operation requires recovery.");
      let cliPublished = false;
      try {
        await copyTree(source.skillSource, stagedSkill, source.skillFiles);
        await copyTree(source.packageRoot, stagedCli, source.packageFiles);
        const binding = bindingFor(input, source, join(cliDestination, PRIVATE_CLI_PATH));
        await writeFile(join(stagedSkill, "installation.json"), canonical(binding), { flag: "wx" });
        await verify(stagedSkill, roots.home, input.compatibility);
        await hooks.beforeInstallPublish?.();
        if ((await metadata(roots.skillDestination)) || (await metadata(cliDestination)))
          fail("SDD_USER_SKILL_LIFECYCLE_STATE_CHANGED", "A user Skill destination changed during installation.");
        await rename(stagedCli, cliDestination);
        cliPublished = true;
        await hooks.afterInstallCliPublish?.();
        await rename(stagedSkill, roots.skillDestination);
        return installationResult(input, roots, source, cliDestination);
      } catch (error) {
        if (!cliPublished) {
          await rm(stagedSkill, { recursive: true, force: true });
          await rm(stagedCli, { recursive: true, force: true });
        }
        if (error instanceof SkillInstallationError) throw error;
        fail(
          "SDD_USER_SKILL_INSTALL_FAILED",
          error instanceof Error ? error.message : "User Skill installation failed.",
        );
      }
    },
    async update(input) {
      const roots = await rootsFor(input);
      const source = await sourceFor(input);
      const nextCli = join(roots.cliRoot, input.compatibility.package.version);
      const stagedSkill = `${roots.skillDestination}.next`;
      const stagedCli = `${nextCli}.next`;
      const previousSkill = `${roots.skillDestination}.previous`;
      if (
        (await metadata(roots.skillDestination)) === undefined &&
        (await metadata(previousSkill)) !== undefined &&
        (await metadata(stagedSkill)) !== undefined &&
        (await metadata(nextCli)) !== undefined &&
        (await metadata(stagedCli)) === undefined
      ) {
        const previous = await verify(previousSkill, roots.home, input.compatibility);
        const previousCli = join(roots.cliRoot, previous.package.version);
        await verifyCli(previousCli, roots.applicationSupport, previous);
        const replacement = await verify(stagedSkill, roots.home, input.compatibility);
        const expected = bindingFor(input, source, join(nextCli, PRIVATE_CLI_PATH));
        if (JSON.stringify(replacement) !== JSON.stringify(expected))
          fail("SDD_USER_SKILL_RECOVERY_INVALID", "The interrupted user Skill update does not match this package.");
        await verifyCli(nextCli, roots.applicationSupport, replacement);
        await rename(stagedSkill, roots.skillDestination);
        await rm(previousCli, { recursive: true });
        await rm(previousSkill, { recursive: true });
        return { ...installationResult(input, roots, source, nextCli), outcome: "updated" };
      }
      const current = await verify(roots.skillDestination, roots.home, input.compatibility);
      const currentCli = join(roots.cliRoot, current.package.version);
      if (!contained(roots.cliRoot, currentCli))
        fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The private CLI binding escapes its store.");
      if (current.cli.path !== join(currentCli, PRIVATE_CLI_PATH))
        fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The private CLI binding is not canonical.");
      await verifyCli(currentCli, roots.applicationSupport, current);
      const nextBinding = bindingFor(input, source, join(nextCli, PRIVATE_CLI_PATH));
      if (JSON.stringify(current) === JSON.stringify(nextBinding))
        return { ...installationResult(input, roots, source, nextCli), outcome: "unchanged" };
      if ((await metadata(nextCli)) !== undefined)
        fail("SDD_USER_SKILL_UPDATE_COLLISION", "The replacement private CLI version is already occupied.");
      if ((await metadata(stagedSkill)) || (await metadata(stagedCli)) || (await metadata(previousSkill)))
        fail("SDD_USER_SKILL_RECOVERY_REQUIRED", "A previous user Skill lifecycle operation requires recovery.");
      let oldSkillMoved = false;
      let nextCliPublished = false;
      let replacementPublished = false;
      try {
        await copyTree(source.skillSource, stagedSkill, source.skillFiles);
        await copyTree(source.packageRoot, stagedCli, source.packageFiles);
        await writeFile(join(stagedSkill, "installation.json"), canonical(nextBinding), { flag: "wx" });
        await verify(stagedSkill, roots.home, input.compatibility);
        await verifyCli(stagedCli, roots.applicationSupport, nextBinding);
        const rechecked = await verify(roots.skillDestination, roots.home, input.compatibility);
        if (JSON.stringify(rechecked) !== JSON.stringify(current))
          fail("SDD_USER_SKILL_LIFECYCLE_STATE_CHANGED", "The user Skill installation changed during update.");
        await hooks.beforeUpdatePublish?.();
        const publishCheck = await verify(roots.skillDestination, roots.home, input.compatibility);
        if (JSON.stringify(publishCheck) !== JSON.stringify(current))
          fail(
            "SDD_USER_SKILL_LIFECYCLE_STATE_CHANGED",
            "The user Skill installation changed before update publication.",
          );
        await rename(roots.skillDestination, previousSkill);
        oldSkillMoved = true;
        await rename(stagedCli, nextCli);
        nextCliPublished = true;
        await hooks.afterUpdateCliPublish?.();
        await rename(stagedSkill, roots.skillDestination);
        replacementPublished = true;
        await rm(currentCli, { recursive: true });
        await rm(previousSkill, { recursive: true });
        return { ...installationResult(input, roots, source, nextCli), outcome: "updated" };
      } catch (error) {
        if (
          oldSkillMoved &&
          !replacementPublished &&
          !nextCliPublished &&
          (await metadata(roots.skillDestination)) === undefined &&
          (await metadata(previousSkill)) !== undefined
        )
          await rename(previousSkill, roots.skillDestination);
        if (!nextCliPublished) {
          await rm(stagedSkill, { recursive: true, force: true });
          await rm(stagedCli, { recursive: true, force: true });
        }
        if (error instanceof SkillInstallationError) throw error;
        fail("SDD_USER_SKILL_UPDATE_FAILED", error instanceof Error ? error.message : "User Skill update failed.");
      }
    },
    async remove(input) {
      const roots = await rootsFor(input);
      const binding = await verify(roots.skillDestination, roots.home, input.compatibility);
      const cliDestination = join(roots.cliRoot, binding.package.version);
      if (!contained(roots.cliRoot, cliDestination))
        fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The private CLI binding escapes its store.");
      if (binding.cli.path !== join(cliDestination, PRIVATE_CLI_PATH))
        fail("SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID", "The private CLI binding is not canonical.");
      await verifyCli(cliDestination, roots.applicationSupport, binding);
      const previousSkill = `${roots.skillDestination}.previous`;
      const previousCli = `${cliDestination}.previous`;
      if ((await metadata(previousSkill)) !== undefined)
        fail("SDD_USER_SKILL_RECOVERY_REQUIRED", "A previous user Skill lifecycle operation requires recovery.");
      if ((await metadata(previousCli)) !== undefined)
        fail("SDD_USER_SKILL_RECOVERY_REQUIRED", "A previous user Skill lifecycle operation requires recovery.");
      const rechecked = await verify(roots.skillDestination, roots.home, input.compatibility);
      if (JSON.stringify(rechecked) !== JSON.stringify(binding))
        fail("SDD_USER_SKILL_LIFECYCLE_STATE_CHANGED", "The user Skill installation changed during removal.");
      await hooks.beforeRemovePublish?.();
      const publishCheck = await verify(roots.skillDestination, roots.home, input.compatibility);
      if (JSON.stringify(publishCheck) !== JSON.stringify(binding))
        fail("SDD_USER_SKILL_LIFECYCLE_STATE_CHANGED", "The user Skill installation changed before removal.");
      await rename(roots.skillDestination, previousSkill);
      try {
        await rename(cliDestination, previousCli);
        await hooks.afterRemoveDetach?.();
        await rm(previousCli, { recursive: true });
        await rm(previousSkill, { recursive: true });
      } catch (error) {
        if ((await metadata(cliDestination)) === undefined && (await metadata(previousCli)) !== undefined)
          await rename(previousCli, cliDestination).catch(() => undefined);
        if (
          (await metadata(roots.skillDestination)) === undefined &&
          (await metadata(previousSkill)) !== undefined &&
          (await metadata(cliDestination)) !== undefined
        )
          await rename(previousSkill, roots.skillDestination).catch(() => undefined);
        if (error instanceof SkillInstallationError) throw error;
        fail("SDD_USER_SKILL_REMOVE_FAILED", error instanceof Error ? error.message : "User Skill removal failed.");
      }
      return {
        scope: "user",
        skill_destination: roots.skillDestination,
        cli_destination: cliDestination,
        removed_paths: [
          ...binding.skill_files.map((entry) => `skill/${entry.path}`),
          ...binding.package_files.map((entry) => `cli/${entry.path}`),
        ].sort(),
      } satisfies UserSkillRemovalResult;
    },
  };
}

export const nodeUserSkillInstaller = createNodeUserSkillInstaller();
