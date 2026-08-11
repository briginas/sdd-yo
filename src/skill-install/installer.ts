import type { CliCompatibilityIdentity } from "../cli/identity.ts";

export const SKILL_INSTALLATION_DESTINATION = ".agents/skills/sdd-yo" as const;

export type SkillInstallationResult = {
  readonly destination: typeof SKILL_INSTALLATION_DESTINATION;
  readonly installed_paths: readonly string[];
  readonly payload_fingerprint: `sha256:${string}`;
  readonly compatibility: CliCompatibilityIdentity;
};

export type SkillUpdateResult = {
  readonly outcome: "updated" | "unchanged";
  readonly destination: typeof SKILL_INSTALLATION_DESTINATION;
  readonly owned_paths: readonly string[];
  readonly payload_fingerprint: `sha256:${string}`;
  readonly compatibility: CliCompatibilityIdentity;
};

export type SkillRemovalResult = {
  readonly destination: typeof SKILL_INSTALLATION_DESTINATION;
  readonly removed_paths: readonly string[];
};

export type SkillInstallationInput = {
  readonly repositoryRoot: string;
  readonly packageRoot: string;
  readonly cliPath: string;
  readonly compatibility: CliCompatibilityIdentity;
};

export type SkillInstaller = {
  install(input: SkillInstallationInput): Promise<SkillInstallationResult>;
  update(input: SkillInstallationInput): Promise<SkillUpdateResult>;
  remove(input: SkillInstallationInput): Promise<SkillRemovalResult>;
};

export const USER_SKILL_INSTALLATION_DESTINATION = ".agents/skills/sdd-yo" as const;

export type UserSkillRoots = {
  readonly home: string;
  readonly applicationSupport: string;
  readonly platform: "darwin" | string;
};

export type UserSkillInstallationInput = {
  readonly packageRoot: string;
  readonly cliPath: string;
  readonly compatibility: CliCompatibilityIdentity;
  readonly roots: UserSkillRoots;
};

export type UserSkillInstallationResult = {
  readonly scope: "user";
  readonly skill_destination: string;
  readonly cli_destination: string;
  readonly owned_paths: readonly string[];
  readonly package_fingerprint: `sha256:${string}`;
  readonly payload_fingerprint: `sha256:${string}`;
  readonly compatibility: CliCompatibilityIdentity;
};

export type UserSkillUpdateResult = UserSkillInstallationResult & {
  readonly outcome: "updated" | "unchanged";
};

export type UserSkillRemovalResult = {
  readonly scope: "user";
  readonly skill_destination: string;
  readonly cli_destination: string;
  readonly removed_paths: readonly string[];
};

export type UserSkillInstaller = {
  install(input: UserSkillInstallationInput): Promise<UserSkillInstallationResult>;
  update(input: UserSkillInstallationInput): Promise<UserSkillUpdateResult>;
  remove(input: UserSkillInstallationInput): Promise<UserSkillRemovalResult>;
};

export class SkillInstallationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SkillInstallationError";
    this.code = code;
  }
}
