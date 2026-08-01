import { createHash } from "node:crypto";

import { isFingerprint, isProjectId } from "../contracts/identifiers.ts";
import type { Fingerprint, ObjectId, ProjectId, RequirementId } from "../contracts/identifiers.ts";
import { isConceptId, isRequirementId } from "../contracts/identifiers.ts";
import { computeGraphObjectDelta } from "../fingerprint/object-delta.ts";
import type { ObjectDeltaEntry } from "../fingerprint/object-delta.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import type { ConceptDocument, Requirement } from "../markdown/types.ts";

export const SEMANTIC_CANDIDATE_REASONS = [
  "changed-concept-impact",
  "deletion-conflict",
  "incompatible-graph-operation",
  "overlapping-object-change",
  "requirement-dependency",
  "shared-concept",
] as const;

export type SemanticCandidateReason = (typeof SEMANTIC_CANDIDATE_REASONS)[number];

export type SemanticCandidate = {
  readonly objects: readonly ObjectId[];
  readonly reason: string;
};

export type SemanticNormativeSection = {
  readonly object_id: ObjectId;
  readonly section: "statement" | "acceptance" | "constraints" | "definition" | "identity" | "states" | "relations";
  readonly content: string;
};

export type SemanticAnalysisInputManifest = {
  readonly schema_version: "1.0";
  readonly artifact_type: "semantic_analysis_input_manifest";
  readonly project_id: ProjectId;
  readonly analyzer: { readonly name: string; readonly version: string };
  readonly input_fingerprint: Fingerprint;
  readonly changed_objects: readonly ObjectId[];
  readonly related_objects: readonly ObjectId[];
  readonly normative_sections: readonly SemanticNormativeSection[];
  readonly candidate_reasons: readonly SemanticCandidate[];
};

type CandidateInput = {
  readonly base: ValidatedSpecificationGraph;
  readonly candidate: ValidatedSpecificationGraph;
  readonly comparison?: ValidatedSpecificationGraph;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareCandidates(left: SemanticCandidate, right: SemanticCandidate): number {
  return compareStrings(`${left.objects.join("\0")}\0${left.reason}`, `${right.objects.join("\0")}\0${right.reason}`);
}

function changedEntries(
  before: ValidatedSpecificationGraph,
  after: ValidatedSpecificationGraph,
): ReadonlyMap<ObjectId, ObjectDeltaEntry> {
  const delta = computeGraphObjectDelta(before, after);
  const entries = new Map<ObjectId, ObjectDeltaEntry>();
  for (const entry of [...delta.semantic.entries, ...delta.structural.entries]) {
    const existing = entries.get(entry.id);
    if (existing === undefined || existing.operation === entry.operation) entries.set(entry.id, entry);
    else throw new Error(`Object ${entry.id} has incompatible delta classes.`);
  }
  return entries;
}

function requirement(graph: ValidatedSpecificationGraph, id: ObjectId): Requirement | undefined {
  const object = graph.objects.get(id);
  return object !== undefined && "anchor" in object ? object : undefined;
}

function concept(graph: ValidatedSpecificationGraph, id: ObjectId): ConceptDocument | undefined {
  const object = graph.objects.get(id);
  return object !== undefined && !("anchor" in object) && object.type === "concept" ? object : undefined;
}

function addCandidate(
  candidates: Map<string, SemanticCandidate>,
  objectsInput: readonly ObjectId[],
  reason: SemanticCandidateReason,
): void {
  const objects = [...new Set(objectsInput)].toSorted(compareStrings);
  if (objects.length === 0) return;
  const candidate = { objects, reason } as const;
  candidates.set(`${objects.join("\0")}\0${reason}`, candidate);
}

function graphsForRelations(input: CandidateInput): readonly ValidatedSpecificationGraph[] {
  return [input.candidate, ...(input.comparison === undefined ? [] : [input.comparison]), input.base];
}

function addRequirementDependencyCandidates(
  input: CandidateInput,
  changed: ReadonlySet<ObjectId>,
  candidates: Map<string, SemanticCandidate>,
): void {
  for (const changedId of changed) {
    if (!isRequirementId(changedId)) continue;
    for (const graph of graphsForRelations(input)) {
      for (const relation of requirement(graph, changedId)?.relations ?? []) {
        if (relation.type === "depends-on" && isRequirementId(relation.target_id)) {
          addCandidate(candidates, [changedId, relation.target_id], "requirement-dependency");
        }
      }
      for (const object of graph.objects.values()) {
        if (
          "anchor" in object &&
          object.relations.some((relation) => relation.type === "depends-on" && relation.target_id === changedId)
        ) {
          addCandidate(candidates, [changedId, object.id], "requirement-dependency");
        }
      }
    }
  }
}

function addSharedConceptCandidates(
  input: CandidateInput,
  changed: ReadonlySet<ObjectId>,
  candidates: Map<string, SemanticCandidate>,
): void {
  for (const changedId of changed) {
    if (!isRequirementId(changedId)) continue;
    const concepts = new Set(
      graphsForRelations(input).flatMap(
        (graph) =>
          requirement(graph, changedId)
            ?.relations.filter((relation) => relation.type === "refers-to" && isConceptId(relation.target_id))
            .map((relation) => relation.target_id) ?? [],
      ),
    );
    for (const conceptId of concepts) {
      for (const graph of graphsForRelations(input)) {
        for (const object of graph.objects.values()) {
          if (
            "anchor" in object &&
            object.id !== changedId &&
            object.relations.some((relation) => relation.type === "refers-to" && relation.target_id === conceptId)
          ) {
            addCandidate(candidates, [changedId, object.id, conceptId], "shared-concept");
          }
        }
      }
    }
  }
}

function directConceptReferrers(graph: ValidatedSpecificationGraph, conceptId: ObjectId): readonly RequirementId[] {
  return [...graph.objects.values()]
    .filter(
      (object): object is Requirement =>
        "anchor" in object &&
        object.relations.some((relation) => relation.type === "refers-to" && relation.target_id === conceptId),
    )
    .map((object) => object.id);
}

function transitiveDependents(
  graph: ValidatedSpecificationGraph,
  roots: readonly RequirementId[],
): readonly RequirementId[] {
  const selected = new Set(roots);
  const pending = [...roots];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    for (const object of graph.objects.values()) {
      if (
        !("anchor" in object) ||
        selected.has(object.id) ||
        !object.relations.some((relation) => relation.type === "depends-on" && relation.target_id === current)
      ) {
        continue;
      }
      selected.add(object.id);
      pending.push(object.id);
    }
  }
  return [...selected].toSorted(compareStrings);
}

function addConceptImpactCandidates(
  base: ValidatedSpecificationGraph,
  changedGraph: ValidatedSpecificationGraph,
  entries: ReadonlyMap<ObjectId, ObjectDeltaEntry>,
  candidates: Map<string, SemanticCandidate>,
): void {
  for (const entry of entries.values()) {
    if (entry.type !== "concept") continue;
    const relationGraph = entry.operation === "delete" ? base : changedGraph;
    const impacted = transitiveDependents(relationGraph, directConceptReferrers(relationGraph, entry.id));
    for (const requirementId of impacted) {
      addCandidate(candidates, [entry.id, requirementId], "changed-concept-impact");
    }
  }
}

function addDeletionCandidates(
  base: ValidatedSpecificationGraph,
  entries: ReadonlyMap<ObjectId, ObjectDeltaEntry>,
  candidates: Map<string, SemanticCandidate>,
): void {
  for (const entry of entries.values()) {
    if (entry.operation !== "delete") continue;
    for (const object of base.objects.values()) {
      if ("anchor" in object && object.relations.some((relation) => relation.target_id === entry.id)) {
        addCandidate(candidates, [entry.id, object.id], "deletion-conflict");
      } else if (
        !("anchor" in object) &&
        object.type === "concept" &&
        object.relations.some((relation) => relation.target_id === entry.id)
      ) {
        addCandidate(candidates, [entry.id, object.id], "deletion-conflict");
      }
    }
  }
}

export function generateSemanticCandidates(input: CandidateInput): readonly SemanticCandidate[] {
  const proposedEntries = changedEntries(input.base, input.candidate);
  const comparisonEntries =
    input.comparison === undefined
      ? new Map<ObjectId, ObjectDeltaEntry>()
      : changedEntries(input.base, input.comparison);
  const changed = new Set<ObjectId>([...proposedEntries.keys(), ...comparisonEntries.keys()]);
  const candidates = new Map<string, SemanticCandidate>();

  for (const [id, proposed] of proposedEntries) {
    const concurrent = comparisonEntries.get(id);
    if (concurrent === undefined) continue;
    const incompatible = proposed.operation !== concurrent.operation || proposed.operation === "add";
    addCandidate(candidates, [id], incompatible ? "incompatible-graph-operation" : "overlapping-object-change");
  }
  addRequirementDependencyCandidates(input, changed, candidates);
  addSharedConceptCandidates(input, changed, candidates);
  addConceptImpactCandidates(input.base, input.candidate, proposedEntries, candidates);
  addDeletionCandidates(input.base, proposedEntries, candidates);
  if (input.comparison !== undefined) {
    addConceptImpactCandidates(input.base, input.comparison, comparisonEntries, candidates);
    addDeletionCandidates(input.base, comparisonEntries, candidates);
  }
  return [...candidates.values()].toSorted(compareCandidates);
}

function relationContent(object: Requirement | ConceptDocument): string {
  return JSON.stringify(
    object.relations
      .map((relation) => ({ type: relation.type, target_id: relation.target_id }))
      .toSorted((left, right) =>
        compareStrings(`${left.type}\0${left.target_id}`, `${right.type}\0${right.target_id}`),
      ),
  );
}

function sectionsForObject(graph: ValidatedSpecificationGraph, id: ObjectId): readonly SemanticNormativeSection[] {
  const object = graph.objects.get(id);
  if (object === undefined || (!("anchor" in object) && object.type === "capability")) return [];
  if ("anchor" in object) {
    return [
      { object_id: id, section: "statement", content: object.statement },
      { object_id: id, section: "acceptance", content: JSON.stringify(object.acceptance) },
      ...(object.constraints.length === 0
        ? []
        : [{ object_id: id, section: "constraints" as const, content: JSON.stringify(object.constraints) }]),
      ...(object.relations.length === 0
        ? []
        : [{ object_id: id, section: "relations" as const, content: relationContent(object) }]),
    ];
  }
  const value = concept(graph, id);
  if (value === undefined) return [];
  return [
    { object_id: id, section: "definition", content: value.definition },
    ...(value.identity === undefined ? [] : [{ object_id: id, section: "identity" as const, content: value.identity }]),
    ...(value.states.length === 0
      ? []
      : [{ object_id: id, section: "states" as const, content: JSON.stringify(value.states) }]),
    ...(value.relations.length === 0
      ? []
      : [{ object_id: id, section: "relations" as const, content: relationContent(value) }]),
  ];
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => compareStrings(left, right))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return typeof value === "string" ? value.normalize("NFC") : value;
}

function fingerprintManifestInput(value: unknown): Fingerprint {
  const fingerprint: unknown = `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)), "utf8")
    .digest("hex")}`;
  if (!isFingerprint(fingerprint)) throw new Error("Semantic input fingerprint generation failed.");
  return fingerprint;
}

export function fingerprintSemanticAnalysisInputManifest(
  value: Omit<SemanticAnalysisInputManifest, "input_fingerprint">,
): Fingerprint {
  return fingerprintManifestInput({
    canonicalization_version: "1",
    schema_version: value.schema_version,
    artifact_type: value.artifact_type,
    project_id: value.project_id,
    analyzer: value.analyzer,
    changed_objects: value.changed_objects,
    related_objects: value.related_objects,
    normative_sections: value.normative_sections,
    candidate_reasons: value.candidate_reasons,
  });
}

export function buildSemanticAnalysisInputManifest(
  input: CandidateInput & {
    readonly project_id: ProjectId;
    readonly analyzer: { readonly name: string; readonly version: string };
  },
): SemanticAnalysisInputManifest {
  if (!isProjectId(input.project_id) || input.analyzer.name.length === 0 || input.analyzer.version.length === 0) {
    throw new Error("Semantic analysis manifest identity is invalid.");
  }
  const proposedEntries = changedEntries(input.base, input.candidate);
  const comparisonEntries =
    input.comparison === undefined
      ? new Map<ObjectId, ObjectDeltaEntry>()
      : changedEntries(input.base, input.comparison);
  const changedObjects = [...new Set([...proposedEntries.keys(), ...comparisonEntries.keys()])].toSorted(
    compareStrings,
  );
  const candidateReasons = generateSemanticCandidates(input);
  const candidateObjects = new Set(candidateReasons.flatMap((candidate) => candidate.objects));
  const relatedObjects = [...candidateObjects].filter((id) => !changedObjects.includes(id)).toSorted(compareStrings);
  const selectedObjects = [...new Set([...changedObjects, ...relatedObjects])].toSorted(compareStrings);
  const normativeSections = selectedObjects
    .flatMap((id) => {
      const graph =
        (proposedEntries.get(id)?.operation === "delete" ? input.base : undefined) ??
        (input.candidate.objects.has(id) ? input.candidate : undefined) ??
        (input.comparison?.objects.has(id) === true ? input.comparison : undefined) ??
        input.base;
      return sectionsForObject(graph, id);
    })
    .toSorted((left, right) =>
      compareStrings(`${left.object_id}\0${left.section}`, `${right.object_id}\0${right.section}`),
    );
  const payload = {
    schema_version: "1.0" as const,
    artifact_type: "semantic_analysis_input_manifest" as const,
    project_id: input.project_id,
    analyzer: { name: input.analyzer.name, version: input.analyzer.version },
    changed_objects: changedObjects,
    related_objects: relatedObjects,
    normative_sections: normativeSections,
    candidate_reasons: candidateReasons,
  };
  return { ...payload, input_fingerprint: fingerprintSemanticAnalysisInputManifest(payload) };
}
