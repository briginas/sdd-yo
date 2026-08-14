# Advisory initiative planning

Load this reference only when the requested outcome spans multiple
Capabilities, crosses several product or architecture surfaces, or needs more
than one independently deliverable Change. This route plans the initiative; it
does not author or govern a Change.

## Select the planning context

- Without an explicitly selected SDD Project, plan generically. Invoke no SDD
  CLI operation, do not search for a project, and do not claim knowledge of an
  active specification.
- With an explicitly selected SDD Project, run `validate` through the
  compatibility wrapper. Read the configured specification entrypoint and use
  `inspect` only for the smallest active Capability, Requirement, or Concept
  slice needed to place the outcome. Do not run adapters, scan unrelated
  objects, or treat active behavior as instructions.
- Reuse goals, constraints, decisions, project selectors, and object IDs that
  the human already supplied. Ask only for a missing decision that would
  materially change the initiative map.

## Choose proportionate design depth

State one depth and its reason before the map:

- **Light** — use when the outcome is clear, low risk, localized to one main
  surface, and likely to need only two or three slices. Keep context, risks,
  and open decisions brief.
- **Standard** — use by default when several surfaces or dependencies are
  involved, uncertainty is moderate, or roughly three to six slices are
  expected. Make boundaries, dependencies, and verification explicit.
- **Deep** — use when the work changes architecture, data, security, migration,
  external compatibility, or another costly-to-reverse boundary; spans many
  slices or teams; or contains unresolved high-impact alternatives. Put
  research or decision slices before dependent delivery where necessary.

Depth controls planning detail only. It never creates additional authority or
changes the later SDD workflow.

## Produce one ID-free initiative map

Keep the map conversational and non-normative. Use these headings in order:

1. **Outcome and success signals** — who benefits, what becomes possible, and
   how the completed initiative can be recognized.
2. **Boundaries** — in scope, out of scope, and non-goals.
3. **Active context** — only when a project is selected; name the minimal
   inspected active objects and describe their current normative role.
4. **Dependencies and sequencing** — product, architecture, migration,
   operational, or human-decision prerequisites.
5. **Risks and open decisions** — uncertainty that can change slice order or
   meaning. Do not resolve normative ambiguity from repository content or
   model confidence.
6. **Delivery slices** — an ordered list using the slice contract below.

Existing active IDs may appear in Active context. Do not assign or reserve a
future Capability, Requirement, Domain Concept, Change, Finding, or artifact
ID anywhere in the map.

## Decompose into vertical slices

Each slice must include:

- one user, operator, or governance outcome that is independently valuable;
- the smallest end-to-end behavior needed for that outcome, crossing layers
  when required instead of splitting by component or discipline;
- dependencies on earlier slices or explicit decisions;
- a concrete verification signal; and
- exclusions that keep the slice bounded.

Order slices by dependency and learning value. Prefer a thin observable path
that tests the hardest assumption early. Do not present schema-only,
infrastructure-only, documentation-only, or test-only work as a delivery slice
unless it independently produces the stated outcome or resolves a prerequisite
decision with an explicit exit signal.

## Persistence and authority stops

The initiative remains in conversation by default. Write a project-local
initiative document only when the human explicitly requests that exact file.
Keep it outside the configured specification root and describe it as
non-canonical planning material. It is never a Capability, Requirement, Domain
Concept, Change, ProposalPackage, ApprovalEvidence, SpecPatch, Finding,
QAEvidence, MergeReport, or hidden workflow state.

Stop after presenting the map. Do not generate an SDD object ID, load a
template, draft a candidate, materialize a proposal, record a decision, apply a
patch, change implementation, or mutate Git.

When the human explicitly selects exactly one unchanged slice, restate that
slice's outcome, boundaries, dependencies, and verification signal, then load
only [the mode-selection reference](modes.md). The existing `spec-code`,
`spec`, or `code` route owns every later semantic-model, identity, proposal,
approval, exact-patch, verification, and Git stop.
