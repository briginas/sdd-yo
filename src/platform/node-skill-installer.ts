import { spawn } from "node:child_process";
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
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import type { CliCompatibilityIdentity } from "../cli/identity.ts";
import {
  SKILL_INSTALLATION_DESTINATION,
  SkillInstallationError,
  type SkillInstallationInput,
  type SkillInstaller,
} from "../skill-install/installer.ts";

type PayloadManifest = {
  readonly schema_version: "1.0";
  readonly artifact_type: "sdd_yo_skill_payload_manifest";
  readonly package: { readonly name: string; readonly version: string };
  readonly skill: { readonly name: string; readonly protocol_version: string; readonly compatible_major: number };
  readonly files: readonly { readonly path: string; readonly sha256: `sha256:${string}` }[];
};

type InstallationBinding = {
  readonly schema_version: "1.0";
  readonly artifact_type: "sdd_yo_skill_installation";
  readonly package: CliCompatibilityIdentity["package"];
  readonly cli: CliCompatibilityIdentity["cli"] & { readonly path: string };
  readonly json_schema: CliCompatibilityIdentity["json_schema"];
  readonly skill: CliCompatibilityIdentity["skill"] & { readonly payload_fingerprint: `sha256:${string}` };
};

type VerifiedPackage = {
  readonly packageRoot: string;
  readonly skillSource: string;
  readonly cliRelativePath: string;
  readonly manifest: PayloadManifest;
  readonly payloadFiles: readonly string[];
  readonly payloadFingerprint: `sha256:${string}`;
};

type VerifiedInstallation = {
  readonly binding: InstallationBinding;
  readonly ownedPaths: readonly string[];
  readonly payloadFingerprint: `sha256:${string}`;
  readonly stateFingerprint: `sha256:${string}`;
};

export type NodeSkillInstallerHooks = {
  readonly beforeUpdatePublish?: () => void | Promise<void>;
  readonly beforeRemovePublish?: () => void | Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

function portable(path: string): string {
  return path.split(sep).join("/");
}

function contained(root: string, path: string): boolean {
  const fromRoot = relative(root, path);
  return fromRoot === "" || (!isAbsolute(fromRoot) && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`));
}

function hash(bytes: Uint8Array | string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function isMissing(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

async function metadata(path: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

async function gitRoot(root: string): Promise<string> {
  return await new Promise((resolveResult, reject) => {
    const child = spawn("git", ["-C", root, "rev-parse", "--show-toplevel"], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let standardOutput = "";
    let standardError = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      standardOutput += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      standardError += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code !== 0 || signal !== null)
        reject(new Error(standardError.trim() || "The selected root is not a Git repository."));
      else resolveResult(standardOutput.trim());
    });
  });
}

function parsePayloadManifest(bytes: Uint8Array): PayloadManifest {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill manifest is invalid.");
  }
  if (
    !isRecord(value) ||
    !exactKeys(value, ["schema_version", "artifact_type", "package", "skill", "files"]) ||
    value["schema_version"] !== "1.0" ||
    value["artifact_type"] !== "sdd_yo_skill_payload_manifest" ||
    !isRecord(value["package"]) ||
    !exactKeys(value["package"], ["name", "version"]) ||
    typeof value["package"]["name"] !== "string" ||
    typeof value["package"]["version"] !== "string" ||
    !isRecord(value["skill"]) ||
    !exactKeys(value["skill"], ["name", "protocol_version", "compatible_major"]) ||
    typeof value["skill"]["name"] !== "string" ||
    typeof value["skill"]["protocol_version"] !== "string" ||
    !Number.isInteger(value["skill"]["compatible_major"]) ||
    !Array.isArray(value["files"]) ||
    value["files"].length === 0 ||
    value["files"].some(
      (entry) =>
        !isRecord(entry) ||
        !exactKeys(entry, ["path", "sha256"]) ||
        typeof entry["path"] !== "string" ||
        typeof entry["sha256"] !== "string" ||
        !/^sha256:[0-9a-f]{64}$/u.test(entry["sha256"]),
    )
  )
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill manifest is invalid.");
  return value as PayloadManifest;
}

function parseInstallationBinding(bytes: Uint8Array): InstallationBinding {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill installation binding is invalid.",
    );
  }
  if (
    !isRecord(value) ||
    !exactKeys(value, ["schema_version", "artifact_type", "package", "cli", "json_schema", "skill"]) ||
    value["schema_version"] !== "1.0" ||
    value["artifact_type"] !== "sdd_yo_skill_installation" ||
    !isRecord(value["package"]) ||
    !exactKeys(value["package"], ["name", "version"]) ||
    typeof value["package"]["name"] !== "string" ||
    typeof value["package"]["version"] !== "string" ||
    !isRecord(value["cli"]) ||
    !exactKeys(value["cli"], ["name", "version", "path"]) ||
    typeof value["cli"]["name"] !== "string" ||
    typeof value["cli"]["version"] !== "string" ||
    typeof value["cli"]["path"] !== "string" ||
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
    !/^sha256:[0-9a-f]{64}$/u.test(value["skill"]["payload_fingerprint"])
  )
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill installation binding is invalid.",
    );
  const binding = value as InstallationBinding;
  if (`${JSON.stringify(binding, null, 2)}\n` !== new TextDecoder().decode(bytes))
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill installation binding bytes are stale.",
    );
  return binding;
}

function validatePayloadInventory(manifest: PayloadManifest, actualFiles: readonly string[]): void {
  const declaredFiles = manifest.files.map((entry) => entry.path);
  if (
    declaredFiles.length !== actualFiles.length ||
    new Set(declaredFiles).size !== declaredFiles.length ||
    declaredFiles.some(
      (path, index) =>
        path !== actualFiles[index] ||
        path === "" ||
        path.includes("\\") ||
        path.split("/").some((segment) => segment === "" || segment === "." || segment === ".."),
    )
  )
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill inventory is incomplete.");
}

function expectedDirectories(files: readonly string[]): readonly string[] {
  const directories = new Set<string>();
  for (const file of files) {
    const segments = file.split("/");
    for (let index = 1; index < segments.length; index += 1) directories.add(segments.slice(0, index).join("/"));
  }
  return [...directories].sort();
}

async function verifyDirectory(path: string, repositoryRoot: string): Promise<void> {
  const value = await metadata(path);
  if (value === undefined) return;
  if (!value.isDirectory() || value.isSymbolicLink())
    throw new SkillInstallationError("SDD_SKILL_INSTALL_TARGET_UNSAFE", "The Skill destination chain is unsafe.");
  const resolved = await realpath(path);
  if (!contained(repositoryRoot, resolved))
    throw new SkillInstallationError(
      "SDD_SKILL_INSTALL_TARGET_UNSAFE",
      "The Skill destination escapes the repository.",
    );
}

async function resolveRepositoryRoot(input: SkillInstallationInput): Promise<string> {
  const selectedRoot = resolve(input.repositoryRoot);
  const rootMetadata = await metadata(selectedRoot);
  if (rootMetadata === undefined || !rootMetadata.isDirectory() || rootMetadata.isSymbolicLink())
    throw new SkillInstallationError(
      "SDD_SKILL_INSTALL_ROOT_INVALID",
      "The selected Skill installation root is not an existing directory.",
    );
  const repositoryRoot = await realpath(selectedRoot);
  let discoveredGitRoot: string;
  try {
    discoveredGitRoot = await realpath(await gitRoot(repositoryRoot));
  } catch {
    throw new SkillInstallationError(
      "SDD_SKILL_INSTALL_ROOT_INVALID",
      "The selected Skill installation root is not a Git repository root.",
    );
  }
  if (discoveredGitRoot !== repositoryRoot)
    throw new SkillInstallationError(
      "SDD_SKILL_INSTALL_ROOT_INVALID",
      "The selected Skill installation root is not the Git repository root.",
    );
  return repositoryRoot;
}

async function verifyPackagedSkill(input: SkillInstallationInput, repositoryRoot: string): Promise<VerifiedPackage> {
  let packageRoot: string;
  let skillSource: string;
  let cliPath: string;
  try {
    packageRoot = await realpath(resolve(input.packageRoot));
    skillSource = await realpath(join(packageRoot, "skills", "sdd-yo"));
    cliPath = await realpath(resolve(input.cliPath));
  } catch {
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill or CLI is missing.");
  }
  if (!contained(packageRoot, skillSource) || !contained(packageRoot, cliPath) || !(await stat(cliPath)).isFile())
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill or CLI path is unsafe.");
  const manifestPath = join(skillSource, "payload-manifest.json");
  let manifest: PayloadManifest;
  try {
    manifest = parsePayloadManifest(await readFile(manifestPath));
  } catch (error) {
    if (error instanceof SkillInstallationError) throw error;
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill manifest is missing.");
  }
  if (
    manifest.package.name !== input.compatibility.package.name ||
    manifest.package.version !== input.compatibility.package.version ||
    manifest.skill.name !== input.compatibility.skill.name ||
    manifest.skill.protocol_version !== input.compatibility.skill.protocol_version ||
    manifest.skill.compatible_major !== input.compatibility.skill.compatible_major
  )
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INCOMPATIBLE", "The packaged Skill identity is incompatible.");

  const sourceEntries = await readdir(skillSource, { recursive: true, withFileTypes: true });
  if (sourceEntries.some((entry) => entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())))
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill contains an unsafe entry.");
  const payloadFiles = sourceEntries
    .filter((entry) => entry.isFile())
    .map((entry) => portable(relative(skillSource, join(entry.parentPath, entry.name))))
    .filter((path) => path !== "payload-manifest.json")
    .sort();
  validatePayloadInventory(manifest, payloadFiles);
  const actualDirectories = sourceEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => portable(relative(skillSource, join(entry.parentPath, entry.name))))
    .sort();
  if (
    JSON.stringify(actualDirectories) !==
    JSON.stringify(expectedDirectories([...payloadFiles, "payload-manifest.json"]))
  )
    throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill directory inventory is stale.");
  for (const entry of manifest.files) {
    if (hash(await readFile(join(skillSource, entry.path))) !== entry.sha256)
      throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "A packaged Skill file fingerprint is stale.");
  }
  const cliRelativePath = portable(relative(repositoryRoot, cliPath));
  if (!contained(repositoryRoot, cliPath) || cliRelativePath === "")
    throw new SkillInstallationError(
      "SDD_SKILL_PACKAGE_INVALID",
      "The packaged CLI is not contained by the selected repository.",
    );
  return {
    packageRoot,
    skillSource,
    cliRelativePath,
    manifest,
    payloadFiles,
    payloadFingerprint: hash(JSON.stringify({ canonicalization_version: "1", files: manifest.files })),
  };
}

function bindingFor(input: SkillInstallationInput, packaged: VerifiedPackage): InstallationBinding {
  return {
    schema_version: "1.0",
    artifact_type: "sdd_yo_skill_installation",
    package: input.compatibility.package,
    cli: { ...input.compatibility.cli, path: packaged.cliRelativePath },
    json_schema: input.compatibility.json_schema,
    skill: { ...input.compatibility.skill, payload_fingerprint: packaged.payloadFingerprint },
  };
}

async function writeInstallation(
  destination: string,
  packaged: VerifiedPackage,
  binding: InstallationBinding,
  createDestination = true,
): Promise<void> {
  if (createDestination) await mkdir(destination);
  for (const path of [...packaged.payloadFiles, "payload-manifest.json"]) {
    const source = join(packaged.skillSource, path);
    const target = join(destination, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    await chmod(target, (await stat(source)).mode);
  }
  await writeFile(join(destination, "installation.json"), `${JSON.stringify(binding, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function compatibleInstalledBinding(binding: InstallationBinding, current: CliCompatibilityIdentity): boolean {
  return (
    binding.package.name === current.package.name &&
    binding.cli.name === current.cli.name &&
    binding.json_schema.compatible_major === current.json_schema.compatible_major &&
    binding.skill.name === current.skill.name &&
    binding.skill.compatible_major === current.skill.compatible_major
  );
}

async function verifyInstalledSkill(
  destination: string,
  repositoryRoot: string,
  compatibility: CliCompatibilityIdentity,
): Promise<VerifiedInstallation> {
  const destinationMetadata = await metadata(destination);
  if (destinationMetadata === undefined)
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_INSTALLATION_MISSING",
      "The selected repository-scoped Skill installation does not exist.",
    );
  if (!destinationMetadata.isDirectory() || destinationMetadata.isSymbolicLink())
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_TARGET_UNSAFE",
      "The selected repository-scoped Skill installation is unsafe.",
    );
  const resolvedDestination = await realpath(destination);
  if (!contained(repositoryRoot, resolvedDestination))
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_TARGET_UNSAFE",
      "The selected repository-scoped Skill installation escapes the repository.",
    );

  const entries = await readdir(destination, { recursive: true, withFileTypes: true });
  if (entries.some((entry) => entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())))
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill installation contains an unsafe entry.",
    );
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => portable(relative(destination, join(entry.parentPath, entry.name))))
    .sort();
  let manifest: PayloadManifest;
  let bindingBytes: Uint8Array;
  try {
    manifest = parsePayloadManifest(await readFile(join(destination, "payload-manifest.json")));
    bindingBytes = await readFile(join(destination, "installation.json"));
  } catch (error) {
    if (error instanceof SkillInstallationError) {
      throw new SkillInstallationError("SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID", error.message);
    }
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill ownership files are missing.",
    );
  }
  const payloadFiles = files.filter((path) => path !== "payload-manifest.json" && path !== "installation.json");
  try {
    validatePayloadInventory(manifest, payloadFiles);
  } catch {
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill file inventory is stale.",
    );
  }
  const expectedFiles = [...payloadFiles, "installation.json", "payload-manifest.json"].sort();
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles))
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill contains undeclared files.",
    );
  const actualDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => portable(relative(destination, join(entry.parentPath, entry.name))))
    .sort();
  if (JSON.stringify(actualDirectories) !== JSON.stringify(expectedDirectories(files)))
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
      "The repository-scoped Skill contains undeclared directories.",
    );
  for (const entry of manifest.files) {
    if (hash(await readFile(join(destination, entry.path))) !== entry.sha256)
      throw new SkillInstallationError(
        "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
        "A repository-scoped Skill file fingerprint is stale.",
      );
  }
  const payloadFingerprint = hash(JSON.stringify({ canonicalization_version: "1", files: manifest.files }));
  const binding = parseInstallationBinding(bindingBytes);
  if (
    binding.package.name !== manifest.package.name ||
    binding.package.version !== manifest.package.version ||
    binding.skill.name !== manifest.skill.name ||
    binding.skill.protocol_version !== manifest.skill.protocol_version ||
    binding.skill.compatible_major !== manifest.skill.compatible_major ||
    binding.skill.payload_fingerprint !== payloadFingerprint ||
    !compatibleInstalledBinding(binding, compatibility) ||
    binding.cli.path === "" ||
    binding.cli.path.includes("\\") ||
    binding.cli.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
    isAbsolute(binding.cli.path)
  )
    throw new SkillInstallationError(
      "SDD_SKILL_LIFECYCLE_INSTALLATION_INCOMPATIBLE",
      "The repository-scoped Skill installation identity is incompatible or stale.",
    );
  const ownedPaths = files.map((path) => `${SKILL_INSTALLATION_DESTINATION}/${path}`).sort();
  const stateEntries = [];
  for (const path of files) stateEntries.push({ path, sha256: hash(await readFile(join(destination, path))) });
  return {
    binding,
    ownedPaths,
    payloadFingerprint,
    stateFingerprint: hash(JSON.stringify({ canonicalization_version: "1", files: stateEntries })),
  };
}

async function paths(repositoryRoot: string): Promise<{
  readonly agentsRoot: string;
  readonly skillsRoot: string;
  readonly destination: string;
  readonly next: string;
  readonly previous: string;
}> {
  const agentsRoot = join(repositoryRoot, ".agents");
  const skillsRoot = join(agentsRoot, "skills");
  await verifyDirectory(agentsRoot, repositoryRoot);
  await verifyDirectory(skillsRoot, repositoryRoot);
  return {
    agentsRoot,
    skillsRoot,
    destination: join(skillsRoot, "sdd-yo"),
    next: join(skillsRoot, ".sdd-yo.lifecycle-next"),
    previous: join(skillsRoot, ".sdd-yo.lifecycle-previous"),
  };
}

async function reconcileLifecycleState(
  repositoryRoot: string,
  compatibility: CliCompatibilityIdentity,
  lifecyclePaths: Awaited<ReturnType<typeof paths>>,
): Promise<void> {
  const destinationExists = (await metadata(lifecyclePaths.destination)) !== undefined;
  const previousExists = (await metadata(lifecyclePaths.previous)) !== undefined;
  if (!destinationExists && previousExists) {
    await verifyInstalledSkill(lifecyclePaths.previous, repositoryRoot, compatibility);
    await rename(lifecyclePaths.previous, lifecyclePaths.destination);
  }
  if ((await metadata(lifecyclePaths.next)) !== undefined) {
    await verifyInstalledSkill(lifecyclePaths.next, repositoryRoot, compatibility);
    await rm(lifecyclePaths.next, { recursive: true });
  }
  if (
    (await metadata(lifecyclePaths.destination)) !== undefined &&
    (await metadata(lifecyclePaths.previous)) !== undefined
  ) {
    await verifyInstalledSkill(lifecyclePaths.previous, repositoryRoot, compatibility);
    await rm(lifecyclePaths.previous, { recursive: true });
  }
}

async function replacementStateFingerprint(
  packaged: VerifiedPackage,
  binding: InstallationBinding,
): Promise<`sha256:${string}`> {
  const files: { path: string; sha256: `sha256:${string}` }[] = [];
  for (const path of [...packaged.payloadFiles, "payload-manifest.json"].sort())
    files.push({ path, sha256: hash(await readFile(join(packaged.skillSource, path))) });
  files.push({ path: "installation.json", sha256: hash(`${JSON.stringify(binding, null, 2)}\n`) });
  return hash(
    JSON.stringify({
      canonicalization_version: "1",
      files: files.toSorted((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
    }),
  );
}

function sameReplacement(
  installed: VerifiedInstallation,
  binding: InstallationBinding,
  stateFingerprint: `sha256:${string}`,
): boolean {
  return (
    JSON.stringify(installed.binding) === JSON.stringify(binding) && installed.stateFingerprint === stateFingerprint
  );
}

export function createNodeSkillInstaller(hooks: NodeSkillInstallerHooks = {}): SkillInstaller {
  return {
    async install(input) {
      const repositoryRoot = await resolveRepositoryRoot(input);
      const packaged = await verifyPackagedSkill(input, repositoryRoot);
      const lifecyclePaths = await paths(repositoryRoot);
      if ((await metadata(lifecyclePaths.destination)) !== undefined)
        throw new SkillInstallationError(
          "SDD_SKILL_INSTALL_DESTINATION_EXISTS",
          "The repository-scoped sdd-yo Skill destination already exists.",
        );
      const createdParents: string[] = [];
      let createdDestination = false;
      try {
        if ((await metadata(lifecyclePaths.agentsRoot)) === undefined) {
          await mkdir(lifecyclePaths.agentsRoot);
          createdParents.push(lifecyclePaths.agentsRoot);
        }
        if ((await metadata(lifecyclePaths.skillsRoot)) === undefined) {
          await mkdir(lifecyclePaths.skillsRoot);
          createdParents.push(lifecyclePaths.skillsRoot);
        }
        await mkdir(lifecyclePaths.destination);
        createdDestination = true;
        await writeInstallation(lifecyclePaths.destination, packaged, bindingFor(input, packaged), false);
        const installed = await verifyInstalledSkill(lifecyclePaths.destination, repositoryRoot, input.compatibility);
        return {
          destination: SKILL_INSTALLATION_DESTINATION,
          installed_paths: installed.ownedPaths,
          payload_fingerprint: installed.payloadFingerprint,
          compatibility: input.compatibility,
        };
      } catch (error) {
        if (createdDestination) await rm(lifecyclePaths.destination, { recursive: true, force: true });
        for (const path of createdParents.reverse()) {
          try {
            await rmdir(path);
          } catch {
            // Preserve pre-existing or concurrently populated parent directories.
          }
        }
        if (error instanceof SkillInstallationError) throw error;
        throw new SkillInstallationError(
          "SDD_SKILL_INSTALL_FAILED",
          error instanceof Error ? error.message : "The repository-scoped Skill installation failed.",
        );
      }
    },

    async update(input) {
      const repositoryRoot = await resolveRepositoryRoot(input);
      const lifecyclePaths = await paths(repositoryRoot);
      await reconcileLifecycleState(repositoryRoot, input.compatibility, lifecyclePaths);
      const installed = await verifyInstalledSkill(lifecyclePaths.destination, repositoryRoot, input.compatibility);
      const packaged = await verifyPackagedSkill(input, repositoryRoot);
      const replacementBinding = bindingFor(input, packaged);
      const replacementState = await replacementStateFingerprint(packaged, replacementBinding);
      if (sameReplacement(installed, replacementBinding, replacementState))
        return {
          outcome: "unchanged",
          destination: SKILL_INSTALLATION_DESTINATION,
          owned_paths: installed.ownedPaths,
          payload_fingerprint: installed.payloadFingerprint,
          compatibility: input.compatibility,
        };

      let oldMoved = false;
      let replacementPublished = false;
      try {
        await writeInstallation(lifecyclePaths.next, packaged, replacementBinding);
        const staged = await verifyInstalledSkill(lifecyclePaths.next, repositoryRoot, input.compatibility);
        if (!sameReplacement(staged, replacementBinding, replacementState))
          throw new SkillInstallationError(
            "SDD_SKILL_LIFECYCLE_OWNERSHIP_INVALID",
            "The staged Skill replacement does not match its binding.",
          );
        const rechecked = await verifyInstalledSkill(lifecyclePaths.destination, repositoryRoot, input.compatibility);
        if (rechecked.stateFingerprint !== installed.stateFingerprint)
          throw new SkillInstallationError(
            "SDD_SKILL_LIFECYCLE_STATE_CHANGED",
            "The repository-scoped Skill installation changed during update.",
          );
        await hooks.beforeUpdatePublish?.();
        const publishCheck = await verifyInstalledSkill(
          lifecyclePaths.destination,
          repositoryRoot,
          input.compatibility,
        );
        if (publishCheck.stateFingerprint !== installed.stateFingerprint)
          throw new SkillInstallationError(
            "SDD_SKILL_LIFECYCLE_STATE_CHANGED",
            "The repository-scoped Skill installation changed before update publication.",
          );
        await rename(lifecyclePaths.destination, lifecyclePaths.previous);
        oldMoved = true;
        try {
          await rename(lifecyclePaths.next, lifecyclePaths.destination);
          replacementPublished = true;
        } catch (error) {
          await rename(lifecyclePaths.previous, lifecyclePaths.destination);
          oldMoved = false;
          throw error;
        }
        await rm(lifecyclePaths.previous, { recursive: true }).catch(() => undefined);
        const updated = await verifyInstalledSkill(lifecyclePaths.destination, repositoryRoot, input.compatibility);
        return {
          outcome: "updated",
          destination: SKILL_INSTALLATION_DESTINATION,
          owned_paths: updated.ownedPaths,
          payload_fingerprint: updated.payloadFingerprint,
          compatibility: input.compatibility,
        };
      } catch (error) {
        if (oldMoved && !replacementPublished && (await metadata(lifecyclePaths.destination)) === undefined)
          await rename(lifecyclePaths.previous, lifecyclePaths.destination).catch(() => undefined);
        if ((await metadata(lifecyclePaths.next)) !== undefined)
          await rm(lifecyclePaths.next, { recursive: true, force: true }).catch(() => undefined);
        if (error instanceof SkillInstallationError) throw error;
        throw new SkillInstallationError(
          "SDD_SKILL_UPDATE_FAILED",
          error instanceof Error ? error.message : "The repository-scoped Skill update failed.",
        );
      }
    },

    async remove(input) {
      const repositoryRoot = await resolveRepositoryRoot(input);
      const lifecyclePaths = await paths(repositoryRoot);
      await reconcileLifecycleState(repositoryRoot, input.compatibility, lifecyclePaths);
      const installed = await verifyInstalledSkill(lifecyclePaths.destination, repositoryRoot, input.compatibility);
      const rechecked = await verifyInstalledSkill(lifecyclePaths.destination, repositoryRoot, input.compatibility);
      if (rechecked.stateFingerprint !== installed.stateFingerprint)
        throw new SkillInstallationError(
          "SDD_SKILL_LIFECYCLE_STATE_CHANGED",
          "The repository-scoped Skill installation changed during removal.",
        );
      try {
        await hooks.beforeRemovePublish?.();
        const publishCheck = await verifyInstalledSkill(
          lifecyclePaths.destination,
          repositoryRoot,
          input.compatibility,
        );
        if (publishCheck.stateFingerprint !== installed.stateFingerprint)
          throw new SkillInstallationError(
            "SDD_SKILL_LIFECYCLE_STATE_CHANGED",
            "The repository-scoped Skill installation changed before removal.",
          );
        await rename(lifecyclePaths.destination, lifecyclePaths.previous);
      } catch (error) {
        if (error instanceof SkillInstallationError) throw error;
        throw new SkillInstallationError(
          "SDD_SKILL_REMOVE_FAILED",
          error instanceof Error ? error.message : "The repository-scoped Skill removal failed.",
        );
      }
      await rm(lifecyclePaths.previous, { recursive: true }).catch(() => undefined);
      return {
        destination: SKILL_INSTALLATION_DESTINATION,
        removed_paths: installed.ownedPaths,
      };
    },
  };
}

export const nodeSkillInstaller = createNodeSkillInstaller();
