import { relative, resolve, sep } from "node:path";

import { resolveConfiguredPath } from "../config/resolve-project.ts";
import type { ResolvedProject } from "../config/types.ts";
import type { ProjectPath } from "../contracts/identifiers.ts";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import { importProposalPackage } from "./package-input.ts";
import { ProposalRevalidationError, revalidateProposalPackage } from "./revalidate-proposal.ts";

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

export async function revalidateProposalBundle(input: {
  readonly fileSystem: FileSystem;
  readonly gitReader: GitReader;
  readonly project: ResolvedProject;
  readonly projectRoot: string;
  readonly bundlePath: ProjectPath;
  readonly afterFirstRead?: () => Promise<void>;
}): Promise<Awaited<ReturnType<typeof revalidateProposalPackage>>> {
  const bundle = resolveConfiguredPath(input.projectRoot, input.bundlePath);
  const metadata = await input.fileSystem.metadata(bundle);
  if (metadata.kind !== "directory")
    throw new ProposalRevalidationError(
      "SDD_PREPARE_BUNDLE_INVALID",
      "The retained proposal bundle is not a directory.",
    );
  const realRoot = await input.fileSystem.realPath(input.projectRoot);
  const realBundle = await input.fileSystem.realPath(bundle);
  const containment = relative(realRoot, realBundle);
  if (containment === ".." || containment.startsWith(`..${sep}`))
    throw new ProposalRevalidationError(
      "SDD_PREPARE_BUNDLE_INVALID",
      "The retained proposal bundle escapes the project.",
    );
  const packagePath = resolve(bundle, "proposal-package.json");
  const packageBytes = await input.fileSystem.readFile(packagePath);
  const packageValue = await importProposalPackage(input.fileSystem, packagePath);
  const candidatePath = packageValue.candidate.source === "base" ? undefined : resolve(bundle, "candidate-tree.json");
  const candidateBytes = candidatePath === undefined ? undefined : await input.fileSystem.readFile(candidatePath);
  const result = await revalidateProposalPackage({
    fileSystem: input.fileSystem,
    gitReader: input.gitReader,
    project: input.project,
    package: packageValue,
    ...(candidatePath === undefined ? {} : { candidatePath }),
  });
  await input.afterFirstRead?.();
  const currentPackageBytes = await input.fileSystem.readFile(packagePath);
  if (
    !sameBytes(packageBytes, currentPackageBytes) ||
    (candidatePath !== undefined &&
      candidateBytes !== undefined &&
      !sameBytes(candidateBytes, await input.fileSystem.readFile(candidatePath)))
  )
    throw new ProposalRevalidationError(
      "SDD_PREPARE_BUNDLE_CHANGED",
      "The retained proposal bundle changed during revalidation.",
    );
  return result;
}
