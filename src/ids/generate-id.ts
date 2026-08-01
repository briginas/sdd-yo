import type { ObjectId, ProjectId } from "../contracts/identifiers.ts";
import type { Randomness } from "../platform/randomness.ts";

export const ID_KINDS = ["project", "capability", "requirement", "concept"] as const;
export type IdKind = (typeof ID_KINDS)[number];
export type GeneratedId = ProjectId | ObjectId;

export const MAX_GENERATED_ID_COUNT = 256;

const prefixes = {
  project: "SDD",
  capability: "CAP",
  requirement: "REQ",
  concept: "CON",
} as const satisfies Readonly<Record<IdKind, string>>;

export function isIdKind(value: unknown): value is IdKind {
  return typeof value === "string" && ID_KINDS.some((kind) => kind === value);
}

export function generateRandomId(kind: IdKind, randomness: Randomness): GeneratedId {
  const bytes = randomness.randomBytes(4);
  if (bytes.length !== 4) throw new Error("The randomness boundary returned an invalid byte count.");
  const suffix = [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${prefixes[kind]}-${suffix}` as GeneratedId;
}

export function generateRandomIds(
  kind: IdKind,
  count: number,
  randomness: Randomness,
  forbidden: ReadonlySet<GeneratedId> = new Set(),
): readonly GeneratedId[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_GENERATED_ID_COUNT) {
    throw new RangeError(`ID count must be between 1 and ${MAX_GENERATED_ID_COUNT}.`);
  }

  const values = new Set<GeneratedId>();
  const maximumAttempts = count * 32;
  for (let attempts = 0; values.size < count && attempts < maximumAttempts; attempts += 1) {
    const candidate = generateRandomId(kind, randomness);
    if (!forbidden.has(candidate)) values.add(candidate);
  }
  if (values.size !== count) throw new Error("Unique random ID generation exhausted its retry budget.");
  return [...values];
}
