import { createHash } from "node:crypto";

import { isFingerprint, isObjectId } from "../contracts/identifiers.ts";
import type { Fingerprint, ObjectId } from "../contracts/identifiers.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import { fingerprintValidatedObject } from "./object-fingerprint.ts";
import type { FingerprintClass } from "./object-fingerprint.ts";

export type DeltaObjectType = "capability" | "requirement" | "concept";
export type ObjectDeltaEntry =
  | {
      readonly operation: "add";
      readonly type: DeltaObjectType;
      readonly id: ObjectId;
      readonly after: Fingerprint;
    }
  | {
      readonly operation: "modify";
      readonly type: DeltaObjectType;
      readonly id: ObjectId;
      readonly before: Fingerprint;
      readonly after: Fingerprint;
    }
  | {
      readonly operation: "delete";
      readonly type: DeltaObjectType;
      readonly id: ObjectId;
      readonly before: Fingerprint;
    };

export type CanonicalObjectDelta = {
  readonly entries: readonly ObjectDeltaEntry[];
  readonly canonicalBytes: Uint8Array;
  readonly fingerprint: Fingerprint;
};

export type GraphObjectDelta = {
  readonly semantic: CanonicalObjectDelta;
  readonly structural: CanonicalObjectDelta;
};

function objectType(id: ObjectId): DeltaObjectType {
  if (id.startsWith("CAP-")) return "capability";
  if (id.startsWith("REQ-")) return "requirement";
  return "concept";
}

function canonicalEntry(value: ObjectDeltaEntry): ObjectDeltaEntry {
  if (!isObjectId(value.id) || objectType(value.id) !== value.type) {
    throw new Error("Object delta entry identity is invalid.");
  }
  if (value.operation === "add") {
    if (!isFingerprint(value.after) || "before" in value) throw new Error("Object delta add entry is invalid.");
    return { operation: "add", type: value.type, id: value.id, after: value.after };
  }
  if (value.operation === "delete") {
    if (!isFingerprint(value.before) || "after" in value) throw new Error("Object delta delete entry is invalid.");
    return { operation: "delete", type: value.type, id: value.id, before: value.before };
  }
  if (value.operation !== "modify") throw new Error("Object delta operation is invalid.");
  if (!isFingerprint(value.before) || !isFingerprint(value.after)) {
    throw new Error("Object delta modify entry is invalid.");
  }
  if (value.before === value.after) throw new Error("Object delta modify entry does not change its fingerprint.");
  return { operation: "modify", type: value.type, id: value.id, before: value.before, after: value.after };
}

function compareEntries(left: ObjectDeltaEntry, right: ObjectDeltaEntry): number {
  for (const [leftValue, rightValue] of [
    [left.type.normalize("NFC"), right.type.normalize("NFC")],
    [left.id.normalize("NFC"), right.id.normalize("NFC")],
    [left.operation.normalize("NFC"), right.operation.normalize("NFC")],
  ] as const) {
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
  }
  return 0;
}

export function canonicalizeObjectDelta(entriesInput: readonly ObjectDeltaEntry[]): CanonicalObjectDelta {
  const entries = entriesInput.map(canonicalEntry).toSorted(compareEntries);
  const identities = new Set<string>();
  for (const entry of entries) {
    const identity = `${entry.type}\0${entry.id}`;
    if (identities.has(identity)) throw new Error("Object delta contains a duplicate object identity.");
    identities.add(identity);
  }
  const canonicalBytes = new TextEncoder().encode(JSON.stringify(entries));
  const fingerprintValue: unknown = `sha256:${createHash("sha256").update(canonicalBytes).digest("hex")}`;
  if (!isFingerprint(fingerprintValue)) throw new Error("Object delta fingerprint generation failed.");
  return { entries, canonicalBytes, fingerprint: fingerprintValue };
}

function applicable(graph: ValidatedSpecificationGraph, id: ObjectId, fingerprintClass: FingerprintClass): boolean {
  const object = graph.objects.get(id);
  if (object === undefined) return false;
  return fingerprintClass === "structural" || "anchor" in object || object.type === "concept";
}

function computeClassDelta(
  before: ValidatedSpecificationGraph,
  after: ValidatedSpecificationGraph,
  fingerprintClass: FingerprintClass,
): CanonicalObjectDelta {
  const entries: ObjectDeltaEntry[] = [];
  const ids = new Set<ObjectId>([...before.objects.keys(), ...after.objects.keys()]);
  for (const id of ids) {
    const beforeApplicable = applicable(before, id, fingerprintClass);
    const afterApplicable = applicable(after, id, fingerprintClass);
    const type = objectType(id);
    if (!beforeApplicable && afterApplicable) {
      entries.push({ operation: "add", type, id, after: fingerprintValidatedObject(after, id, fingerprintClass) });
    } else if (beforeApplicable && !afterApplicable) {
      entries.push({ operation: "delete", type, id, before: fingerprintValidatedObject(before, id, fingerprintClass) });
    } else if (beforeApplicable && afterApplicable) {
      const beforeFingerprint = fingerprintValidatedObject(before, id, fingerprintClass);
      const afterFingerprint = fingerprintValidatedObject(after, id, fingerprintClass);
      if (beforeFingerprint !== afterFingerprint) {
        entries.push({ operation: "modify", type, id, before: beforeFingerprint, after: afterFingerprint });
      }
    }
  }
  return canonicalizeObjectDelta(entries);
}

export function computeGraphObjectDelta(
  before: ValidatedSpecificationGraph,
  after: ValidatedSpecificationGraph,
): GraphObjectDelta {
  return {
    semantic: computeClassDelta(before, after, "semantic"),
    structural: computeClassDelta(before, after, "structural"),
  };
}
