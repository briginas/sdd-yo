---
sdd:
  type: index
---

# SDD Yo Product Specification

SDD Yo governs a repository-native graph of product capabilities,
requirements, and domain concepts. It combines a deterministic local CLI with
an optional agent skill while leaving approvals, QA identity, branch creation,
and merge enforcement to external processes.

## Capabilities <!-- sdd:capabilities -->

- [CAP-0B417FC4 — Project initialization and adoption](capabilities/project-initialization-and-adoption.md)
- [CAP-79E22870 — Specification model and authoring](capabilities/specification-model-and-authoring.md)
- [CAP-CB22A5A3 — Proposal modes and workflow gates](capabilities/proposal-modes-and-workflow-gates.md)
- [CAP-E309CBCB — Validation, fingerprints, and exact patches](capabilities/validation-fingerprints-and-patches.md)
- [CAP-15DBC157 — Test traceability and QA evidence](capabilities/test-traceability-and-qa.md)
- [CAP-F31EF876 — Semantic review and conflict analysis](capabilities/semantic-review-and-conflicts.md)
- [CAP-205F5DBC — Merge readiness](capabilities/merge-readiness.md)
- [CAP-404305F6 — Multi-project CLI and skill integration](capabilities/multi-project-cli-and-skill.md)

## Domain concepts <!-- sdd:concepts -->

- [CON-EA57C937 — SDD Project](concepts/sdd-project.md)
- [CON-77D857DB — Document](concepts/document.md)
- [CON-2C550D5B — Capability](concepts/capability.md)
- [CON-9F69CC0E — Requirement](concepts/requirement.md)
- [CON-88F1C731 — Domain Concept](concepts/domain-concept.md)
- [CON-3E620A28 — Change](concepts/change.md)
- [CON-FC16381E — Fingerprint](concepts/fingerprint.md)
- [CON-4365C0F6 — Evidence](concepts/evidence.md)
- [CON-E2F84A01 — Finding](concepts/finding.md)
- [CON-90AFB19E — Test Adapter](concepts/test-adapter.md)

## Specification boundary

This specification defines observable product behavior. Implementation
boundaries, schemas, algorithms, trust controls, and delivery guidance are
described in the sibling [architecture set](../architecture/README.md).

