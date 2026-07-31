import assert from "node:assert/strict";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, test } from "node:test";

import { isProjectPath, loadSpecificationDocuments, parseSpecificationDocument } from "../src/index.ts";
import type { FileSystem, FileSystemEntryKind, SpecificationDocument } from "../src/index.ts";

const fixtureRoot = join("fixtures", "v1", "markdown", "documents");
const nodeFileSystem: FileSystem = {
  readFile: async (path) => readFile(path),
  readDirectory: async (path) =>
    (await readdir(path, { withFileTypes: true })).map((entry) => ({
      name: entry.name,
      kind: (entry.isFile()
        ? "file"
        : entry.isDirectory()
          ? "directory"
          : entry.isSymbolicLink()
            ? "symbolic-link"
            : "other") as FileSystemEntryKind,
    })),
  metadata: async (path) => {
    const value = await stat(path);
    return { kind: value.isFile() ? "file" : value.isDirectory() ? "directory" : "other", size: value.size };
  },
  realPath: async (path) => realpath(path),
};

async function parseTree(name: string): Promise<readonly SpecificationDocument[]> {
  const root = join(fixtureRoot, name);
  const pending = [root];
  const files: string[] = [];
  while (pending.length > 0) {
    const directory = pending.pop();
    assert.ok(directory !== undefined);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
    }
  }
  const documents: SpecificationDocument[] = [];
  for (const file of files.toSorted()) {
    const result = parseSpecificationDocument(relative(root, file).replaceAll("\\", "/"), await readFile(file));
    assert.equal(result.ok, true, result.ok ? undefined : result.diagnostics[0]?.code);
    if (result.ok) documents.push(result.value);
  }
  return documents;
}

describe("REQ-8602BF02 typed Markdown documents", () => {
  test("parses every supported document type and rejects unknown types", async () => {
    const documents = await parseTree("minimal-valid");
    assert.deepEqual(documents.map((document) => document.type).toSorted(), [
      "capability",
      "capability-fragment",
      "concept",
      "index",
    ]);

    const invalid = parseSpecificationDocument(
      "README.md",
      await readFile(join(fixtureRoot, "unknown-document-type", "README.md")),
    );
    assert.equal(invalid.ok, false);
    if (!invalid.ok) assert.equal(invalid.diagnostics[0]?.code, "SDD_MARKDOWN_DOCUMENT_TYPE_UNKNOWN");
  });

  test("loads and types every Markdown file below the configured specification root", async () => {
    const specRootValue: unknown = "fixtures/v1/markdown/documents/minimal-valid";
    assert.ok(isProjectPath(specRootValue));
    const result = await loadSpecificationDocuments(nodeFileSystem, process.cwd(), specRootValue);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.length, 4);
  });
});

describe("REQ-EAC56CB1 addressable Requirement blocks and REQ-065A9911 kinds", () => {
  test("parses stable anchors, metadata, normative sections, and explanatory sections", async () => {
    const documents = await parseTree("representative-valid");
    const capability = documents.find((document) => document.type === "capability");
    assert.ok(capability?.type === "capability");
    const requirement = capability.requirements[0];
    assert.equal(requirement?.id, "REQ-B2000001");
    assert.equal(requirement?.anchor, "req-b2000001");
    assert.equal(requirement?.kind, "behavior");
    assert.equal(requirement?.verification, "automated");
    assert.equal(requirement?.acceptance.length, 2);
    assert.deepEqual(requirement?.constraints, ["An active project cannot be archived."]);
    assert.equal(requirement?.relations.length, 2);
    assert.match(requirement?.rationale ?? "", /active views/u);
  });

  test("rejects unsupported kinds with a stable source diagnostic", async () => {
    const invalid = parseSpecificationDocument(
      "capability.md",
      await readFile(join(fixtureRoot, "unknown-requirement-metadata", "capability.md")),
    );
    assert.equal(invalid.ok, false);
    if (!invalid.ok) {
      assert.equal(invalid.diagnostics[0]?.code, "SDD_MARKDOWN_REQUIREMENT_KIND_UNKNOWN");
      assert.equal(invalid.diagnostics[0]?.location?.path, "capability.md");
      assert.ok((invalid.diagnostics[0]?.location?.line ?? 0) > 0);
      assert.match(invalid.diagnostics[0]?.object_id ?? "", /^REQ-/u);
      assert.equal(typeof invalid.diagnostics[0]?.details.remediation, "string");
    }
  });

  test("rejects malformed headings and Requirements outside Capability documents", () => {
    const malformed = parseSpecificationDocument(
      "capability.md",
      new TextEncoder().encode(
        `---\nsdd:\n  type: capability\n  id: CAP-A1000001\n---\n# Capability\n\n## REQ-A1000001 - Wrong dash\n`,
      ),
    );
    assert.equal(malformed.ok, false);
    if (!malformed.ok) assert.equal(malformed.diagnostics[0]?.code, "SDD_MARKDOWN_REQUIREMENT_HEADING_INVALID");

    const misplaced = parseSpecificationDocument(
      "concept.md",
      new TextEncoder().encode(
        `---\nsdd:\n  type: concept\n  id: CON-A1000001\n---\n# Concept\n\n## Definition <!-- sdd:definition -->\n\nA concept.\n\n## REQ-A1000001 — Misplaced\n`,
      ),
    );
    assert.equal(misplaced.ok, false);
    if (!misplaced.ok) assert.equal(misplaced.diagnostics[0]?.code, "SDD_MARKDOWN_REQUIREMENT_UNEXPECTED");
  });
});

describe("REQ-40A38BA1 Domain Concept model objects", () => {
  test("parses stable identity, definition, optional semantic sections, and relations", async () => {
    const documents = await parseTree("representative-valid");
    const project = documents.find((document) => document.type === "concept" && document.id === "CON-B2000001");
    assert.ok(project?.type === "concept");
    assert.match(project.definition, /governed collection/u);
    assert.match(project.identity ?? "", /same identity/u);
    assert.deepEqual(project.states, ["active", "inactive", "archived"]);
    assert.deepEqual(
      project.relations.map((relation) => relation.target_id),
      ["CON-B2000002"],
    );
  });
});

describe("REQ-DD91AD0F index syntax parser portion", () => {
  test("requires unique capability and concept markers while allowing empty lists", async () => {
    const valid = await parseTree("utf8");
    const index = valid.find((document) => document.type === "index");
    assert.ok(index?.type === "index");
    assert.equal(index.capabilities.length, 1);
    assert.equal(index.concepts.length, 0);

    for (const [fixture, code] of [
      ["missing-required-marker", "SDD_MARKDOWN_MARKER_REQUIRED"],
      ["duplicate-machine-marker", "SDD_MARKDOWN_MARKER_DUPLICATE"],
      ["unknown-machine-marker", "SDD_MARKDOWN_MARKER_UNKNOWN"],
    ] as const) {
      const result = parseSpecificationDocument("README.md", await readFile(join(fixtureRoot, fixture, "README.md")));
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.diagnostics[0]?.code, code);
    }
  });
});

describe("REQ-0EF66B28 local Capability composition parser portion", () => {
  test("assigns root and fragment Requirements to their declared Capability", async () => {
    const documents = await parseTree("representative-valid");
    const requirementOwners = documents
      .filter((document) => document.type === "capability" || document.type === "capability-fragment")
      .flatMap((document) => document.requirements.map((requirement) => requirement.owner));
    assert.deepEqual(requirementOwners, ["CAP-B2000001", "CAP-B2000001"]);
  });
});
