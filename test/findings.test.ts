import assert from "node:assert/strict";
import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { isFingerprint, isObjectId, isProjectId, isProjectPath } from "../src/contracts/identifiers.ts";
import type { Fingerprint, ObjectId, ProjectId, ProjectPath } from "../src/contracts/identifiers.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { EvidenceInputError } from "../src/verification/evidence.ts";
import type { EvidenceInputLimits } from "../src/verification/evidence.ts";
import {
  assessFindings,
  deriveFindingId,
  importFindingFile,
  importFindingResolutionFile,
  importHumanSemanticReviewEvidenceFile,
  importSemanticAnalysisInputManifestFile,
  parseFinding,
  parseFindingResolution,
  parseHumanSemanticReviewEvidence,
  parseSemanticAnalysisInputManifest,
  sortFindingsForReview,
} from "../src/verification/findings.ts";
import type {
  Finding,
  FindingResolution,
  HumanSemanticReviewEvidence,
  ParsedSemanticAnalysisInputManifest,
} from "../src/verification/findings.ts";
import { fingerprintSemanticAnalysisInputManifest } from "../src/verification/semantic-review.ts";

const limits: EvidenceInputLimits = {
  max_artifact_bytes: 64 * 1024,
  max_array_items: 100,
  max_string_bytes: 16 * 1024,
  max_nesting_depth: 16,
};

function projectId(): ProjectId {
  const value: unknown = "SDD-A1000001";
  assert.ok(isProjectId(value));
  return value;
}

function fingerprint(character: string): Fingerprint {
  const value: unknown = `sha256:${character.repeat(64)}`;
  assert.ok(isFingerprint(value));
  return value;
}

function objectId(value: string): ObjectId {
  assert.ok(isObjectId(value));
  return value;
}

function manifest(): ParsedSemanticAnalysisInputManifest {
  const payload = {
    schema_version: "1.0" as const,
    artifact_type: "semantic_analysis_input_manifest" as const,
    project_id: projectId(),
    analyzer: { name: "semantic-review", version: "1.0" },
    changed_objects: [objectId("REQ-A1000001")],
    related_objects: [objectId("REQ-A1000002")],
    normative_sections: [
      { object_id: objectId("REQ-A1000001"), section: "statement" as const, content: "The first outcome applies." },
      { object_id: objectId("REQ-A1000002"), section: "acceptance" as const, content: '["The second passes."]' },
    ],
    candidate_reasons: [
      {
        objects: [objectId("REQ-A1000001"), objectId("REQ-A1000002")],
        reason: "requirement-dependency" as const,
      },
    ],
  };
  return { ...payload, input_fingerprint: fingerprintSemanticAnalysisInputManifest(payload) };
}

type FindingOverrides = Partial<
  Pick<
    Finding,
    | "project_id"
    | "analyzer"
    | "kind"
    | "severity"
    | "input_fingerprint"
    | "objects"
    | "sections"
    | "summary"
    | "confidence"
    | "waiver_eligible"
  >
>;

function finding(overrides: FindingOverrides = {}): Finding {
  const input = manifest();
  const payload = {
    schema_version: "1.0" as const,
    artifact_type: "finding" as const,
    project_id: input.project_id,
    analyzer: input.analyzer,
    kind: "semantic_conflict" as const,
    severity: "blocking" as const,
    input_fingerprint: input.input_fingerprint,
    objects: [objectId("REQ-A1000001")],
    sections: [{ object_id: objectId("REQ-A1000001"), section: "statement" as const }],
    summary: "The selected outcomes may conflict.",
    confidence: 0.8,
    waiver_eligible: false,
    ...overrides,
  };
  return { ...payload, finding_id: deriveFindingId(payload) };
}

function resolution(
  target: Finding,
  decision: FindingResolution["decision"] = "dismissed",
  overrides: Partial<FindingResolution> = {},
): FindingResolution {
  return {
    schema_version: "1.0",
    artifact_type: "finding_resolution",
    project_id: target.project_id,
    issuer: "architecture-review",
    actor: "user:1",
    finding_id: target.finding_id,
    input_fingerprint: target.input_fingerprint,
    decision,
    reason: "The human decision is explicit.",
    ...overrides,
  };
}

function humanReview(
  findingIds: readonly Finding["finding_id"][] = [],
  overrides: Partial<HumanSemanticReviewEvidence> = {},
): HumanSemanticReviewEvidence {
  const input = manifest();
  return {
    schema_version: "1.0",
    artifact_type: "human_semantic_review_evidence",
    project_id: input.project_id,
    issuer: "architecture-review",
    actor: "user:1",
    decision: "reviewed",
    candidate_input_fingerprint: input.input_fingerprint,
    finding_ids: findingIds,
    ...overrides,
  };
}

function bytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function assess(
  input: {
    findings?: readonly Finding[];
    resolutions?: readonly FindingResolution[];
    human_reviews?: readonly HumanSemanticReviewEvidence[];
    model_analysis_performed?: boolean;
  } = {},
) {
  return assessFindings({
    manifest: manifest(),
    findings: input.findings ?? [],
    resolutions: input.resolutions ?? [],
    human_reviews: input.human_reviews ?? [],
    model_analysis_performed: input.model_analysis_performed ?? true,
  });
}

test("REQ-A76942A0 strictly parses bounded manifests and evidence-backed Findings", () => {
  const inputManifest = manifest();
  assert.deepEqual(parseSemanticAnalysisInputManifest(bytes(inputManifest), limits), inputManifest);
  const current = finding();
  assert.deepEqual(parseFinding(bytes(current), limits), current);
  assert.throws(
    () => parseFinding(bytes({ ...current, unknown: true }), limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_INVALID",
  );
  assert.throws(
    () => parseFinding(bytes(current), { ...limits, max_artifact_bytes: 1 }),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_LIMIT_EXCEEDED",
  );
  assert.throws(
    () => parseSemanticAnalysisInputManifest(bytes({ ...inputManifest, input_fingerprint: fingerprint("f") }), limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_ARTIFACT_INVALID",
  );
});

test("REQ-A76942A0 REQ-ADF9965A imports only project-scoped finding-family artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "sdd-findings-project-"));
  const outside = await mkdtemp(join(tmpdir(), "sdd-findings-outside-"));
  const current = finding();
  const values = {
    "manifest.json": manifest(),
    "finding.json": current,
    "resolution.json": resolution(current),
    "review.json": humanReview([current.finding_id]),
  } as const;
  for (const [path, value] of Object.entries(values)) await writeFile(join(root, path), bytes(value));
  await writeFile(join(outside, "finding.json"), bytes(current));
  const manifestPath: ProjectPath = "manifest.json" as ProjectPath;
  const findingPath: ProjectPath = "finding.json" as ProjectPath;
  const resolutionPath: ProjectPath = "resolution.json" as ProjectPath;
  const reviewPath: ProjectPath = "review.json" as ProjectPath;
  assert.ok([manifestPath, findingPath, resolutionPath, reviewPath].every(isProjectPath));
  assert.equal(
    (await importSemanticAnalysisInputManifestFile(nodeFileSystem, root, manifestPath, limits)).artifact_type,
    "semantic_analysis_input_manifest",
  );
  assert.equal((await importFindingFile(nodeFileSystem, root, findingPath, limits)).artifact_type, "finding");
  assert.equal(
    (await importFindingResolutionFile(nodeFileSystem, root, resolutionPath, limits)).artifact_type,
    "finding_resolution",
  );
  assert.equal(
    (await importHumanSemanticReviewEvidenceFile(nodeFileSystem, root, reviewPath, limits)).artifact_type,
    "human_semantic_review_evidence",
  );
  const escape: ProjectPath = "escape.json" as ProjectPath;
  await symlink(join(outside, "finding.json"), join(root, escape));
  await assert.rejects(
    importFindingFile(nodeFileSystem, root, escape, limits),
    (error) => error instanceof EvidenceInputError && error.code === "SDD_EVIDENCE_FILE_OUT_OF_SCOPE",
  );
});

test("REQ-A76942A0 rejects nondeterministic IDs and non-manifest citations", () => {
  const current = finding();
  const wrongId = { ...current, finding_id: "FND-1234ABCDEF12" as Finding["finding_id"] };
  assert.equal(assess({ findings: [wrongId] }).findings[0]?.state, "contradictory");
  const wrongCitation = finding({
    objects: [objectId("REQ-A1000002")],
    sections: [{ object_id: objectId("REQ-A1000002"), section: "statement" }],
  });
  assert.equal(assess({ findings: [wrongCitation] }).findings[0]?.state, "contradictory");

  const lowerConfidence = finding({ kind: "quality", severity: "review", confidence: 0.2, waiver_eligible: true });
  const higherConfidence = finding({ kind: "quality", severity: "review", confidence: 0.9, waiver_eligible: true });
  assert.deepEqual(
    sortFindingsForReview([lowerConfidence, higherConfidence]).map((item) => item.confidence),
    [0.9, 0.2],
  );
  assert.equal(assess({ findings: [lowerConfidence] }).findings[0]?.state, "open");
  assert.equal(assess({ findings: [higherConfidence] }).findings[0]?.state, "open");
});

test("REQ-20AAA622 resolves only current dismissed or eligible waived findings and blocks confirmation", () => {
  const current = finding();
  assert.equal(assess({ findings: [current] }).findings[0]?.state, "open");
  assert.equal(assess({ findings: [current], resolutions: [resolution(current)] }).findings[0]?.state, "resolved");
  assert.ok(
    assess({ findings: [current], resolutions: [resolution(current, "confirmed")] }).issues.some(
      (issue) => issue.code === "SDD_FINDING_CONFIRMED" && issue.disposition === "BLOCKED",
    ),
  );
  const quality = finding({ kind: "quality", severity: "review", waiver_eligible: true });
  assert.equal(
    assess({ findings: [quality], resolutions: [resolution(quality, "waived")] }).findings[0]?.state,
    "resolved",
  );
});

test("REQ-FB66E5D6 REQ-ADF9965A rejects semantic waivers and stale or contradictory resolutions", () => {
  const current = finding();
  const waiver = assess({ findings: [current], resolutions: [resolution(current, "waived")] });
  assert.equal(waiver.findings[0]?.state, "contradictory");
  assert.ok(waiver.issues.some((issue) => issue.code === "SDD_FINDING_WAIVER_INELIGIBLE"));

  const stale = assess({
    findings: [current],
    resolutions: [resolution(current, "dismissed", { input_fingerprint: fingerprint("a") })],
  });
  assert.equal(stale.findings[0]?.state, "stale");

  const contradictory = assess({
    findings: [current],
    resolutions: [resolution(current, "dismissed"), resolution(current, "confirmed")],
  });
  assert.equal(contradictory.findings[0]?.state, "contradictory");
});

test("REQ-18F84CE2 REQ-2AF962EB requires current human review when optional model analysis is absent", () => {
  const missing = assess({ model_analysis_performed: false });
  assert.equal(missing.human_review_state, "missing");
  assert.ok(
    missing.issues.some(
      (issue) => issue.code === "SDD_SEMANTIC_REVIEW_REQUIRED" && issue.disposition === "REVIEW_REQUIRED",
    ),
  );
  const reviewed = assess({ model_analysis_performed: false, human_reviews: [humanReview()] });
  assert.equal(reviewed.human_review_state, "current");
  assert.equal(reviewed.semantic_completeness_claimed, false);
});

test("REQ-2AF962EB rejects stale or contradictory human review without completeness claims", () => {
  const stale = assess({
    model_analysis_performed: false,
    human_reviews: [humanReview([], { candidate_input_fingerprint: fingerprint("b") })],
  });
  assert.equal(stale.human_review_state, "stale");
  const current = finding();
  const incomplete = assess({
    findings: [current],
    model_analysis_performed: false,
    human_reviews: [humanReview([])],
  });
  assert.equal(incomplete.human_review_state, "stale");

  const contradictory = assess({
    findings: [current],
    model_analysis_performed: true,
    human_reviews: [humanReview([]), humanReview([current.finding_id])],
  });
  assert.equal(contradictory.human_review_state, "contradictory");
  assert.equal(contradictory.semantic_completeness_claimed, false);
});

test("REQ-A76942A0 REQ-20AAA622 strictly parses resolution and human-review decisions", () => {
  const current = finding();
  assert.deepEqual(parseFindingResolution(bytes(resolution(current)), limits), resolution(current));
  assert.deepEqual(
    parseHumanSemanticReviewEvidence(bytes(humanReview([current.finding_id])), limits),
    humanReview([current.finding_id]),
  );
});
