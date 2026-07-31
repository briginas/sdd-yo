import { dirname, join, normalize } from "node:path/posix";
import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { Diagnostic } from "../contracts/diagnostics.ts";
import type { ObjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { MarkdownResult } from "../markdown/result.ts";
import type {
  CapabilityDocument,
  CapabilityFragmentDocument,
  ConceptDocument,
  IndexDocument,
  MarkdownLink,
  Requirement,
  SpecificationDocument,
} from "../markdown/types.ts";

export type ValidatedSpecificationGraph = {
  readonly index: IndexDocument;
  readonly documents: ReadonlyMap<ProjectPath, SpecificationDocument>;
  readonly objects: ReadonlyMap<ObjectId, CapabilityDocument | ConceptDocument | Requirement>;
};

function problem(codeValue: string, message: string, path: ProjectPath, link?: MarkdownLink): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid graph diagnostic ${codeValue}`);
  return {
    code: codeValue,
    severity: "error",
    message,
    details: { remediation: "Correct the reported graph structure and validate again." },
    location: { path, ...(link === undefined ? {} : link.position) },
  };
}
function titleWarning(
  path: ProjectPath,
  link: MarkdownLink,
  expectedId: string,
  expectedTitle: string,
): Diagnostic | undefined {
  if (link.label === `${expectedId} — ${expectedTitle}`) return undefined;
  const codeValue = "SDD_GRAPH_DISPLAY_TITLE_STALE";
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid graph diagnostic ${codeValue}`);
  return {
    code: codeValue,
    severity: "warning",
    message: "Graph link display title does not match the target title.",
    details: { remediation: `Change the link label to ${expectedId} — ${expectedTitle}.` },
    location: { path, ...link.position },
  };
}
function fail<Value>(item: Diagnostic): MarkdownResult<Value> {
  return { ok: false, diagnostics: [item] };
}
function labeledId(link: MarkdownLink, prefix: "CAP" | "CON" | "REQ"): string | undefined {
  return new RegExp(`\\b${prefix}-[0-9A-F]{8}\\b`, "u").exec(link.label)?.[0];
}
function targetPath(source: ProjectPath, link: MarkdownLink): { path: string; anchor?: string } | undefined {
  if (link.target.includes("\\") || /^[A-Za-z][A-Za-z+.-]*:/u.test(link.target) || link.target.startsWith("/"))
    return undefined;
  const [rawPath, anchor] = link.target.split("#", 2);
  if (rawPath === undefined || rawPath.length === 0) return undefined;
  const path = normalize(join(dirname(source), rawPath));
  if (path === ".." || path.startsWith("../")) return undefined;
  return { path, ...(anchor === undefined ? {} : { anchor }) };
}

export function validateSpecificationGraph(
  documentsInput: readonly SpecificationDocument[],
  entrypoint: ProjectPath,
): MarkdownResult<ValidatedSpecificationGraph> {
  const scopeRoot = dirname(entrypoint);
  const warnings: Diagnostic[] = [];
  const documents = new Map<ProjectPath, SpecificationDocument>();
  const orderedDocuments = documentsInput.toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const document of orderedDocuments) {
    if (documents.has(document.path))
      return fail(problem("SDD_GRAPH_DUPLICATE_DOCUMENT", "Document path is duplicated.", document.path));
    documents.set(document.path, document);
  }
  const indexes = orderedDocuments.filter((document): document is IndexDocument => document.type === "index");
  if (indexes.length !== 1 || indexes[0]?.path !== entrypoint)
    return fail(
      problem("SDD_GRAPH_ENTRYPOINT_INVALID", "Configured entrypoint must be the only index Document.", entrypoint),
    );
  const index = indexes[0];
  const objects = new Map<ObjectId, CapabilityDocument | ConceptDocument | Requirement>();
  const objectPaths = new Map<ObjectId, ProjectPath>();
  const fragments: CapabilityFragmentDocument[] = [];
  for (const document of orderedDocuments) {
    if (document.type === "capability" || document.type === "concept") {
      if (objects.has(document.id))
        return fail(problem("SDD_GRAPH_DUPLICATE_ID", `Object ID ${document.id} is duplicated.`, document.path));
      objects.set(document.id, document);
      objectPaths.set(document.id, document.path);
    } else if (document.type === "capability-fragment") fragments.push(document);
    if (document.type === "capability" || document.type === "capability-fragment")
      for (const requirement of document.requirements) {
        if (objects.has(requirement.id))
          return fail(problem("SDD_GRAPH_DUPLICATE_ID", `Object ID ${requirement.id} is duplicated.`, document.path));
        objects.set(requirement.id, requirement);
        objectPaths.set(requirement.id, document.path);
      }
  }
  const reachable = new Set<ProjectPath>([index.path]);
  const resolveTyped = (
    source: ProjectPath,
    link: MarkdownLink,
    expected: "capability" | "concept" | "fragment",
    idPrefix?: "CAP" | "CON",
  ): MarkdownResult<SpecificationDocument> => {
    const target = targetPath(source, link);
    if (target === undefined)
      return fail(
        problem("SDD_GRAPH_PATH_OUTSIDE_SCOPE", "Graph link escapes project scope or is not portable.", source, link),
      );
    if (scopeRoot !== "." && target.path !== scopeRoot && !target.path.startsWith(`${scopeRoot}/`))
      return fail(
        problem("SDD_GRAPH_PATH_OUTSIDE_SCOPE", "Graph link escapes project scope or is not portable.", source, link),
      );
    const document = documents.get(target.path as ProjectPath);
    if (document === undefined)
      return fail(problem("SDD_GRAPH_LINK_BROKEN", "Graph link target does not exist.", source, link));
    if (
      (expected === "fragment" && document.type !== "capability-fragment") ||
      (expected !== "fragment" && document.type !== expected)
    )
      return fail(problem("SDD_GRAPH_TARGET_TYPE", "Graph link target has the wrong document type.", source, link));
    if (target.anchor !== undefined)
      return fail(
        problem(
          "SDD_GRAPH_TARGET_ANCHOR",
          "Capability and Concept links must target documents without anchors.",
          source,
          link,
        ),
      );
    if (idPrefix !== undefined) {
      const id = labeledId(link, idPrefix);
      if (id === undefined || !("id" in document) || document.id !== id)
        return fail(problem("SDD_GRAPH_TARGET_ID", "Graph link label and target identity do not match.", source, link));
      const warning = titleWarning(source, link, id, document.title);
      if (warning !== undefined) warnings.push(warning);
    }
    reachable.add(document.path);
    return { ok: true, value: document, diagnostics: [] };
  };
  const indexedIds = new Set<string>();
  for (const link of index.capabilities) {
    const id = labeledId(link, "CAP");
    if (id === undefined || indexedIds.has(id))
      return fail(
        problem("SDD_GRAPH_INDEX_DUPLICATE", "Index object identity is missing or duplicated.", index.path, link),
      );
    indexedIds.add(id);
    const target = resolveTyped(index.path, link, "capability", "CAP");
    if (!target.ok) return target;
  }
  for (const link of index.concepts) {
    const id = labeledId(link, "CON");
    if (id === undefined || indexedIds.has(id))
      return fail(
        problem("SDD_GRAPH_INDEX_DUPLICATE", "Index object identity is missing or duplicated.", index.path, link),
      );
    indexedIds.add(id);
    const target = resolveTyped(index.path, link, "concept", "CON");
    if (!target.ok) return target;
  }
  for (const object of objects.values())
    if (!("anchor" in object) && !indexedIds.has(object.id))
      return fail(problem("SDD_GRAPH_INDEX_INCOMPLETE", `Index omits active object ${object.id}.`, object.path));
  for (const capability of orderedDocuments.filter(
    (document): document is CapabilityDocument => document.type === "capability",
  ))
    for (const link of capability.fragments) {
      const target = resolveTyped(capability.path, link, "fragment");
      if (!target.ok) return target;
      if (target.value.type !== "capability-fragment" || target.value.capability !== capability.id)
        return fail(
          problem(
            "SDD_GRAPH_FRAGMENT_OWNER",
            "Fragment owner does not match its Capability root.",
            capability.path,
            link,
          ),
        );
    }
  for (const fragment of fragments)
    if (!reachable.has(fragment.path))
      return fail(problem("SDD_GRAPH_FRAGMENT_UNREACHABLE", "Capability fragment is unreachable.", fragment.path));
  const requirements = [...objects.values()].filter((object): object is Requirement => "anchor" in object);
  const edges = new Map<string, string[]>();
  for (const requirement of requirements) {
    const ownerDocument = orderedDocuments.find(
      (document) =>
        (document.type === "capability" || document.type === "capability-fragment") &&
        document.requirements.includes(requirement),
    );
    if (ownerDocument === undefined) throw new Error("Requirement owner document missing.");
    for (const relation of requirement.relations) {
      const target = targetPath(ownerDocument.path, relation.link);
      if (target === undefined)
        return fail(
          problem(
            "SDD_GRAPH_PATH_OUTSIDE_SCOPE",
            "Relation escapes project scope or is not portable.",
            ownerDocument.path,
            relation.link,
          ),
        );
      if (scopeRoot !== "." && target.path !== scopeRoot && !target.path.startsWith(`${scopeRoot}/`))
        return fail(
          problem(
            "SDD_GRAPH_PATH_OUTSIDE_SCOPE",
            "Relation escapes project scope or is not portable.",
            ownerDocument.path,
            relation.link,
          ),
        );
      const object = objects.get(relation.target_id);
      if (object === undefined)
        return fail(
          problem(
            "SDD_GRAPH_RELATION_UNKNOWN",
            "Relation target identity is unknown.",
            ownerDocument.path,
            relation.link,
          ),
        );
      if (objectPaths.get(relation.target_id) !== target.path)
        return fail(
          problem(
            "SDD_GRAPH_TARGET_ID",
            "Relation path and target identity do not match.",
            ownerDocument.path,
            relation.link,
          ),
        );
      if (relation.type === "depends-on") {
        if (!("anchor" in object) || target.anchor !== object.anchor)
          return fail(
            problem(
              "SDD_GRAPH_REQUIREMENT_ANCHOR",
              "Requirement relation anchor is invalid.",
              ownerDocument.path,
              relation.link,
            ),
          );
        const warning = titleWarning(ownerDocument.path, relation.link, object.id, object.title);
        if (warning !== undefined) warnings.push(warning);
        (edges.get(requirement.id) ?? edges.set(requirement.id, []).get(requirement.id))?.push(object.id);
      } else {
        if (!("definition" in object) || target.anchor !== undefined)
          return fail(
            problem(
              "SDD_GRAPH_TARGET_TYPE",
              "refers-to must target a Concept document without an anchor.",
              ownerDocument.path,
              relation.link,
            ),
          );
        const warning = titleWarning(ownerDocument.path, relation.link, object.id, object.title);
        if (warning !== undefined) warnings.push(warning);
      }
    }
  }
  for (const concept of orderedDocuments.filter(
    (document): document is ConceptDocument => document.type === "concept",
  )) {
    for (const relation of concept.relations) {
      const target = targetPath(concept.path, relation.link);
      if (
        target === undefined ||
        (scopeRoot !== "." && target.path !== scopeRoot && !target.path.startsWith(`${scopeRoot}/`))
      )
        return fail(
          problem(
            "SDD_GRAPH_PATH_OUTSIDE_SCOPE",
            "Concept relation escapes project scope or is not portable.",
            concept.path,
            relation.link,
          ),
        );
      const object = objects.get(relation.target_id);
      if (object === undefined)
        return fail(
          problem(
            "SDD_GRAPH_RELATION_UNKNOWN",
            "Concept relation target identity is unknown.",
            concept.path,
            relation.link,
          ),
        );
      if (
        !("definition" in object) ||
        objectPaths.get(relation.target_id) !== target.path ||
        target.anchor !== undefined
      )
        return fail(
          problem(
            "SDD_GRAPH_TARGET_TYPE",
            "relates-to must resolve to the labeled Concept document.",
            concept.path,
            relation.link,
          ),
        );
      const warning = titleWarning(concept.path, relation.link, object.id, object.title);
      if (warning !== undefined) warnings.push(warning);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) if (cyclic(next)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const requirement of requirements)
    if (cyclic(requirement.id))
      return fail(problem("SDD_GRAPH_DEPENDENCY_CYCLE", "Requirement dependency graph contains a cycle.", entrypoint));
  return { ok: true, value: { index, documents, objects }, diagnostics: warnings };
}
