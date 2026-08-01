import assert from "node:assert/strict";
import test from "node:test";

import { isGitObjectId, isObjectId, isProjectId, isProjectPath } from "../src/contracts/identifiers.ts";
import { buildCanonicalHistoryIndex, HistoryIndexError } from "../src/ids/history-index.ts";
import type { GitObjectId } from "../src/contracts/identifiers.ts";
import type { GitReader, GitTreeEntry } from "../src/platform/git-reader.ts";

const encoder = new TextEncoder();

function config(projectId: string): string {
  return `schema_version: 1
project_id: ${projectId}
spec:
  root: spec
  entrypoint: spec/README.md
adoption:
  mode: incremental
git:
  default_target_ref: main
ids:
  suffix_length: 8
  alphabet: hex-uppercase
tests:
  adapters: []
evidence:
  allowed_issuers: []
`;
}

function index(capability?: string): string {
  return `---
sdd:
  type: index
---

# Specification

## Capabilities <!-- sdd:capabilities -->

${capability === undefined ? "" : `- [${capability} — Historical](capabilities/historical.md)\n`}
## Domain concepts <!-- sdd:concepts -->
`;
}

function capability(id: string): string {
  return `---
sdd:
  type: capability
  id: ${id}
---

# Historical

## Purpose <!-- sdd:purpose -->

Reserve one historical identity.
`;
}

function entry(pathValue: string, objectIdValue: string): GitTreeEntry {
  assert.ok(isProjectPath(pathValue));
  assert.ok(isGitObjectId(objectIdValue));
  return { path: pathValue, kind: "file", objectId: objectIdValue };
}

function fakeReader(
  snapshots: Readonly<Record<string, Readonly<Record<string, string>>>>,
  status: "complete" | "incomplete" = "complete",
): GitReader {
  const revisions = Object.keys(snapshots);
  const blobs = new Map<string, string>();
  for (const [revision, files] of Object.entries(snapshots)) {
    for (const [index, [path, source]] of Object.entries(files).entries()) {
      blobs.set(`${revision}-object-${index}`, source);
    }
  }
  return {
    repositoryRoot: "/repo",
    resolveRevision: async () => revisions[0] as GitObjectId,
    findMergeBase: async () => undefined,
    historyStatus: async () => status,
    listReachableRevisions: async () => revisions as GitObjectId[],
    listEntriesAt: async (revision) =>
      Object.keys(snapshots[revision] ?? {}).map((path, index) => entry(path, `${revision}-object-${index}`)),
    listFilesAt: async () => [],
    readBlob: async (objectId) => {
      const source = blobs.get(objectId);
      if (source === undefined) throw new Error("Unknown fake blob.");
      return encoder.encode(source);
    },
    readFileAt: async (revision, path) => {
      const source = snapshots[revision]?.[path];
      return source === undefined ? undefined : encoder.encode(source);
    },
  };
}

test("REQ-2C8E8085 REQ-8B656FC5 indexes active and reserved typed IDs across project moves", async () => {
  const projectIdValue: unknown = "SDD-A1000001";
  const capabilityIdValue: unknown = "CAP-A1000001";
  assert.ok(isProjectId(projectIdValue));
  assert.ok(isObjectId(capabilityIdValue));
  const reader = fakeReader({
    tip: {
      "new/.sdd/config.yaml": config(projectIdValue),
      "new/spec/README.md": index(),
      "other/.sdd/config.yaml": config("SDD-B2000002"),
    },
    old: {
      "old/.sdd/config.yaml": config(projectIdValue),
      "old/spec/README.md": index(capabilityIdValue),
      "old/spec/capabilities/historical.md": capability(capabilityIdValue),
    },
  });
  const tipValue: unknown = "tip";
  assert.ok(isGitObjectId(tipValue));
  const history = await buildCanonicalHistoryIndex(reader, tipValue, projectIdValue);
  assert.equal(history.status, "complete");
  assert.deepEqual([...history.activeObjectIds], []);
  assert.deepEqual([...history.reservedObjectIds], [capabilityIdValue]);
  assert.deepEqual([...history.reservedProjectIds].toSorted(), ["SDD-A1000001", "SDD-B2000002"]);
});

test("REQ-8B656FC5 preserves incomplete status and rejects untrustworthy reachable graphs", async () => {
  const projectIdValue: unknown = "SDD-A1000001";
  const tipValue: unknown = "tip";
  assert.ok(isProjectId(projectIdValue));
  assert.ok(isGitObjectId(tipValue));
  const incomplete = await buildCanonicalHistoryIndex(
    fakeReader({ tip: { ".sdd/config.yaml": config(projectIdValue), "spec/README.md": index() } }, "incomplete"),
    tipValue,
    projectIdValue,
  );
  assert.equal(incomplete.status, "incomplete");

  const malformed = fakeReader({
    tip: { ".sdd/config.yaml": config(projectIdValue), "spec/README.md": "not a specification\n" },
  });
  await assert.rejects(
    buildCanonicalHistoryIndex(malformed, tipValue, projectIdValue),
    (error) => error instanceof HistoryIndexError,
  );
});

test("REQ-BFC18F28 rejects duplicate selected project IDs in one reachable tree", async () => {
  const projectIdValue: unknown = "SDD-A1000001";
  const tipValue: unknown = "tip";
  assert.ok(isProjectId(projectIdValue));
  assert.ok(isGitObjectId(tipValue));
  const duplicate = fakeReader({
    tip: {
      "first/.sdd/config.yaml": config(projectIdValue),
      "first/spec/README.md": index(),
      "second/.sdd/config.yaml": config(projectIdValue),
      "second/spec/README.md": index(),
    },
  });
  await assert.rejects(
    buildCanonicalHistoryIndex(duplicate, tipValue, projectIdValue),
    (error) => error instanceof HistoryIndexError,
  );
});
