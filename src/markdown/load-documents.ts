import { join } from "node:path";

import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { Diagnostic } from "../contracts/diagnostics.ts";
import { isProjectPath } from "../contracts/identifiers.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import { resolveConfiguredPath } from "../config/resolve-project.ts";
import { parseSpecificationDocument } from "./parse-markdown.ts";
import type { MarkdownResult } from "./result.ts";
import type { SpecificationDocument } from "./types.ts";

function technicalDiagnostic(codeValue: string, message: string, path: ProjectPath): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid internal diagnostic code ${codeValue}`);
  return { code: codeValue, severity: "error", message, details: {}, location: { path } };
}

export async function loadSpecificationDocuments(
  fileSystem: FileSystem,
  projectRoot: string,
  specRoot: ProjectPath,
): Promise<MarkdownResult<readonly SpecificationDocument[]>> {
  const documents: SpecificationDocument[] = [];

  const visit = async (directory: ProjectPath): Promise<readonly Diagnostic[]> => {
    let entries;
    try {
      entries = await fileSystem.readDirectory(resolveConfiguredPath(projectRoot, directory));
    } catch {
      return [
        technicalDiagnostic(
          "SDD_MARKDOWN_DIRECTORY_READ_FAILED",
          "Specification directory could not be read.",
          directory,
        ),
      ];
    }
    for (const entry of entries.toSorted((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    )) {
      const candidateValue = `${directory}/${entry.name}`;
      if (!isProjectPath(candidateValue)) {
        return [technicalDiagnostic("SDD_MARKDOWN_PATH_INVALID", "Specification entry path is invalid.", directory)];
      }
      const candidate = candidateValue;
      if (entry.kind === "symbolic-link") {
        return [
          technicalDiagnostic(
            "SDD_MARKDOWN_SYMLINK_UNSUPPORTED",
            "Specification symlinks are not supported.",
            candidate,
          ),
        ];
      }
      if (entry.kind === "directory") {
        const diagnostics = await visit(candidate);
        if (diagnostics.length > 0) return diagnostics;
      } else if (entry.kind === "file" && entry.name.endsWith(".md")) {
        let bytes: Uint8Array;
        try {
          bytes = await fileSystem.readFile(join(projectRoot, ...candidate.split("/")));
        } catch {
          return [
            technicalDiagnostic(
              "SDD_MARKDOWN_FILE_READ_FAILED",
              "Specification document could not be read.",
              candidate,
            ),
          ];
        }
        const parsed = parseSpecificationDocument(candidate, bytes);
        if (!parsed.ok) return parsed.diagnostics;
        documents.push(parsed.value);
      }
    }
    return [];
  };

  const diagnostics = await visit(specRoot);
  return diagnostics.length === 0 ? { ok: true, value: documents, diagnostics: [] } : { ok: false, diagnostics };
}
