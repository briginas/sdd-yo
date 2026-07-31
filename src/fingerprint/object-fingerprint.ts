import { createHash } from "node:crypto";
import type { Fingerprint } from "../contracts/identifiers.ts";
import type { ObjectId } from "../contracts/identifiers.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import type {
  CapabilityDocument,
  CapabilityFragmentDocument,
  ConceptDocument,
  Requirement,
} from "../markdown/types.ts";

export type FingerprintClass = "semantic" | "structural";
export type FingerprintProjection = { readonly object: Record<string, unknown> };

function nfc(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(nfc);
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, nfc(item)]));
  return value;
}
function canonicalProse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalProse);
  if (typeof value !== "object" || value === null) return nfc(value);
  const node = value as Record<string, unknown>;
  if (typeof node.type !== "string") throw new Error("Expected prose AST node type.");
  if (Array.isArray(node.children)) {
    return { type: node.type.normalize("NFC"), children: node.children.map(canonicalProse) };
  }
  if (typeof node.value === "string") {
    return { type: node.type.normalize("NFC"), value: node.value.normalize("NFC") };
  }
  throw new Error("Expected prose AST node children or value.");
}
function strings(value: unknown): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
    throw new Error("Expected string array.");
  return [...value].map((item) => item.normalize("NFC")).sort();
}

export function canonicalObjectValue(
  projection: FingerprintProjection,
  fingerprintClass: FingerprintClass,
): Record<string, unknown> {
  const object = projection.object;
  const type = object.object_type;
  const id = object.object_id;
  if (typeof type !== "string" || typeof id !== "string") throw new Error("Object projection identity is invalid.");
  let canonicalValue: Record<string, unknown>;
  if (type === "requirement")
    canonicalValue =
      fingerprintClass === "semantic"
        ? {
            statement: canonicalProse(object.statement),
            acceptance: canonicalProse(object.acceptance),
            constraints: canonicalProse(object.constraints),
          }
        : {
            kind: object.kind,
            owner_capability_id: object.owner_capability_id,
            refers_to_ids: strings(object.refers_to_ids),
            depends_on_ids: strings(object.depends_on_ids),
          };
  else if (type === "concept")
    canonicalValue =
      fingerprintClass === "semantic"
        ? {
            definition: canonicalProse(object.definition),
            identity: canonicalProse(object.identity),
            states: canonicalProse(object.states),
          }
        : { relates_to_ids: strings(object.relates_to_ids) };
  else if (type === "capability" && fingerprintClass === "structural")
    canonicalValue = {
      requirement_ids: strings(object.requirement_ids),
      reachable_fragments: (object.reachable_fragments as readonly unknown[])
        .map((item) => strings(item))
        .sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0)),
    };
  else throw new Error(`Unsupported ${type} ${fingerprintClass} fingerprint.`);
  return {
    canonicalization_version: "1",
    object_type: type,
    object_id: id,
    fingerprint_class: fingerprintClass,
    canonical_value: canonicalValue,
  };
}
export function canonicalObjectBytes(
  projection: FingerprintProjection,
  fingerprintClass: FingerprintClass,
): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(canonicalObjectValue(projection, fingerprintClass)));
}
export function fingerprintObject(projection: FingerprintProjection, fingerprintClass: FingerprintClass): Fingerprint {
  return `sha256:${createHash("sha256").update(canonicalObjectBytes(projection, fingerprintClass)).digest("hex")}` as Fingerprint;
}

function requirementProjection(requirement: Requirement): FingerprintProjection {
  return {
    object: {
      object_type: "requirement",
      object_id: requirement.id,
      statement: requirement.statement_ast,
      acceptance: requirement.acceptance_ast,
      constraints: requirement.constraints_ast,
      kind: requirement.kind,
      owner_capability_id: requirement.owner,
      refers_to_ids: requirement.relations
        .filter((relation) => relation.type === "refers-to")
        .map((relation) => relation.target_id),
      depends_on_ids: requirement.relations
        .filter((relation) => relation.type === "depends-on")
        .map((relation) => relation.target_id),
    },
  };
}

function conceptProjection(concept: ConceptDocument): FingerprintProjection {
  return {
    object: {
      object_type: "concept",
      object_id: concept.id,
      definition: concept.definition_ast,
      identity: concept.identity_ast,
      states: concept.states_ast,
      relates_to_ids: concept.relations.map((relation) => relation.target_id),
    },
  };
}

function capabilityProjection(
  graph: ValidatedSpecificationGraph,
  capability: CapabilityDocument,
): FingerprintProjection {
  const fragments = [...graph.documents.values()].filter(
    (document): document is CapabilityFragmentDocument =>
      document.type === "capability-fragment" && document.capability === capability.id,
  );
  return {
    object: {
      object_type: "capability",
      object_id: capability.id,
      requirement_ids: [
        ...capability.requirements.map((requirement) => requirement.id),
        ...fragments.flatMap((fragment) => fragment.requirements.map((requirement) => requirement.id)),
      ],
      reachable_fragments: fragments.map((fragment) => fragment.requirements.map((requirement) => requirement.id)),
    },
  };
}

/** Derive a fingerprint input only from a graph whose links and identities have validated. */
export function projectValidatedObject(graph: ValidatedSpecificationGraph, objectId: ObjectId): FingerprintProjection {
  const object = graph.objects.get(objectId);
  if (object === undefined) throw new Error(`Cannot fingerprint unknown graph object ${objectId}.`);
  if ("anchor" in object) return requirementProjection(object);
  if (object.type === "concept") return conceptProjection(object);
  return capabilityProjection(graph, object);
}

export function fingerprintValidatedObject(
  graph: ValidatedSpecificationGraph,
  objectId: ObjectId,
  fingerprintClass: FingerprintClass,
): Fingerprint {
  return fingerprintObject(projectValidatedObject(graph, objectId), fingerprintClass);
}
