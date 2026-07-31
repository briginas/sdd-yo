import type { CapabilityId, ConceptId, ProjectPath, RequirementId } from "../contracts/identifiers.ts";

export const DOCUMENT_TYPES = ["index", "capability", "capability-fragment", "concept"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const REQUIREMENT_KINDS = ["behavior", "invariant", "constraint", "quality"] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];
export const VERIFICATION_MODES = ["automated", "manual"] as const;
export type VerificationMode = (typeof VERIFICATION_MODES)[number];
export type SourcePosition = { readonly line: number; readonly column: number };
export type MarkdownLink = { readonly label: string; readonly target: string; readonly position: SourcePosition };
export type RequirementRelation = {
  readonly type: "refers-to" | "depends-on";
  readonly target_id: RequirementId | ConceptId;
  readonly link: MarkdownLink;
};
export type ConceptRelation = {
  readonly type: "relates-to";
  readonly target_id: ConceptId;
  readonly link: MarkdownLink;
};
export type Requirement = {
  readonly id: RequirementId;
  readonly anchor: string;
  readonly title: string;
  readonly kind: RequirementKind;
  readonly verification: VerificationMode;
  readonly owner: CapabilityId;
  readonly statement: string;
  readonly acceptance: readonly string[];
  readonly constraints: readonly string[];
  readonly relations: readonly RequirementRelation[];
  readonly rationale?: string;
  readonly examples?: string;
  readonly position: SourcePosition;
};
type BaseDocument = { readonly path: ProjectPath; readonly title: string };
export type IndexDocument = BaseDocument & {
  readonly type: "index";
  readonly capabilities: readonly MarkdownLink[];
  readonly concepts: readonly MarkdownLink[];
};
export type CapabilityDocument = BaseDocument & {
  readonly type: "capability";
  readonly id: CapabilityId;
  readonly purpose?: string;
  readonly fragments: readonly MarkdownLink[];
  readonly requirements: readonly Requirement[];
};
export type CapabilityFragmentDocument = BaseDocument & {
  readonly type: "capability-fragment";
  readonly capability: CapabilityId;
  readonly requirements: readonly Requirement[];
};
export type ConceptDocument = BaseDocument & {
  readonly type: "concept";
  readonly id: ConceptId;
  readonly definition: string;
  readonly identity?: string;
  readonly states: readonly string[];
  readonly relations: readonly ConceptRelation[];
  readonly rationale?: string;
  readonly examples?: string;
};
export type SpecificationDocument = IndexDocument | CapabilityDocument | CapabilityFragmentDocument | ConceptDocument;
