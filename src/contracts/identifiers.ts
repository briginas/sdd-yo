declare const opaqueValue: unique symbol;

type OpaqueString<Name extends string> = string & {
  readonly [opaqueValue]: Name;
};

export type ProjectId = OpaqueString<"ProjectId">;
export type CapabilityId = OpaqueString<"CapabilityId">;
export type RequirementId = OpaqueString<"RequirementId">;
export type ConceptId = OpaqueString<"ConceptId">;
export type ObjectId = CapabilityId | RequirementId | ConceptId;
export type FindingId = OpaqueString<"FindingId">;
export type Fingerprint = OpaqueString<"Fingerprint">;
export type GitObjectId = OpaqueString<"GitObjectId">;
export type ProjectPath = OpaqueString<"ProjectPath">;

const projectIdPattern = /^SDD-[0-9A-F]{8}$/u;
const capabilityIdPattern = /^CAP-[0-9A-F]{8}$/u;
const requirementIdPattern = /^REQ-[0-9A-F]{8}$/u;
const conceptIdPattern = /^CON-[0-9A-F]{8}$/u;
const findingIdPattern = /^FND-[0-9A-F]{12}$/u;
const fingerprintPattern = /^sha256:[0-9a-f]{64}$/u;

function matches(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

export function isProjectId(value: unknown): value is ProjectId {
  return matches(value, projectIdPattern);
}

export function isCapabilityId(value: unknown): value is CapabilityId {
  return matches(value, capabilityIdPattern);
}

export function isRequirementId(value: unknown): value is RequirementId {
  return matches(value, requirementIdPattern);
}

export function isConceptId(value: unknown): value is ConceptId {
  return matches(value, conceptIdPattern);
}

export function isObjectId(value: unknown): value is ObjectId {
  return isCapabilityId(value) || isRequirementId(value) || isConceptId(value);
}

export function isFindingId(value: unknown): value is FindingId {
  return matches(value, findingIdPattern);
}

export function isFingerprint(value: unknown): value is Fingerprint {
  return matches(value, fingerprintPattern);
}

export function isGitObjectId(value: unknown): value is GitObjectId {
  return typeof value === "string" && value.length > 0;
}
