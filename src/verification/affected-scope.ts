import { createHash } from "node:crypto";

import type { CapabilityId, Fingerprint, RequirementId } from "../contracts/identifiers.ts";
import { isCapabilityId, isFingerprint, isRequirementId } from "../contracts/identifiers.ts";
import { computeGraphObjectDelta } from "../fingerprint/object-delta.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";

export type AffectedScope = {
  readonly affected_requirements: readonly RequirementId[];
  readonly affected_capabilities: readonly CapabilityId[];
  readonly canonical_bytes: Uint8Array;
  readonly fingerprint: Fingerprint;
};

export class AffectedScopeError extends Error {
  readonly code: "SDD_GRAPH_CODE_TARGET_UNKNOWN";

  constructor(message: string) {
    super(message);
    this.name = "AffectedScopeError";
    this.code = "SDD_GRAPH_CODE_TARGET_UNKNOWN";
  }
}

function activeRequirement(graph: ValidatedSpecificationGraph, id: RequirementId): boolean {
  const object = graph.objects.get(id);
  return object !== undefined && "anchor" in object;
}

function addChangedRequirements(
  selected: Set<RequirementId>,
  graph: ValidatedSpecificationGraph,
  entries: ReturnType<typeof computeGraphObjectDelta>["semantic"]["entries"],
): void {
  for (const entry of entries) {
    if (entry.type !== "requirement" || entry.operation === "delete" || !isRequirementId(entry.id)) continue;
    if (activeRequirement(graph, entry.id)) selected.add(entry.id);
  }
}

function conceptImpact(
  before: ValidatedSpecificationGraph,
  after: ValidatedSpecificationGraph,
  changedConceptIds: ReadonlySet<string>,
): readonly RequirementId[] {
  const impacted = new Set<RequirementId>();
  for (const graph of [before, after]) {
    for (const object of graph.objects.values()) {
      if (!("anchor" in object) || !activeRequirement(after, object.id)) continue;
      if (
        object.relations.some((relation) => relation.type === "refers-to" && changedConceptIds.has(relation.target_id))
      ) {
        impacted.add(object.id);
      }
    }
  }
  return [...impacted];
}

function expandDependents(graph: ValidatedSpecificationGraph, selected: Set<RequirementId>): void {
  const dependents = new Map<RequirementId, Set<RequirementId>>();
  for (const object of graph.objects.values()) {
    if (!("anchor" in object)) continue;
    for (const relation of object.relations) {
      if (relation.type !== "depends-on" || !isRequirementId(relation.target_id)) continue;
      const values = dependents.get(relation.target_id) ?? new Set<RequirementId>();
      values.add(object.id);
      dependents.set(relation.target_id, values);
    }
  }
  const pending = [...selected];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    for (const dependent of dependents.get(current) ?? []) {
      if (selected.has(dependent)) continue;
      selected.add(dependent);
      pending.push(dependent);
    }
  }
}

export function computeAffectedScope(input: {
  readonly before: ValidatedSpecificationGraph;
  readonly after: ValidatedSpecificationGraph;
  readonly code_targets?: readonly RequirementId[];
}): AffectedScope {
  const delta = computeGraphObjectDelta(input.before, input.after);
  const requirements = new Set<RequirementId>();
  addChangedRequirements(requirements, input.after, delta.semantic.entries);
  addChangedRequirements(requirements, input.after, delta.structural.entries);

  for (const target of input.code_targets ?? []) {
    if (!activeRequirement(input.after, target)) {
      throw new AffectedScopeError(`Code target ${target} is not an active Requirement.`);
    }
    requirements.add(target);
  }

  const changedConceptIds = new Set(
    [...delta.semantic.entries, ...delta.structural.entries]
      .filter((entry) => entry.type === "concept")
      .map((entry) => entry.id),
  );
  for (const requirement of conceptImpact(input.before, input.after, changedConceptIds)) requirements.add(requirement);
  expandDependents(input.after, requirements);

  const capabilities = new Set<CapabilityId>();
  for (const requirementId of requirements) {
    const requirement = input.after.objects.get(requirementId);
    if (requirement !== undefined && "anchor" in requirement && isCapabilityId(requirement.owner)) {
      capabilities.add(requirement.owner);
    }
  }
  for (const entry of delta.semantic.entries) {
    if (entry.type !== "requirement" || entry.operation !== "delete" || !isRequirementId(entry.id)) continue;
    const requirement = input.before.objects.get(entry.id);
    if (requirement !== undefined && "anchor" in requirement && isCapabilityId(requirement.owner)) {
      capabilities.add(requirement.owner);
    }
  }

  const affectedRequirements = [...requirements].toSorted();
  const affectedCapabilities = [...capabilities].toSorted();
  const canonicalBytes = new TextEncoder().encode(
    JSON.stringify({
      canonicalization_version: "1",
      affected_requirements: affectedRequirements,
      affected_capabilities: affectedCapabilities,
    }),
  );
  const fingerprintValue: unknown = `sha256:${createHash("sha256").update(canonicalBytes).digest("hex")}`;
  if (!isFingerprint(fingerprintValue)) throw new Error("Affected scope fingerprint generation failed.");
  return {
    affected_requirements: affectedRequirements,
    affected_capabilities: affectedCapabilities,
    canonical_bytes: canonicalBytes,
    fingerprint: fingerprintValue,
  };
}
