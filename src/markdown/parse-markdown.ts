import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseDocument } from "yaml";

import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { Diagnostic } from "../contracts/diagnostics.ts";
import { isCapabilityId, isConceptId, isProjectPath, isRequirementId } from "../contracts/identifiers.ts";
import type { CapabilityId, ObjectId, ProjectPath } from "../contracts/identifiers.ts";
import type { MarkdownResult } from "./result.ts";
import {
  DOCUMENT_TYPES,
  REQUIREMENT_KINDS,
  VERIFICATION_MODES,
  type CapabilityDocument,
  type CapabilityFragmentDocument,
  type CanonicalProseBlock,
  type ConceptDocument,
  type ConceptRelation,
  type IndexDocument,
  type MarkdownLink,
  type Requirement,
  type RequirementKind,
  type RequirementRelation,
  type SourcePosition,
  type SpecificationDocument,
  type VerificationMode,
} from "./types.ts";

type Node = {
  readonly type: string;
  readonly value?: string;
  readonly depth?: number;
  readonly lang?: string | null;
  readonly url?: string;
  readonly children?: readonly Node[];
  readonly position?: { readonly start: SourcePosition; readonly end: SourcePosition };
};
type UnknownRecord = Record<string, unknown>;

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);
const markerPattern = /^<!--\s*sdd:([a-z-]+)\s*-->$/u;
const allowedMarkers = new Set([
  "capabilities",
  "concepts",
  "purpose",
  "fragments",
  "relations",
  "statement",
  "acceptance",
  "constraints",
  "rationale",
  "examples",
  "definition",
  "identity",
  "states",
]);

function diagnostic(
  codeValue: string,
  message: string,
  path: ProjectPath,
  node?: Node,
  objectId?: ObjectId,
): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid internal diagnostic code ${codeValue}`);
  return {
    code: codeValue,
    severity: "error",
    message,
    details: { remediation: "Correct the reported Markdown structure and validate again." },
    location: {
      path,
      ...(node?.position === undefined ? {} : { line: node.position.start.line, column: node.position.start.column }),
    },
    ...(objectId === undefined ? {} : { object_id: objectId }),
  };
}
function failure<Value>(item: Diagnostic): MarkdownResult<Value> {
  return { ok: false, diagnostics: [item] };
}
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(node: Node): string {
  return typeof node.value === "string" ? node.value : (node.children ?? []).map(text).join("");
}
function content(nodes: readonly Node[]): string {
  return nodes.map(text).join("\n\n").trim();
}
function canonicalProse(nodes: readonly Node[]): readonly CanonicalProseBlock[] {
  return nodes
    .map((node) => text(node).trim())
    .filter(Boolean)
    .map((value) => ({ type: "paragraph", children: [{ type: "text", value }] }));
}
function marker(node: Node): string | undefined {
  if (node.type !== "heading") return undefined;
  const comments = (node.children ?? []).filter((child) => child.type === "html" && child.value?.includes("sdd:"));
  if (comments.length !== 1) return undefined;
  return markerPattern.exec(comments[0]?.value?.trim() ?? "")?.[1];
}
function standaloneHtml(node: Node | undefined): string | undefined {
  if (node?.type === "html") return node.value?.trim();
  if (
    node?.type !== "paragraph" ||
    node.children?.length === 0 ||
    !node.children?.every((child) => child.type === "html")
  )
    return undefined;
  return node.children
    .map((child) => child.value ?? "")
    .join("")
    .trim();
}
function links(nodes: readonly Node[]): MarkdownLink[] {
  const result: MarkdownLink[] = [];
  const visit = (node: Node): void => {
    if (node.type === "link" && node.url !== undefined && node.position !== undefined)
      result.push({ label: text(node), target: node.url, position: node.position.start });
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return result;
}
function listItems(nodes: readonly Node[]): string[] {
  const list = nodes.find((node) => node.type === "list");
  return (list?.children ?? []).map((item) => content(item.children ?? [])).filter(Boolean);
}
function listItemProse(nodes: readonly Node[]): readonly (readonly CanonicalProseBlock[])[] {
  const list = nodes.find((node) => node.type === "list");
  return (list?.children ?? []).map((item) => canonicalProse(item.children ?? [])).filter((item) => item.length > 0);
}
function yamlValue(source: string): unknown {
  const document = parseDocument(source, { customTags: [], uniqueKeys: true, version: "1.2" });
  if (document.errors.length > 0 || document.warnings.length > 0) throw new Error("invalid yaml");
  return document.toJS({ maxAliasCount: 0 });
}
function exactKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = keys.toSorted();
  return actual.length === expected.length && expected.every((key, index) => actual[index] === key);
}
function markedSection(
  nodes: readonly Node[],
  name: string,
  path: ProjectPath,
  required: boolean,
  objectId?: ObjectId,
): MarkdownResult<readonly Node[]> {
  const headings = nodes.filter((node) => marker(node) === name);
  if (headings.length === 0)
    return required
      ? failure(
          diagnostic(
            "SDD_MARKDOWN_MARKER_REQUIRED",
            `Required sdd:${name} marker is missing.`,
            path,
            undefined,
            objectId,
          ),
        )
      : { ok: true, value: [], diagnostics: [] };
  if (headings.length > 1)
    return failure(
      diagnostic(
        "SDD_MARKDOWN_MARKER_DUPLICATE",
        `Machine marker sdd:${name} is duplicated.`,
        path,
        headings[1],
        objectId,
      ),
    );
  const heading = headings[0];
  if (heading === undefined) throw new Error("Expected one marked heading.");
  const start = nodes.indexOf(heading) + 1;
  let end = start;
  while (end < nodes.length && !(nodes[end]?.type === "heading" && nodes[end]?.depth === heading?.depth)) end += 1;
  return { ok: true, value: nodes.slice(start, end), diagnostics: [] };
}
function blockSections(
  nodes: readonly Node[],
  path: ProjectPath,
  objectId?: ObjectId,
): MarkdownResult<Map<string, readonly Node[]>> {
  const result = new Map<string, readonly Node[]>();
  for (let index = 0; index < nodes.length; index += 1) {
    const heading = nodes[index];
    if (heading?.type !== "heading" || heading.depth !== 3) continue;
    const name = marker(heading);
    if (name === undefined) continue;
    if (result.has(name))
      return failure(
        diagnostic(
          "SDD_MARKDOWN_MARKER_DUPLICATE",
          `Requirement marker sdd:${name} is duplicated.`,
          path,
          heading,
          objectId,
        ),
      );
    let end = index + 1;
    while (end < nodes.length && !(nodes[end]?.type === "heading" && nodes[end]?.depth === 3)) end += 1;
    result.set(name, nodes.slice(index + 1, end));
  }
  return { ok: true, value: result, diagnostics: [] };
}
function parseRequirementRelations(
  nodes: readonly Node[],
  path: ProjectPath,
  objectId: ObjectId,
): MarkdownResult<readonly RequirementRelation[]> {
  const result: RequirementRelation[] = [];
  for (const item of nodes.flatMap((node) => (node.type === "list" ? [...(node.children ?? [])] : []))) {
    const itemText = text(item);
    const type = itemText.startsWith("refers-to:")
      ? "refers-to"
      : itemText.startsWith("depends-on:")
        ? "depends-on"
        : undefined;
    const link = links([item])[0];
    const id = link === undefined ? undefined : /\b(?:REQ|CON)-[0-9A-F]{8}\b/u.exec(link.label)?.[0];
    if (
      type === undefined ||
      link === undefined ||
      (!isRequirementId(id) && !isConceptId(id)) ||
      (type === "depends-on" && !isRequirementId(id))
    ) {
      return failure(
        diagnostic("SDD_MARKDOWN_RELATION_INVALID", "Requirement relation is invalid.", path, item, objectId),
      );
    }
    result.push({ type, target_id: id, link });
  }
  return { ok: true, value: result, diagnostics: [] };
}
function parseRequirements(
  nodes: readonly Node[],
  owner: CapabilityId,
  path: ProjectPath,
): MarkdownResult<readonly Requirement[]> {
  const requirements: Requirement[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const headingNode = nodes[index];
    const headingText = headingNode?.type === "heading" ? text(headingNode).trim() : "";
    if (headingNode?.type === "heading" && headingNode.depth !== 2 && /^REQ-[0-9A-F]{8}\b/u.test(headingText))
      return failure(
        diagnostic("SDD_MARKDOWN_REQUIREMENT_NESTED", "Requirements must use H2 headings.", path, headingNode),
      );
    if (headingNode?.type !== "heading" || headingNode.depth !== 2) continue;
    const heading = /^(REQ-[0-9A-F]{8})\s+—\s+(.+)$/u.exec(headingText);
    if (heading?.[1] === undefined || heading[2] === undefined) {
      if (headingText.startsWith("REQ-")) {
        return failure(
          diagnostic(
            "SDD_MARKDOWN_REQUIREMENT_HEADING_INVALID",
            "Requirement heading must use an uppercase ID, an em dash, and a title.",
            path,
            headingNode,
          ),
        );
      }
      continue;
    }
    if (!isRequirementId(heading[1]))
      return failure(
        diagnostic("SDD_MARKDOWN_REQUIREMENT_ID_INVALID", "Requirement ID is invalid.", path, headingNode),
      );
    const id = heading[1];
    const expectedAnchor = id.toLowerCase();
    if (standaloneHtml(nodes[index - 1]) !== `<a id="${expectedAnchor}"></a>`)
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_ANCHOR_INVALID",
          `Expected anchor ${expectedAnchor}.`,
          path,
          headingNode,
          id,
        ),
      );
    const metadataNode = nodes[index + 1];
    if (metadataNode?.type !== "code" || metadataNode.lang !== "sdd" || metadataNode.value === undefined)
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_METADATA_REQUIRED",
          "Requirement metadata must immediately follow its heading.",
          path,
          headingNode,
          id,
        ),
      );
    let metadata: unknown;
    try {
      metadata = yamlValue(metadataNode.value);
    } catch {
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_METADATA_INVALID",
          "Requirement metadata is invalid.",
          path,
          metadataNode,
          id,
        ),
      );
    }
    if (!isRecord(metadata) || !exactKeys(metadata, ["kind", "verification"]))
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_METADATA_INVALID",
          "Requirement metadata fields are invalid.",
          path,
          metadataNode,
          id,
        ),
      );
    if (!REQUIREMENT_KINDS.some((kind) => kind === metadata.kind))
      return failure(
        diagnostic("SDD_MARKDOWN_REQUIREMENT_KIND_UNKNOWN", "Requirement kind is unsupported.", path, metadataNode, id),
      );
    if (!VERIFICATION_MODES.some((mode) => mode === metadata.verification))
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_VERIFICATION_UNKNOWN",
          "Verification mode is unsupported.",
          path,
          metadataNode,
          id,
        ),
      );
    let end = index + 2;
    while (end < nodes.length && !(nodes[end]?.type === "heading" && nodes[end]?.depth === 2)) end += 1;
    const sectionsResult = blockSections(nodes.slice(index + 2, end), path, id);
    if (!sectionsResult.ok) return sectionsResult;
    const sections = sectionsResult.value;
    const unknown = [...sections.keys()].find(
      (name) => !["relations", "statement", "acceptance", "constraints", "rationale", "examples"].includes(name),
    );
    if (unknown !== undefined)
      return failure(
        diagnostic(
          "SDD_MARKDOWN_MARKER_UNKNOWN",
          `Requirement marker sdd:${unknown} is unsupported.`,
          path,
          headingNode,
          id,
        ),
      );
    const statement = content(sections.get("statement") ?? []);
    const acceptance = listItems(sections.get("acceptance") ?? []);
    const constraints = listItems(sections.get("constraints") ?? []);
    if (statement.length === 0)
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_STATEMENT_REQUIRED",
          "Requirement statement is required.",
          path,
          headingNode,
          id,
        ),
      );
    if (acceptance.length === 0)
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_ACCEPTANCE_REQUIRED",
          "Acceptance criteria are required.",
          path,
          headingNode,
          id,
        ),
      );
    const relations = parseRequirementRelations(sections.get("relations") ?? [], path, id);
    if (!relations.ok) return relations;
    const rationale = content(sections.get("rationale") ?? []);
    const examples = content(sections.get("examples") ?? []);
    requirements.push({
      id,
      anchor: expectedAnchor,
      title: heading[2].trim(),
      kind: metadata.kind as RequirementKind,
      verification: metadata.verification as VerificationMode,
      owner,
      statement,
      statement_ast: canonicalProse(sections.get("statement") ?? []),
      acceptance,
      acceptance_ast: listItemProse(sections.get("acceptance") ?? []),
      constraints,
      constraints_ast: listItemProse(sections.get("constraints") ?? []),
      relations: relations.value,
      ...(rationale ? { rationale } : {}),
      ...(examples ? { examples } : {}),
      position: headingNode.position?.start ?? { line: 1, column: 1 },
    });
    index = end - 1;
  }
  return { ok: true, value: requirements, diagnostics: [] };
}
function conceptRelations(
  nodes: readonly Node[],
  path: ProjectPath,
  objectId: ObjectId,
): MarkdownResult<readonly ConceptRelation[]> {
  const result: ConceptRelation[] = [];
  for (const item of nodes.flatMap((node) => (node.type === "list" ? [...(node.children ?? [])] : []))) {
    const link = links([item])[0];
    const id = link === undefined ? undefined : /\bCON-[0-9A-F]{8}\b/u.exec(link.label)?.[0];
    if (!text(item).startsWith("relates-to:") || link === undefined || !isConceptId(id))
      return failure(diagnostic("SDD_MARKDOWN_RELATION_INVALID", "Concept relation is invalid.", path, item, objectId));
    result.push({ type: "relates-to", target_id: id, link });
  }
  return { ok: true, value: result, diagnostics: [] };
}

export function parseSpecificationDocument(
  pathValue: string,
  bytes: Uint8Array,
): MarkdownResult<SpecificationDocument> {
  if (!isProjectPath(pathValue)) throw new Error("Document path must be project-relative.");
  const path = pathValue;
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replaceAll(/\r\n?|\r/gu, "\n")
      .normalize("NFC");
  } catch {
    return failure(diagnostic("SDD_MARKDOWN_INVALID_UTF8", "Document is not valid UTF-8.", path));
  }
  const root = processor.parse(source) as unknown as Node;
  const nodes = root.children ?? [];
  for (const node of nodes)
    for (const child of node.children ?? [])
      if (child.type === "html" && child.value?.includes("sdd:")) {
        const name = markerPattern.exec(child.value.trim())?.[1];
        if (name === undefined || !allowedMarkers.has(name))
          return failure(
            diagnostic("SDD_MARKDOWN_MARKER_UNKNOWN", "Machine marker is malformed or unsupported.", path, child),
          );
      }
  const yamlNode = nodes[0];
  if (yamlNode?.type !== "yaml" || yamlNode.value === undefined)
    return failure(diagnostic("SDD_MARKDOWN_FRONTMATTER_REQUIRED", "YAML frontmatter is required.", path, yamlNode));
  let frontmatter: unknown;
  try {
    frontmatter = yamlValue(yamlNode.value);
  } catch {
    return failure(diagnostic("SDD_MARKDOWN_FRONTMATTER_INVALID", "YAML frontmatter is invalid.", path, yamlNode));
  }
  if (!isRecord(frontmatter) || !isRecord(frontmatter.sdd) || Object.keys(frontmatter).length !== 1)
    return failure(
      diagnostic("SDD_MARKDOWN_FRONTMATTER_INVALID", "Frontmatter must contain only sdd metadata.", path, yamlNode),
    );
  const sdd = frontmatter.sdd;
  const type = sdd.type;
  if (!DOCUMENT_TYPES.some((candidate) => candidate === type))
    return failure(diagnostic("SDD_MARKDOWN_DOCUMENT_TYPE_UNKNOWN", "Document type is unsupported.", path, yamlNode));
  const titleNode = nodes.find((node) => node.type === "heading" && node.depth === 1);
  const title = titleNode === undefined ? "" : text(titleNode).trim();
  if (!title)
    return failure(diagnostic("SDD_MARKDOWN_TITLE_REQUIRED", "Document H1 title is required.", path, titleNode));
  const unexpectedRequirement = nodes.find(
    (node) => node.type === "heading" && /^REQ-[0-9A-F]{8}\b/u.test(text(node).trim()),
  );
  if (type === "index") {
    if (unexpectedRequirement !== undefined)
      return failure(
        diagnostic(
          "SDD_MARKDOWN_REQUIREMENT_UNEXPECTED",
          "Requirements may appear only in Capability documents.",
          path,
          unexpectedRequirement,
        ),
      );
    if (!exactKeys(sdd, ["type"]))
      return failure(
        diagnostic("SDD_MARKDOWN_FRONTMATTER_INVALID", "Index metadata fields are invalid.", path, yamlNode),
      );
    const capabilities = markedSection(nodes, "capabilities", path, true);
    if (!capabilities.ok) return capabilities;
    const concepts = markedSection(nodes, "concepts", path, true);
    if (!concepts.ok) return concepts;
    const value: IndexDocument = {
      type,
      path,
      title,
      capabilities: links(capabilities.value),
      concepts: links(concepts.value),
    };
    return { ok: true, value, diagnostics: [] };
  }
  if (type === "capability" || type === "capability-fragment") {
    const key = type === "capability" ? "id" : "capability";
    if (!exactKeys(sdd, [key, "type"]) || !isCapabilityId(sdd[key]))
      return failure(
        diagnostic("SDD_MARKDOWN_CAPABILITY_ID_INVALID", "Capability identity is invalid.", path, yamlNode),
      );
    const owner = sdd[key];
    const requirements = parseRequirements(nodes, owner, path);
    if (!requirements.ok) return requirements;
    if (type === "capability") {
      const purpose = markedSection(nodes, "purpose", path, false, owner);
      if (!purpose.ok) return purpose;
      const fragments = markedSection(nodes, "fragments", path, false, owner);
      if (!fragments.ok) return fragments;
      const purposeText = content(purpose.value);
      const value: CapabilityDocument = {
        type,
        path,
        title,
        id: owner,
        ...(purposeText ? { purpose: purposeText } : {}),
        fragments: links(fragments.value),
        requirements: requirements.value,
      };
      return { ok: true, value, diagnostics: [] };
    }
    const value: CapabilityFragmentDocument = {
      type,
      path,
      title,
      capability: owner,
      requirements: requirements.value,
    };
    return { ok: true, value, diagnostics: [] };
  }
  if (!exactKeys(sdd, ["id", "type"]) || !isConceptId(sdd.id))
    return failure(diagnostic("SDD_MARKDOWN_CONCEPT_ID_INVALID", "Concept identity is invalid.", path, yamlNode));
  if (unexpectedRequirement !== undefined)
    return failure(
      diagnostic(
        "SDD_MARKDOWN_REQUIREMENT_UNEXPECTED",
        "Requirements may appear only in Capability documents.",
        path,
        unexpectedRequirement,
        sdd.id,
      ),
    );
  const definition = markedSection(nodes, "definition", path, true, sdd.id);
  if (!definition.ok) return definition;
  const definitionText = content(definition.value);
  if (!definitionText)
    return failure(
      diagnostic(
        "SDD_MARKDOWN_CONCEPT_DEFINITION_REQUIRED",
        "Concept definition is required.",
        path,
        undefined,
        sdd.id,
      ),
    );
  const identity = markedSection(nodes, "identity", path, false, sdd.id);
  if (!identity.ok) return identity;
  const states = markedSection(nodes, "states", path, false, sdd.id);
  if (!states.ok) return states;
  const relationSection = markedSection(nodes, "relations", path, false, sdd.id);
  if (!relationSection.ok) return relationSection;
  const relations = conceptRelations(relationSection.value, path, sdd.id);
  if (!relations.ok) return relations;
  const rationale = markedSection(nodes, "rationale", path, false, sdd.id);
  if (!rationale.ok) return rationale;
  const examples = markedSection(nodes, "examples", path, false, sdd.id);
  if (!examples.ok) return examples;
  const identityText = content(identity.value);
  const rationaleText = content(rationale.value);
  const examplesText = content(examples.value);
  const value: ConceptDocument = {
    type: "concept",
    path,
    title,
    id: sdd.id,
    definition: definitionText,
    definition_ast: canonicalProse(definition.value),
    ...(identityText ? { identity: identityText } : {}),
    identity_ast: canonicalProse(identity.value),
    states: listItems(states.value),
    states_ast: listItemProse(states.value),
    relations: relations.value,
    ...(rationaleText ? { rationale: rationaleText } : {}),
    ...(examplesText ? { examples: examplesText } : {}),
  };
  return { ok: true, value, diagnostics: [] };
}
