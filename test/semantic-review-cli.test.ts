import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { runCli } from "../src/cli/run-cli.ts";
import { nodeFileSystem } from "../src/platform/node-filesystem.ts";
import { nodeProcessRunner } from "../src/platform/node-process-runner.ts";
import { nodeProjectWriter } from "../src/platform/node-project-writer.ts";
import { nodeRandomness } from "../src/platform/node-randomness.ts";

const executeFile = promisify(execFile);
const index = `---
sdd:
  type: index
---
# Review test

## Capabilities <!-- sdd:capabilities -->

- [CAP-A1000001 — Delivery](capabilities/delivery.md)

## Domain concepts <!-- sdd:concepts -->
`;
const capability = `---
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

async function cli(argv: readonly string[], root: string) {
  const output: string[] = [];
  const exitCode = await runCli({
    argv,
    workingDirectory: root,
    fileSystem: nodeFileSystem,
    projectWriter: nodeProjectWriter,
    randomness: nodeRandomness,
    processRunner: nodeProcessRunner,
    writeStandardOutput: (value) => output.push(value),
    writeStandardError: () => {},
    writeOutputFile: () => {
      throw new Error("Unexpected output file.");
    },
  });
  return { exitCode, value: JSON.parse(output.join("")) as any };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "sdd-semantic-review-cli-"));
  await executeFile("git", ["init", "--quiet", "--initial-branch", "main"], { cwd: root });
  await executeFile("git", ["config", "user.name", "SDD Test"], { cwd: root });
  await executeFile("git", ["config", "user.email", "sdd@example.invalid"], { cwd: root });
  assert.equal((await cli(["init", "--format", "json"], root)).exitCode, 0);
  await writeFile(join(root, "spec/README.md"), index);
  await writeFile(join(root, "spec/capabilities/delivery.md"), capability);
  await writeFile(join(root, ".gitignore"), "/.sdd/staging/\n");
  await mkdir(join(root, ".sdd/staging"), { recursive: true });
  await executeFile("git", ["add", ".sdd/config.yaml", ".gitignore", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
  const base = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  const candidate = await mkdtemp(join(tmpdir(), "sdd-semantic-review-candidate-"));
  await cp(join(root, ".sdd"), join(candidate, ".sdd"), { recursive: true });
  await cp(join(root, "spec"), join(candidate, "spec"), { recursive: true });
  const candidateFile = join(candidate, "spec/capabilities/delivery.md");
  await writeFile(candidateFile, (await readFile(candidateFile, "utf8")).replace("one item", "each item once"));
  const bundle = ".sdd/staging/bundle";
  const materialized = await cli(
    [
      "proposal",
      "materialize",
      "--mode",
      "spec-code",
      "--base",
      base,
      "--candidate",
      candidate,
      "--bundle",
      bundle,
      "--format",
      "json",
    ],
    root,
  );
  assert.equal(materialized.exitCode, 0, JSON.stringify(materialized.value));
  await executeFile("git", ["checkout", "--quiet", "-b", "change"], { cwd: root });
  await cp(join(candidate, "spec"), join(root, "spec"), { recursive: true, force: true });
  await executeFile("git", ["add", "spec"], { cwd: root });
  await executeFile("git", ["commit", "--quiet", "-m", "candidate"], { cwd: root });
  const proposal = (await executeFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  const packageValue = materialized.value.result.proposal;
  const change = ".sdd/staging/change.json";
  await writeFile(
    join(root, change),
    `${JSON.stringify({
      schema_version: "1.0",
      artifact_type: "change_descriptor",
      project_id: packageValue.project_id,
      mode: packageValue.mode,
      integration_ref: base,
      proposal_ref: proposal,
      approved_delta: {
        semantic: packageValue.object_delta.semantic_fingerprint,
        structural: packageValue.object_delta.structural_fingerprint,
      },
      code_targets: packageValue.code_targets,
    })}\n`,
  );
  return { root, bundle, change, proposal, base };
}

test("REQ-2AF962EB REQ-F7D39246 REQ-7C848ED0 materializes and records one exact current semantic-review subject", async () => {
  const value = await fixture();
  const manifest = ".sdd/staging/review-manifest.json";
  const materialized = await cli(
    [
      "semantic-review",
      "materialize",
      "--change",
      value.change,
      "--bundle",
      value.bundle,
      "--manifest",
      manifest,
      "--format",
      "json",
    ],
    value.root,
  );
  assert.equal(materialized.exitCode, 0, JSON.stringify(materialized.value));
  assert.equal(materialized.value.result.subject.proposal_head, value.proposal);
  assert.equal(materialized.value.result.subject.integration_ref, value.base);
  assert.deepEqual(materialized.value.result.findings, []);
  assert.deepEqual(JSON.parse(await readFile(join(value.root, manifest), "utf8")), materialized.value.result.manifest);

  const evidence = ".sdd/staging/human-review.json";
  const recorded = await cli(
    [
      "semantic-review",
      "record",
      "--change",
      value.change,
      "--bundle",
      value.bundle,
      "--input-manifest",
      manifest,
      "--issuer",
      "product-review",
      "--actor",
      "dev",
      "--decision",
      "reviewed",
      "--evidence",
      evidence,
      "--format",
      "json",
    ],
    value.root,
  );
  assert.equal(recorded.exitCode, 0, JSON.stringify(recorded.value));
  assert.deepEqual(recorded.value.result.subject, materialized.value.result.subject);
  assert.deepEqual(recorded.value.result.evidence.finding_ids, []);
  assert.equal(recorded.value.result.evidence.decision, "reviewed");
  assert.deepEqual(JSON.parse(await readFile(join(value.root, evidence), "utf8")), recorded.value.result.evidence);
});

test("REQ-E85A06C3 REQ-32C76ED3 rejects changed manifests and existing immutable targets", async () => {
  const value = await fixture();
  const manifest = ".sdd/staging/review-manifest.json";
  const first = await cli(
    [
      "semantic-review",
      "materialize",
      "--change",
      value.change,
      "--bundle",
      value.bundle,
      "--manifest",
      manifest,
      "--format",
      "json",
    ],
    value.root,
  );
  assert.equal(first.exitCode, 0, JSON.stringify(first.value));
  const collision = await cli(
    [
      "semantic-review",
      "materialize",
      "--change",
      value.change,
      "--bundle",
      value.bundle,
      "--manifest",
      manifest,
      "--format",
      "json",
    ],
    value.root,
  );
  assert.equal(collision.exitCode, 3);
  await writeFile(
    join(value.root, manifest),
    `${JSON.stringify({ ...first.value.result.manifest, changed_objects: [] })}\n`,
  );
  const evidence = ".sdd/staging/human-review.json";
  const stale = await cli(
    [
      "semantic-review",
      "record",
      "--change",
      value.change,
      "--bundle",
      value.bundle,
      "--input-manifest",
      manifest,
      "--issuer",
      "product-review",
      "--actor",
      "dev",
      "--decision",
      "reviewed",
      "--evidence",
      evidence,
      "--format",
      "json",
    ],
    value.root,
  );
  assert.notEqual(stale.exitCode, 0);
  await assert.rejects(readFile(join(value.root, evidence)), /ENOENT/u);
});
