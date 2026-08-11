import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import type { ProjectId } from "../src/contracts/identifiers.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { createNodeProjectWriter, nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import type { ProjectWriter } from "../src/platform/project-writer.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";
import {
  createApprovalEvidence,
  MAX_APPROVAL_TEXT_BYTES,
  serializeApprovalEvidence,
} from "../src/proposal/approval-evidence.ts";
import { parseProposalPackage } from "../src/proposal/package-input.ts";
import type { ProposalPackage } from "../src/proposal/validate-proposal.ts";
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
  readonly bundle: string;
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

async function fixture(mode: "spec-code" | "code" = "spec-code"): Promise<Fixture> {
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
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  const candidate = await mkdtemp(join(tmpdir(), "sdd-approval-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  const candidateFile = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(candidateFile, (await readFile(candidateFile, "utf8")).replace("one item", "each item once"));
  const bundle = `.sdd/staging/${mode}-bundle`;
  const materialize = [
    "proposal",
    "materialize",
    "--mode",
    mode,
    "--base",
    base,
    ...(mode === "code" ? ["--code-target", "REQ-A1000001"] : ["--candidate", candidate]),
    "--bundle",
    bundle,
    "--format",
    "json",
  ];
  const retained = await execute(materialize, root);
  assert.equal(retained.exitCode, 0, JSON.stringify(retained.value));
  const displayed = await execute(["proposal", "validate", "--bundle", bundle, "--format", "json"], root);
  assert.equal(displayed.exitCode, 0, JSON.stringify(displayed.value));
  assert.deepEqual(displayed.value.result, retained.value.result.proposal);
  const packageValue = parseProposalPackage(
    JSON.parse(await readFile(join(root, bundle, "proposal-package.json"), "utf8")),
  );
  return { root, candidate, bundle, packageValue, projectId: packageValue.project_id };
}

function command(value: Fixture, decision: "approved" | "rejected", evidence = ".sdd/staging/approval.json") {
  return [
    "approval",
    "record",
    "--bundle",
    value.bundle,
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
    producer: { name: "sdd", version: "0.5.1" },
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
});

test("REQ-32C76ED3 records approved and rejected exact displayed subjects for spec-code and code bundles", async () => {
  for (const mode of ["spec-code", "code"] as const) {
    const value = await fixture(mode);
    for (const [decision, target] of [
      ["approved", `.sdd/staging/${mode}-approved.json`],
      ["rejected", `.sdd/staging/${mode}-rejected.json`],
    ] as const) {
      const result = await execute(command(value, decision, target), value.root);
      assert.equal(result.exitCode, 0, JSON.stringify(result.value));
      assert.deepEqual(result.value.result, {
        evidence_path: target,
        decision,
        mode,
        subject: value.packageValue,
      });
      const evidence = JSON.parse(await readFile(join(value.root, target), "utf8"));
      assert.equal(evidence.project_id, value.projectId);
      assert.equal(evidence.reason, "I explicitly approve.\nKeep this line.\n");
      assert.equal(evidence.mode, mode);
    }
  }
});

test("REQ-32C76ED3 rejects stale and tampered retained bundles without evidence", async () => {
  const stale = await fixture();
  const manifestPath = join(stale.root, stale.bundle, "candidate-tree.json");
  await writeFile(manifestPath, (await readFile(manifestPath, "utf8")).replace("each item once", "after drift"));
  const staleResult = await execute(command(stale, "approved"), stale.root);
  assert.equal(staleResult.exitCode, 1, JSON.stringify(staleResult.value));
  await assert.rejects(readFile(join(stale.root, ".sdd/staging/approval.json")), /ENOENT/u);

  const tampered = await fixture("code");
  await writeFile(join(tampered.root, tampered.bundle, "proposal-package.json"), "{}\n");
  const tamperedResult = await execute(command(tampered, "approved"), tampered.root);
  assert.equal(tamperedResult.exitCode, 3, JSON.stringify(tamperedResult.value));
  assert.equal(tamperedResult.value.diagnostics[0].code, "SDD_APPROVAL_PACKAGE_INVALID");
  await assert.rejects(readFile(join(tampered.root, ".sdd/staging/approval.json")), /ENOENT/u);
});

test("REQ-32C76ED3 rejects unsafe, malformed, reason, evidence, and publication failures without evidence", async () => {
  const malformed = await fixture();
  const noBundle = await execute(
    command(malformed, "approved").map((value) => (value === malformed.bundle ? ".sdd/staging/missing" : value)),
    malformed.root,
  );
  assert.notEqual(noBundle.exitCode, 0, JSON.stringify(noBundle.value));
  await assert.rejects(readFile(join(malformed.root, ".sdd/staging/approval.json")), /ENOENT/u);

  const invalidReason = await fixture();
  await writeFile(join(invalidReason.root, ".sdd/staging/reason.txt"), new Uint8Array([0xc3, 0x28]));
  const reasonResult = await execute(command(invalidReason, "approved"), invalidReason.root);
  assert.equal(reasonResult.exitCode, 3, JSON.stringify(reasonResult.value));
  assert.equal(reasonResult.value.diagnostics[0].code, "SDD_APPROVAL_REASON_NOT_UTF8");
  await assert.rejects(readFile(join(invalidReason.root, ".sdd/staging/approval.json")), /ENOENT/u);

  const unsafe = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "sdd-approval-outside-"));
  await symlink(outside, join(unsafe.root, ".sdd/staging/link"));
  const unsafeResult = await execute(command(unsafe, "approved", ".sdd/staging/link/approval.json"), unsafe.root);
  assert.equal(unsafeResult.exitCode, 3, JSON.stringify(unsafeResult.value));
  await assert.rejects(readFile(join(unsafe.root, ".sdd/staging/link/approval.json")), /ENOENT/u);

  const existing = await fixture();
  await writeFile(join(existing.root, ".sdd/staging/approval.json"), "keep\n");
  const existingResult = await execute(command(existing, "approved"), existing.root);
  assert.equal(existingResult.exitCode, 3, JSON.stringify(existingResult.value));
  assert.equal(await readFile(join(existing.root, ".sdd/staging/approval.json"), "utf8"), "keep\n");

  const interrupted = await fixture();
  const writer = createNodeProjectWriter({
    phaseHook: async (phase) => {
      if (phase === "after-replacement") throw new Error("simulated interruption");
    },
  });
  const interruptedResult = await execute(command(interrupted, "approved"), interrupted.root, writer);
  assert.equal(interruptedResult.exitCode, 3, JSON.stringify(interruptedResult.value));
  await assert.rejects(readFile(join(interrupted.root, ".sdd/staging/approval.json")), /ENOENT/u);
});
