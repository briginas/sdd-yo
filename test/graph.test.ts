import assert from "node:assert/strict";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import {
  loadSpecificationDocuments,
  parseSpecificationDocument,
  resolveProject,
  validateSpecificationGraph,
} from "../src/index.ts";
import type { FileSystem, FileSystemEntryKind, ProjectPath, SpecificationDocument } from "../src/index.ts";

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

async function documents(root: string): Promise<readonly SpecificationDocument[]> {
  const pending = [root];
  const files: string[] = [];
  while (pending.length) {
    const directory = pending.pop();
    assert.ok(directory);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && path.endsWith(".md")) files.push(path);
    }
  }
  return Promise.all(
    files.toSorted().map(async (file) => {
      const parsed = parseSpecificationDocument(relative(root, file).replaceAll("\\", "/"), await readFile(file));
      assert.ok(parsed.ok);
      return parsed.value;
    }),
  );
}
const validRoot = join("fixtures", "v1", "markdown", "documents", "representative-valid");
const invalidRoot = join("fixtures", "v1", "markdown", "graph-invalid");

describe("REQ-DD91AD0F REQ-0EF66B28 REQ-8D157EBE REQ-99605FAB REQ-F3A241BE REQ-7D93D64A REQ-13CF54D6 graph validation", () => {
  test("validates the promoted canonical SDD Yo subset", async () => {
    const project = await resolveProject(nodeFileSystem, { kind: "nearest", start_directory: process.cwd() });
    assert.equal(project.ok, true);
    if (!project.ok) return;
    const loaded = await loadSpecificationDocuments(
      nodeFileSystem,
      project.value.project_root,
      project.value.configuration.spec.root,
    );
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    const result = validateSpecificationGraph(loaded.value, project.value.configuration.spec.entrypoint);
    assert.equal(result.ok, true, result.ok ? undefined : result.diagnostics[0]?.code);
  });

  test("accepts the representative typed graph", async () => {
    const result = validateSpecificationGraph(await documents(validRoot), "README.md" as ProjectPath);
    assert.equal(result.ok, true, result.ok ? undefined : result.diagnostics[0]?.code);
  });
  test("rejects every Stage 0 invalid graph family with stable diagnostics", async () => {
    const expectations = {
      "duplicate-id": "SDD_GRAPH_DUPLICATE_ID",
      "broken-link": "SDD_GRAPH_LINK_BROKEN",
      "wrong-target-type": "SDD_GRAPH_TARGET_TYPE",
      "wrong-anchor": "SDD_GRAPH_REQUIREMENT_ANCHOR",
      "invalid-owner": "SDD_GRAPH_FRAGMENT_OWNER",
      "unreachable-fragment": "SDD_GRAPH_FRAGMENT_UNREACHABLE",
      "dependency-cycle-policy": "SDD_GRAPH_DEPENDENCY_CYCLE",
    } as const;
    for (const [name, code] of Object.entries(expectations)) {
      const result = validateSpecificationGraph(await documents(join(invalidRoot, name)), "README.md" as ProjectPath);
      assert.equal(result.ok, false, name);
      if (!result.ok) {
        assert.equal(result.diagnostics[0]?.code, code, name);
        assert.equal(typeof result.diagnostics[0]?.details.remediation, "string", name);
        if (name === "dependency-cycle-policy") {
          assert.match(result.diagnostics[0]?.object_id ?? "", /^REQ-/u);
          assert.ok((result.diagnostics[0]?.location?.line ?? 0) > 0);
        }
      }
    }
    const crossRoot = join(invalidRoot, "cross-project-link", "project-a");
    const cross = validateSpecificationGraph(await documents(crossRoot), "README.md" as ProjectPath);
    assert.equal(cross.ok, false);
    if (!cross.ok) assert.equal(cross.diagnostics[0]?.code, "SDD_GRAPH_PATH_OUTSIDE_SCOPE");
  });
  test("normalizes decomposed Unicode and produces identical model text", () => {
    const template = (title: string) =>
      new TextEncoder().encode(
        `---\nsdd:\n  type: concept\n  id: CON-A1000001\n---\n# ${title}\n\n## Definition <!-- sdd:definition -->\n\n${title}\n`,
      );
    const first = parseSpecificationDocument("concept.md", template("café"));
    const second = parseSpecificationDocument("concept.md", template("cafe\u0301"));
    assert.ok(first.ok && second.ok);
    assert.deepEqual(first.value, second.value);
  });

  test("binds relation identity to the exact target document and validates Concept relations", async () => {
    const source = await documents(validRoot);
    const wrongRequirementPath = source.map((document): SpecificationDocument => {
      if (document.type !== "capability") return document;
      return {
        ...document,
        requirements: document.requirements.map((requirement) => ({
          ...requirement,
          relations: requirement.relations.map((relation) =>
            relation.type === "depends-on"
              ? { ...relation, link: { ...relation.link, target: "project-archiving.md#req-b2000002" } }
              : relation,
          ),
        })),
      };
    });
    const requirementResult = validateSpecificationGraph(wrongRequirementPath, "README.md" as ProjectPath);
    assert.equal(requirementResult.ok, false);
    if (!requirementResult.ok) assert.equal(requirementResult.diagnostics[0]?.code, "SDD_GRAPH_TARGET_ID");

    const wrongConceptPath = source.map((document): SpecificationDocument => {
      if (document.type !== "concept" || document.id !== "CON-B2000001") return document;
      return {
        ...document,
        relations: document.relations.map((relation) => ({
          ...relation,
          link: { ...relation.link, target: "project.md" },
        })),
      };
    });
    const conceptResult = validateSpecificationGraph(wrongConceptPath, "README.md" as ProjectPath);
    assert.equal(conceptResult.ok, false);
    if (!conceptResult.ok) assert.equal(conceptResult.diagnostics[0]?.code, "SDD_GRAPH_TARGET_TYPE");
  });

  test("retains stable identity when only a graph-link display title is stale", async () => {
    const source = await documents(validRoot);
    const staleTitle = source.map(
      (document): SpecificationDocument =>
        document.type === "index"
          ? {
              ...document,
              capabilities: document.capabilities.map((link) => ({
                ...link,
                label: link.label.replace("Project archiving", "Old title"),
              })),
            }
          : document,
    );
    const result = validateSpecificationGraph(staleTitle, "README.md" as ProjectPath);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.diagnostics[0]?.code, "SDD_GRAPH_DISPLAY_TITLE_STALE");
  });
});
