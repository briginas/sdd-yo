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
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  SKILL_INSTALLATION_DESTINATION,
  SkillInstallationError,
  type SkillInstaller,
} from "../skill-install/installer.ts";

type PayloadManifest = {
  readonly schema_version: "1.0";
  readonly artifact_type: "sdd_yo_skill_payload_manifest";
  readonly package: { readonly name: string; readonly version: string };
  readonly skill: { readonly name: string; readonly protocol_version: string; readonly compatible_major: number };
  readonly files: readonly { readonly path: string; readonly sha256: `sha256:${string}` }[];
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

export const nodeSkillInstaller: SkillInstaller = {
  async install(input) {
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
      manifest.package?.name !== input.compatibility.package.name ||
      manifest.package?.version !== input.compatibility.package.version ||
      manifest.skill?.name !== input.compatibility.skill.name ||
      manifest.skill?.protocol_version !== input.compatibility.skill.protocol_version ||
      manifest.skill?.compatible_major !== input.compatibility.skill.compatible_major ||
      !Array.isArray(manifest.files) ||
      manifest.files.length === 0
    )
      throw new SkillInstallationError(
        "SDD_SKILL_PACKAGE_INCOMPATIBLE",
        "The packaged Skill identity is incompatible.",
      );

    const sourceEntries = await readdir(skillSource, { recursive: true, withFileTypes: true });
    const actualFiles = sourceEntries
      .filter((entry) => entry.isFile())
      .map((entry) => portable(relative(skillSource, join(entry.parentPath, entry.name))))
      .filter((path) => path !== "payload-manifest.json")
      .sort();
    if (sourceEntries.some((entry) => entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())))
      throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill contains an unsafe entry.");
    const declaredFiles = manifest.files.map((entry) => entry.path);
    if (
      new Set(declaredFiles).size !== declaredFiles.length ||
      declaredFiles.some(
        (path, index) =>
          path !== actualFiles[index] ||
          path === "" ||
          path.includes("\\") ||
          path.split("/").some((segment: string) => segment === "" || segment === "." || segment === ".."),
      )
    )
      throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "The packaged Skill inventory is incomplete.");
    for (const entry of manifest.files) {
      if (hash(await readFile(join(skillSource, entry.path))) !== entry.sha256)
        throw new SkillInstallationError("SDD_SKILL_PACKAGE_INVALID", "A packaged Skill file fingerprint is stale.");
    }
    const payloadFingerprint = hash(JSON.stringify({ canonicalization_version: "1", files: manifest.files }));

    const agentsRoot = join(repositoryRoot, ".agents");
    const skillsRoot = join(agentsRoot, "skills");
    const destination = join(skillsRoot, "sdd-yo");
    await verifyDirectory(agentsRoot, repositoryRoot);
    await verifyDirectory(skillsRoot, repositoryRoot);
    if ((await metadata(destination)) !== undefined)
      throw new SkillInstallationError(
        "SDD_SKILL_INSTALL_DESTINATION_EXISTS",
        "The repository-scoped sdd-yo Skill destination already exists.",
      );
    const cliRelativePath = portable(relative(repositoryRoot, cliPath));
    if (!contained(repositoryRoot, cliPath) || cliRelativePath === "")
      throw new SkillInstallationError(
        "SDD_SKILL_PACKAGE_INVALID",
        "The packaged CLI is not contained by the selected repository.",
      );

    const createdParents: string[] = [];
    let createdDestination = false;
    try {
      if ((await metadata(agentsRoot)) === undefined) {
        await mkdir(agentsRoot);
        createdParents.push(agentsRoot);
      }
      if ((await metadata(skillsRoot)) === undefined) {
        await mkdir(skillsRoot);
        createdParents.push(skillsRoot);
      }
      await mkdir(destination);
      createdDestination = true;
      for (const path of [...actualFiles, "payload-manifest.json"]) {
        const source = join(skillSource, path);
        const target = join(destination, path);
        await mkdir(dirname(target), { recursive: true });
        await copyFile(source, target);
        await chmod(target, (await stat(source)).mode);
      }
      const binding = {
        schema_version: "1.0",
        artifact_type: "sdd_yo_skill_installation",
        package: input.compatibility.package,
        cli: { ...input.compatibility.cli, path: cliRelativePath },
        json_schema: input.compatibility.json_schema,
        skill: { ...input.compatibility.skill, payload_fingerprint: payloadFingerprint },
      };
      await writeFile(join(destination, "installation.json"), `${JSON.stringify(binding, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      const installedPaths = [...actualFiles, "payload-manifest.json", "installation.json"].map(
        (path) => `${SKILL_INSTALLATION_DESTINATION}/${path}`,
      );
      return {
        destination: SKILL_INSTALLATION_DESTINATION,
        installed_paths: installedPaths.sort(),
        payload_fingerprint: payloadFingerprint,
        compatibility: input.compatibility,
      };
    } catch (error) {
      if (createdDestination) await rm(destination, { recursive: true, force: true });
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
};
