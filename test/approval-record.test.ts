import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { resolveProject } from "../src/config/resolve-project.ts";
import type { GitObjectId, ProjectId } from "../src/contracts/identifiers.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { createNodeProjectWriter, nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import type { ProjectWriter } from "../src/platform/project-writer.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";
import { discoverProcessGitReader } from "../src/platform/process-git-reader.ts";
import {
  createApprovalEvidence,
  MAX_APPROVAL_TEXT_BYTES,
  serializeApprovalEvidence,
} from "../src/proposal/approval-evidence.ts";
import type { ProposalPackage } from "../src/proposal/validate-proposal.ts";
import { validateProposal } from "../src/proposal/validate-proposal.ts";
import { parseApprovalEvidence } from "../src/verification/evidence.ts";

const executeFile = promisify(execFile);

const indexSource = `---
sdd:
  type: index
---
# Approval test

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Delivery](capabilities/delivery.md)

## Domain concepts <!-- sdd:concepts -->
`;

const capabilitySource = `---
sdd:
  type: capability
  id: CAP-A1000001
---

# Delivery

## Purpose <!-- sdd:purpose -->

Deliver safely.

<a id="req-a1000001"></a>

## REQ-A1000001 — Deliver item

\`\`\`sdd
kind: behavior
verification: automated
\`\`\`

### Relations <!-- sdd:relations -->

### Statement <!-- sdd:statement -->

The system shall deliver one item.

### Acceptance criteria <!-- sdd:acceptance -->

- Delivery is observable.
`;

type Fixture = {
  readonly root: string;
  readonly candidate: string;
  readonly packageValue: ProposalPackage;
  readonly projectId: ProjectId;
};

async function execute(argv: readonly string[], cwd: string, projectWriter: ProjectWriter = nodeProjectWriter) {
  const standardOutput: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: cwd,
    fileSystem: nodeFileSystem,
    projectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (message) => standardOutput.push(message),
    writeStandardError: () => {},
    writeOutputFile: () => {
      throw new Error("Unexpected output write.");
    },
  });
  return { exitCode, value: JSON.parse(standardOutput.join("")) as any };
}

async function fixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "sdd-approval-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await execute(["init", "--format", "json"], root)).exitCode, 0);
  await writeFile(join(root, "spec/README.md"), indexSource);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capabilitySource);
  await writeFile(join(root, ".gitignore"), "/.sdd/staging/\n");
  await mkdir(join(root, ".sdd/staging"), { recursive: true });
  await writeFile(join(root, ".sdd/staging/reason.txt"), "I explicitly approve.\nKeep this line.\n");
  await executeFile("git", ["add", ".sdd/config.yaml", ".gitignore", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim() as GitObjectId;
  const selected = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: root });
  assert.equal(selected.ok, true);
  if (!selected.ok) throw new Error("Project selection failed.");
  const candidate = await mkdtemp(join(tmpdir(), "sdd-approval-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  const candidateFile = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(candidateFile, (await readFile(candidateFile, "utf8")).replace("one item", "each item once"));
  const reader = await discoverProcessGitReader(nodeProcessRunner, root);
  const packageValue = await validateProposal({
    fileSystem: nodeFileSystem,
    gitReader: reader,
    project: selected.value,
    baseRef: base,
    candidatePath: candidate,
    mode: "spec-code",
    codeTargets: [],
  });
  await writeFile(join(root, ".sdd/staging/package.json"), JSON.stringify(packageValue));
  return { root, candidate, packageValue, projectId: selected.value.configuration.project_id };
}

function command(value: Fixture, decision: "approved" | "rejected", evidence = ".sdd/staging/approval.json") {
  return [
    "approval",
    "record",
    "--package",
    ".sdd/staging/package.json",
    "--candidate",
    value.candidate,
    "--issuer",
    "product-review",
    "--actor",
    "Ivan Briginas",
    "--decision",
    decision,
    "--reason",
    ".sdd/staging/reason.txt",
    "--evidence",
    evidence,
    "--format",
    "json",
  ] as const;
}

test("REQ-32C76ED3 REQ-F7D39246 pure ApprovalEvidence construction preserves the exact message and canonical bytes", async () => {
  const value = await fixture();
  const evidence = createApprovalEvidence({
    projectId: value.projectId,
    package: value.packageValue,
    issuer: "product-review",
    actor: "Ivan Briginas",
    decision: "approved",
    reason: " exact message \n",
    producer: { name: "sdd", version: "0.2.0" },
  });
  const bytes = serializeApprovalEvidence(evidence);
  assert.equal(new TextDecoder().decode(bytes), `${JSON.stringify(evidence)}\n`);
  assert.equal(
    parseApprovalEvidence(bytes, {
      max_artifact_bytes: 1024 * 1024,
      max_array_items: 10,
      max_string_bytes: MAX_APPROVAL_TEXT_BYTES,
      max_nesting_depth: 8,
    }).reason,
    " exact message \n",
  );
  assert.equal("created_at" in evidence, false);
  assert.throws(
    () => serializeApprovalEvidence({ ...evidence, reason: "\u0001".repeat(MAX_APPROVAL_TEXT_BYTES) }),
    (error) => error instanceof Error && "code" in error && error.code === "SDD_APPROVAL_ARTIFACT_LIMIT_EXCEEDED",
  );
});

test("REQ-32C76ED3 REQ-F7D39246 records approved and rejected decisions with exact derived subjects", async () => {
  const value = await fixture();
  for (const [decision, target] of [
    ["approved", ".sdd/staging/approved.json"],
    ["rejected", ".sdd/staging/rejected.json"],
  ] as const) {
    const result = await execute(command(value, decision, target), value.root);
    assert.equal(result.exitCode, 0, JSON.stringify(result.value));
    assert.deepEqual(result.value.result, {
      evidence_path: target,
      decision,
      mode: value.packageValue.mode,
      subject: {
        base_ref: value.packageValue.base.git_ref,
        semantic_delta_fingerprint: value.packageValue.object_delta.semantic_fingerprint,
        structural_delta_fingerprint: value.packageValue.object_delta.structural_fingerprint,
      },
    });
    const evidence = JSON.parse(await readFile(join(value.root, target), "utf8"));
    assert.equal(evidence.project_id, value.projectId);
    assert.deepEqual(evidence.producer, { name: "sdd", version: "0.2.0" });
    assert.equal(evidence.actor, "Ivan Briginas");
    assert.equal(evidence.reason, "I explicitly approve.\nKeep this line.\n");
    assert.equal("created_at" in evidence, false);
  }
});

test("REQ-32C76ED3 REQ-7341DBB7 REQ-AFD65A03 blocks drift and mismatch while accepting issuer provenance", async () => {
  const drift = await fixture();
  await writeFile(
    join(drift.candidate, "spec/capabilities/delivery.md"),
    `${await readFile(join(drift.candidate, "spec/capabilities/delivery.md"), "utf8")}\nDrift.\n`,
  );
  const drifted = await execute(command(drift, "approved"), drift.root);
  assert.equal(drifted.exitCode, 1);
  assert.equal(drifted.value.diagnostics[0].code, "SDD_APPROVAL_PACKAGE_STALE");
  await assert.rejects(readFile(join(drift.root, ".sdd/staging/approval.json")), /ENOENT/u);

  const mismatch = await fixture();
  await writeFile(
    join(mismatch.root, ".sdd/staging/package.json"),
    JSON.stringify({ ...mismatch.packageValue, project_id: "SDD-A0000001" }),
  );
  const mismatched = await execute(command(mismatch, "approved"), mismatch.root);
  assert.equal(mismatched.exitCode, 1);
  assert.equal(mismatched.value.diagnostics[0].code, "SDD_APPROVAL_PACKAGE_PROJECT_MISMATCH");

  const issuer = await fixture();
  const unknown = await execute(
    command(issuer, "approved").map((argument) =>
      argument === "product-review" ? "repository-self-review" : argument,
    ),
    issuer.root,
  );
  assert.equal(unknown.exitCode, 0, JSON.stringify(unknown.value));
  const recorded = JSON.parse(await readFile(join(issuer.root, ".sdd/staging/approval.json"), "utf8"));
  assert.equal(recorded.issuer, "repository-self-review");
});

test("REQ-32C76ED3 rejects malformed and oversized inputs without evidence", async () => {
  const malformed = await fixture();
  await writeFile(join(malformed.root, ".sdd/staging/reason.txt"), new Uint8Array([0xc3, 0x28]));
  const notUtf8 = await execute(command(malformed, "approved"), malformed.root);
  assert.equal(notUtf8.exitCode, 3);
  assert.equal(notUtf8.value.diagnostics[0].code, "SDD_APPROVAL_REASON_NOT_UTF8");

  const oversized = await fixture();
  await writeFile(join(oversized.root, ".sdd/staging/reason.txt"), new Uint8Array(MAX_APPROVAL_TEXT_BYTES + 1));
  const tooLarge = await execute(command(oversized, "approved"), oversized.root);
  assert.equal(tooLarge.exitCode, 3);
  assert.equal(tooLarge.value.diagnostics[0].code, "SDD_APPROVAL_REASON_LIMIT_EXCEEDED");

  const invalidPackage = await fixture();
  await writeFile(join(invalidPackage.root, ".sdd/staging/package.json"), "{}\n");
  const malformedPackage = await execute(command(invalidPackage, "approved"), invalidPackage.root);
  assert.equal(malformedPackage.exitCode, 3);
  assert.equal(malformedPackage.value.diagnostics[0].code, "SDD_APPROVAL_PACKAGE_INVALID");
});

test("REQ-32C76ED3 rejects traversal, symlink, specification, non-ignored, and existing targets", async () => {
  const traversal = await fixture();
  const escaped = await execute(command(traversal, "approved", "../approval.json"), traversal.root);
  assert.equal(escaped.exitCode, 3);
  assert.equal(escaped.value.diagnostics[0].code, "SDD_APPROVAL_TARGET_PATH_INVALID");

  const linked = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "sdd-approval-outside-"));
  await symlink(outside, join(linked.root, ".sdd/staging/link"));
  const symlinked = await execute(command(linked, "approved", ".sdd/staging/link/approval.json"), linked.root);
  assert.equal(symlinked.exitCode, 3);
  assert.equal(symlinked.value.diagnostics[0].code, "SDD_APPROVAL_TARGET_UNSAFE");

  const specification = await fixture();
  const inSpec = await execute(command(specification, "approved", "spec/approval.json"), specification.root);
  assert.equal(inSpec.exitCode, 3);
  assert.equal(inSpec.value.diagnostics[0].code, "SDD_APPROVAL_TARGET_IN_SPEC");

  const visible = await fixture();
  await mkdir(join(visible.root, "evidence"));
  const notIgnored = await execute(command(visible, "approved", "evidence/approval.json"), visible.root);
  assert.equal(notIgnored.exitCode, 3);
  assert.equal(notIgnored.value.diagnostics[0].code, "SDD_APPROVAL_TARGET_NOT_IGNORED");

  const existing = await fixture();
  await writeFile(join(existing.root, ".sdd/staging/approval.json"), "keep\n");
  const occupied = await execute(command(existing, "approved"), existing.root);
  assert.equal(occupied.exitCode, 3);
  assert.equal(occupied.value.diagnostics[0].code, "SDD_APPROVAL_TARGET_EXISTS");
  assert.equal(await readFile(join(existing.root, ".sdd/staging/approval.json"), "utf8"), "keep\n");
});

test("REQ-32C76ED3 interrupted exclusive publication rolls back without evidence", async () => {
  const value = await fixture();
  const interrupted = createNodeProjectWriter({
    phaseHook: async (phase) => {
      if (phase === "after-replacement") throw new Error("simulated interruption");
    },
  });
  const result = await execute(command(value, "approved"), value.root, interrupted);
  assert.equal(result.exitCode, 3);
  assert.equal(result.value.diagnostics[0].code, "SDD_APPROVAL_WRITE_FAILED");
  await assert.rejects(readFile(join(value.root, ".sdd/staging/approval.json")), /ENOENT/u);
});
