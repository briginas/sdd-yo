import { isRequirementId } from "../contracts/identifiers.ts";
import type { ConceptId, ObjectId, RequirementId } from "../contracts/identifiers.ts";
import type { RequirementRelation } from "../markdown/types.ts";
import type { ValidatedSpecificationGraph } from "./validate-graph.ts";

export type ReverseRelation = {
  readonly type: RequirementRelation["type"] | "relates-to";
  readonly source_id: ObjectId;
};

export type GraphTrace = {
  readonly object_id: ObjectId;
  readonly ancestry: readonly ObjectId[];
  readonly dependencies: readonly RequirementId[];
  readonly dependents: readonly RequirementId[];
  readonly referrers: readonly ReverseRelation[];
};

type RelationEntry =
  | { readonly type: "depends-on"; readonly sourceId: RequirementId; readonly targetId: RequirementId }
  | {
      readonly type: "refers-to";
      readonly sourceId: RequirementId;
      readonly targetId: RequirementId | ConceptId;
    }
  | { readonly type: "relates-to"; readonly sourceId: ConceptId; readonly targetId: ConceptId };

function relationEntries(graph: ValidatedSpecificationGraph): readonly RelationEntry[] {
  const entries: RelationEntry[] = [];
  for (const object of graph.objects.values()) {
    if ("anchor" in object) {
      for (const relation of object.relations) {
        if (relation.type === "depends-on") {
          if (!isRequirementId(relation.target_id))
            throw new Error("Validated dependency target is not a Requirement.");
          entries.push({ type: relation.type, sourceId: object.id, targetId: relation.target_id });
        } else entries.push({ type: relation.type, sourceId: object.id, targetId: relation.target_id });
      }
    } else if (object.type === "concept") {
      for (const relation of object.relations) {
        entries.push({ type: relation.type, sourceId: object.id, targetId: relation.target_id });
      }
    }
  }
  return entries;
}

export function directReverseRelations(
  graph: ValidatedSpecificationGraph,
  targetId: ObjectId,
): readonly ReverseRelation[] {
  const entries = relationEntries(graph)
    .filter((relation) => relation.targetId === targetId)
    .map((relation) => ({ type: relation.type, source_id: relation.sourceId }));
  return [...new Map(entries.map((entry) => [`${entry.source_id}\0${entry.type}`, entry])).values()].toSorted(
    (left, right) =>
      left.source_id !== right.source_id
        ? left.source_id < right.source_id
          ? -1
          : 1
        : left.type < right.type
          ? -1
          : left.type > right.type
            ? 1
            : 0,
  );
}

function dependencyClosure(
  start: RequirementId,
  adjacent: ReadonlyMap<RequirementId, ReadonlySet<RequirementId>>,
): readonly RequirementId[] {
  const selected = new Set<RequirementId>();
  const pending = [...(adjacent.get(start) ?? [])];
  while (pending.length > 0) {
    const candidate = pending.pop();
    if (candidate === undefined || candidate === start || selected.has(candidate)) continue;
    selected.add(candidate);
    pending.push(...(adjacent.get(candidate) ?? []));
  }
  return [...selected].toSorted();
}

export function traceGraphObject(graph: ValidatedSpecificationGraph, objectId: ObjectId): GraphTrace | undefined {
  const object = graph.objects.get(objectId);
  if (object === undefined) return undefined;
  const referrers = directReverseRelations(graph, objectId);
  if (!("anchor" in object)) {
    return { object_id: objectId, ancestry: [], dependencies: [], dependents: [], referrers };
  }

  const dependencies = new Map<RequirementId, Set<RequirementId>>();
  const dependents = new Map<RequirementId, Set<RequirementId>>();
  for (const relation of relationEntries(graph)) {
    if (relation.type !== "depends-on") continue;
    const source = relation.sourceId;
    const target = relation.targetId;
    (dependencies.get(source) ?? dependencies.set(source, new Set()).get(source))?.add(target);
    (dependents.get(target) ?? dependents.set(target, new Set()).get(target))?.add(source);
  }
  return {
    object_id: objectId,
    ancestry: [object.owner],
    dependencies: dependencyClosure(object.id, dependencies),
    dependents: dependencyClosure(object.id, dependents),
    referrers,
  };
}
