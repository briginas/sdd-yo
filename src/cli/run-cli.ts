import type { Diagnostic } from "../contracts/diagnostics.ts";
import { isDiagnosticCode } from "../contracts/diagnostics.ts";
import type { GitObjectId, ObjectId, ProjectId, ProjectPath, RequirementId } from "../contracts/identifiers.ts";
import { isObjectId, isProjectPath, isRequirementId } from "../contracts/identifiers.ts";
import type { CliResponseEnvelope } from "../contracts/result.ts";
import { resolve } from "node:path";
import type { FileSystem } from "../platform/filesystem.ts";
import type { GitReader } from "../platform/git-reader.ts";
import type { ProjectWriter } from "../platform/project-writer.ts";
import type { Randomness } from "../platform/randomness.ts";
import type { ProcessRunner } from "../platform/process-runner.ts";
import { discoverProcessGitReader, GitReadError } from "../platform/process-git-reader.ts";
import { initializeProject } from "../init/initialize-project.ts";
import type { GeneratedId, IdKind } from "../ids/generate-id.ts";
import { generateRandomIds, isIdKind, MAX_GENERATED_ID_COUNT } from "../ids/generate-id.ts";
import {
  buildCanonicalHistoryIndex,
  HistoryIndexError,
  loadCanonicalProjectGraphAt,
  loadCanonicalProjectObjectIdsAt,
} from "../ids/history-index.ts";
import { buildCurrentProjectIdentityIndex, ProjectIdentityError } from "../ids/project-identity.ts";
import { fingerprintValidatedObject } from "../fingerprint/object-fingerprint.ts";
import type { ObjectDeltaEntry } from "../fingerprint/object-delta.ts";
import { computeGraphObjectDelta, computeVerificationObjectDelta } from "../fingerprint/object-delta.ts";
import type { ValidatedSpecificationGraph } from "../graph/validate-graph.ts";
import { validateSpecificationGraph } from "../graph/validate-graph.ts";
import type { GraphTrace } from "../graph/query-graph.ts";
import { directReverseRelations, traceGraphObject } from "../graph/query-graph.ts";
import { loadSpecificationDocuments } from "../markdown/load-documents.ts";
import type { CapabilityDocument, ConceptDocument, Requirement, SpecificationDocument } from "../markdown/types.ts";
import { resolveConfiguredPath, resolveProject } from "../config/resolve-project.ts";
import {
  AdapterImportError,
  discoverProjectTests,
  JunitImportError,
  ProjectTestDiscoveryError,
  TestIndexError,
  TestIndexInputError,
  importTestIndexFile,
  validateTestIndexSubject,
} from "../tests/index.ts";
import type { TestIndex } from "../tests/index.ts";
import {
  generateSpecPatch,
  applyProposal,
  importSpecPatch,
  importProposalPackage,
  parseProposalPackage,
  parseCodeTarget,
  parseProposalMode,
  prepareApprovedProposal,
  ProposalInputError,
  ProposalApplyError,
  ProposalPackageInputError,
  ProposalPreparationError,
  ProposalValidationError,
  SpecPatchInputError,
  validateProposal,
} from "../proposal/index.ts";
import type { ConflictReport, ProposalMode, ProposalPackage, SpecPatch } from "../proposal/index.ts";
import {
  EvidenceInputError,
  importApprovalEvidenceFile,
  importQaEvidenceFile,
  importTestExecutionEvidenceFile,
} from "../verification/evidence.ts";
import type { EvidenceInputLimits } from "../verification/evidence.ts";
import {
  assessFindings,
  importFindingFile,
  importFindingResolutionFile,
  importHumanSemanticReviewEvidenceFile,
  importSemanticAnalysisInputManifestFile,
} from "../verification/findings.ts";
import type { FindingAssessment } from "../verification/findings.ts";
import {
  importChangeDescriptorFile,
  importProjectJsonArtifact,
  MergeInputError,
  resolveProjectCandidatePath,
} from "../verification/change-descriptor.ts";
import { runMergeGate } from "../verification/merge-report.ts";
import type { MergeReport } from "../verification/merge-report.ts";

export const VALID_EXIT_CODE = 0 as const;
export const BLOCKED_EXIT_CODE = 1 as const;
export const REVIEW_REQUIRED_EXIT_CODE = 2 as const;
export const TECHNICAL_FAILURE_EXIT_CODE = 3 as const;
const CLI_EVIDENCE_LIMITS: EvidenceInputLimits = {
  max_artifact_bytes: 1024 * 1024,
  max_array_items: 10_000,
  max_string_bytes: 256 * 1024,
  max_nesting_depth: 32,
};

type ExitCode =
  | typeof VALID_EXIT_CODE
  | typeof BLOCKED_EXIT_CODE
  | typeof REVIEW_REQUIRED_EXIT_CODE
  | typeof TECHNICAL_FAILURE_EXIT_CODE;
type OutputFormat = "human" | "json";
type Command =
  | "init"
  | "id"
  | "validate"
  | "inspect"
  | "trace"
  | "diff"
  | "tests.discover"
  | "findings.validate"
  | "merge.check"
  | "proposal.validate"
  | "proposal.prepare"
  | "proposal.apply";
type ResponseCommand = Command | "unknown";

export type CliRuntime = {
  readonly argv: readonly string[];
  readonly workingDirectory: string;
  readonly fileSystem: FileSystem;
  readonly projectWriter: ProjectWriter;
  readonly randomness: Randomness;
  readonly processRunner: ProcessRunner;
  readonly adapterEnvironment?: Readonly<Record<string, string>>;
  readonly writeStandardOutput: (message: string) => void;
  readonly writeStandardError: (message: string) => void;
  readonly writeOutputFile: (path: string, message: string) => void;
};

type Invocation = {
  readonly command: Command;
  readonly format: OutputFormat;
  readonly configPath?: string;
  readonly cwd?: string;
  readonly objectId?: ObjectId;
  readonly outputPath?: ProjectPath;
  readonly includeExplanatory: boolean;
  readonly root?: string;
  readonly specPath?: ProjectPath;
  readonly adoption?: "incremental" | "complete";
  readonly idKind?: IdKind;
  readonly count?: number;
  readonly historyRef?: string;
  readonly baseRef?: string;
  readonly targetRef?: string;
  readonly traceRef?: string;
  readonly changedFrom?: string;
  readonly headRef?: string;
  readonly adapterIds: readonly string[];
  readonly importJsonl: readonly ProjectPath[];
  readonly importJunit: readonly ProjectPath[];
  readonly testIndex?: ProjectPath;
  readonly baseTestIndex?: ProjectPath;
  readonly targetTestIndex?: ProjectPath;
  readonly proposalMode?: ProposalMode;
  readonly candidatePath?: string;
  readonly codeTargets: readonly RequirementId[];
  readonly packagePath?: string;
  readonly branchHeadRef?: string;
  readonly integrationRef?: string;
  readonly approvalPaths: readonly ProjectPath[];
  readonly patchPath?: string;
  readonly worktreePath?: string;
  readonly changePath?: ProjectPath;
  readonly inputManifestPath?: ProjectPath;
  readonly findingPaths: readonly ProjectPath[];
  readonly resolutionPaths: readonly ProjectPath[];
  readonly testEvidencePaths: readonly ProjectPath[];
  readonly qaPaths: readonly ProjectPath[];
  readonly humanReviewPaths: readonly ProjectPath[];
};

export type InitResult = {
  readonly created_paths: readonly ProjectPath[];
};

export type IdResult = {
  readonly candidates: readonly GeneratedId[];
  readonly history: {
    readonly status: "complete" | "incomplete" | "unchecked";
    readonly resolved_ref: GitObjectId | null;
  };
};

export type ValidateResult = {
  readonly valid: true;
  readonly history: {
    readonly status: "complete" | "incomplete";
    readonly resolved_ref: GitObjectId | null;
  };
  readonly object_counts: { readonly capabilities: number; readonly requirements: number; readonly concepts: number };
  readonly fingerprints: readonly {
    readonly type: "capability" | "requirement" | "concept";
    readonly id: ObjectId;
    readonly semantic?: string;
    readonly structural: string;
  }[];
  readonly comparison?: ValidateComparisonResult;
};

export type InspectResult = {
  readonly object: Readonly<Record<string, unknown>>;
  readonly document_path: ProjectPath;
  readonly reverse_relations: readonly { readonly type: string; readonly source_id: ObjectId }[];
  readonly fingerprints: Readonly<Record<string, string>>;
};

export type MappedTest = Pick<TestIndex["tests"][number], "test_ref" | "full_name" | "source">;
export type TraceResult = GraphTrace & { readonly mapped_tests?: readonly MappedTest[] };

export type DeltaClassResult = {
  readonly entries: readonly ObjectDeltaEntry[];
  readonly canonical_json_utf8: string;
  readonly fingerprint: string;
};

export type DeltaClassesResult = {
  readonly available_classes: readonly ("semantic" | "structural" | "verification")[];
  readonly unavailable_classes: readonly ("semantic" | "structural" | "verification")[];
  readonly deltas: {
    readonly semantic: DeltaClassResult;
    readonly structural: DeltaClassResult;
    readonly verification?: DeltaClassResult;
  };
};

export type DiffResult = DeltaClassesResult & {
  readonly base_ref: GitObjectId;
  readonly target_ref: GitObjectId;
};

export type ValidateComparisonResult = DeltaClassesResult & {
  readonly changed_from_ref: GitObjectId;
};

export type CliResponse =
  | CliResponseEnvelope<"init", "ok", InitResult>
  | CliResponseEnvelope<"id", "ok", IdResult>
  | CliResponseEnvelope<"validate", "ok", ValidateResult>
  | CliResponseEnvelope<"inspect", "ok", InspectResult>
  | CliResponseEnvelope<"trace", "ok", TraceResult>
  | CliResponseEnvelope<"diff", "ok", DiffResult>
  | CliResponseEnvelope<"tests.discover", "ok", TestIndex>
  | CliResponseEnvelope<"findings.validate", "ok" | "blocked", FindingAssessment>
  | CliResponseEnvelope<"merge.check", "ok" | "blocked" | "review_required", MergeReport>
  | CliResponseEnvelope<"proposal.validate", "ok", ProposalPackage>
  | CliResponseEnvelope<"proposal.apply", "ok", import("../proposal/index.ts").ProposalApplyResult>
  | CliResponseEnvelope<
      "proposal.prepare",
      "ok" | "review_required",
      { readonly conflict_report: ConflictReport; readonly spec_patch: SpecPatch | null }
    >
  | CliResponseEnvelope<Command, "blocked", { readonly valid: false } | null>
  | CliResponseEnvelope<ResponseCommand, "error", null>;

function cliDiagnostic(
  codeValue: string,
  message: string,
  remediation: string,
  severity: Diagnostic["severity"] = "error",
): Diagnostic {
  if (!isDiagnosticCode(codeValue)) throw new Error(`Invalid CLI diagnostic ${codeValue}.`);
  return { code: codeValue, severity, message, details: { remediation } };
}

function parseInvocation(
  argv: readonly string[],
): { ok: true; value: Invocation } | { ok: false; diagnostic: Diagnostic } {
  const command: string | undefined =
    argv[0] === "tests" && argv[1] === "discover"
      ? "tests.discover"
      : argv[0] === "findings" && argv[1] === "validate"
        ? "findings.validate"
        : argv[0] === "merge" && argv[1] === "check"
          ? "merge.check"
          : argv[0] === "proposal" && (argv[1] === "validate" || argv[1] === "prepare" || argv[1] === "apply")
            ? `proposal.${argv[1]}`
            : argv[0];
  if (
    command !== "init" &&
    command !== "id" &&
    command !== "validate" &&
    command !== "inspect" &&
    command !== "trace" &&
    command !== "diff" &&
    command !== "tests.discover" &&
    command !== "findings.validate" &&
    command !== "merge.check" &&
    command !== "proposal.validate" &&
    command !== "proposal.prepare" &&
    command !== "proposal.apply"
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_COMMAND_INVALID",
        "The command is missing or unsupported.",
        "Use a documented sdd version 1 command such as validate, trace, diff, or tests discover.",
      ),
    };
  let format: OutputFormat = "human";
  let configPath: string | undefined;
  let cwd: string | undefined;
  let objectId: ObjectId | undefined;
  let outputPath: ProjectPath | undefined;
  let includeExplanatory = false;
  let root: string | undefined;
  let specPath: ProjectPath | undefined;
  let adoption: "incremental" | "complete" | undefined;
  let idKind: IdKind | undefined;
  let count: number | undefined;
  let historyRef: string | undefined;
  let baseRef: string | undefined;
  let targetRef: string | undefined;
  let traceRef: string | undefined;
  let changedFrom: string | undefined;
  let headRef: string | undefined;
  const adapterIds: string[] = [];
  const importJsonl: ProjectPath[] = [];
  const importJunit: ProjectPath[] = [];
  let testIndex: ProjectPath | undefined;
  let baseTestIndex: ProjectPath | undefined;
  let targetTestIndex: ProjectPath | undefined;
  let proposalMode: ProposalMode | undefined;
  let candidatePath: string | undefined;
  const codeTargets: RequirementId[] = [];
  let packagePath: string | undefined;
  let branchHeadRef: string | undefined;
  let integrationRef: string | undefined;
  const approvalPaths: ProjectPath[] = [];
  let patchPath: string | undefined;
  let worktreePath: string | undefined;
  let changePath: ProjectPath | undefined;
  let inputManifestPath: ProjectPath | undefined;
  const findingPaths: ProjectPath[] = [];
  const resolutionPaths: ProjectPath[] = [];
  const testEvidencePaths: ProjectPath[] = [];
  const qaPaths: ProjectPath[] = [];
  const humanReviewPaths: ProjectPath[] = [];
  for (
    let index =
      command === "tests.discover" ||
      command === "findings.validate" ||
      command === "merge.check" ||
      command === "proposal.validate" ||
      command === "proposal.prepare" ||
      command === "proposal.apply"
        ? 2
        : 1;
    index < argv.length;
    index += 1
  ) {
    const argument = argv[index];
    if (
      argument === "--format" ||
      argument === "--config" ||
      argument === "--cwd" ||
      argument === "--output" ||
      argument === "--root" ||
      argument === "--spec-path" ||
      argument === "--adoption" ||
      argument === "--count" ||
      argument === "--history-ref" ||
      argument === "--base" ||
      argument === "--target" ||
      argument === "--ref" ||
      argument === "--changed-from" ||
      argument === "--head" ||
      argument === "--adapter" ||
      argument === "--import-jsonl" ||
      argument === "--import-junit" ||
      argument === "--test-index" ||
      argument === "--base-test-index" ||
      argument === "--target-test-index" ||
      argument === "--mode" ||
      argument === "--candidate" ||
      argument === "--code-target" ||
      argument === "--package" ||
      argument === "--branch-head" ||
      argument === "--integration-ref" ||
      argument === "--approval" ||
      argument === "--change" ||
      argument === "--input-manifest" ||
      argument === "--findings" ||
      argument === "--resolutions" ||
      argument === "--test-evidence" ||
      argument === "--qa" ||
      argument === "--human-semantic-review" ||
      argument === "--patch" ||
      argument === "--worktree"
    ) {
      const value = argv[index + 1];
      if (value === undefined)
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_OPTION_VALUE_REQUIRED",
            `${argument} requires a value.`,
            "Supply the option value.",
          ),
        };
      index += 1;
      if (
        argument === "--change" ||
        argument === "--input-manifest" ||
        argument === "--findings" ||
        argument === "--resolutions" ||
        argument === "--test-evidence" ||
        argument === "--qa" ||
        argument === "--human-semantic-review"
      ) {
        if (!isProjectPath(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_GATE_INPUT_PATH_INVALID",
              "A gate artifact path is not project-relative and portable.",
              "Supply a regular artifact file inside the selected project.",
            ),
          };
        if (argument === "--change") changePath = value;
        else if (argument === "--input-manifest") inputManifestPath = value;
        else if (argument === "--findings") findingPaths.push(value);
        else if (argument === "--resolutions") resolutionPaths.push(value);
        else if (argument === "--test-evidence") testEvidencePaths.push(value);
        else if (argument === "--qa") qaPaths.push(value);
        else humanReviewPaths.push(value);
      } else if (argument === "--approval") {
        if (!isProjectPath(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_PREPARE_APPROVAL_PATH_INVALID",
              "An ApprovalEvidence path is not project-relative and portable.",
              "Supply a regular ApprovalEvidence file inside the selected project.",
            ),
          };
        approvalPaths.push(value);
      } else if (argument === "--patch" || argument === "--worktree") {
        if (value.length === 0 || value.includes("\0"))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              argument === "--patch" ? "SDD_APPLY_PATCH_PATH_INVALID" : "SDD_APPLY_WORKTREE_PATH_INVALID",
              "A proposal apply path is invalid.",
              "Supply a local SpecPatch file and optional worktree directory.",
            ),
          };
        if (argument === "--patch") patchPath = value;
        else worktreePath = value;
      } else if (argument === "--package") {
        if (value.length === 0 || value.includes("\0"))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_PREPARE_PACKAGE_PATH_INVALID",
              "The ProposalPackage path is invalid.",
              "Supply a regular ProposalPackage JSON file.",
            ),
          };
        packagePath = value;
      } else if (argument === "--branch-head" || argument === "--integration-ref") {
        if (value.length === 0 || value.includes("\0"))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_GIT_REF_INVALID",
              "A preparation Git ref is invalid.",
              "Supply a non-empty Git ref.",
            ),
          };
        if (argument === "--branch-head") branchHeadRef = value;
        else integrationRef = value;
      } else if (argument === "--mode") {
        proposalMode = parseProposalMode(value);
        if (proposalMode === undefined)
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_PROPOSAL_MODE_INVALID",
              "The proposal mode is unsupported.",
              "Use spec-code, spec, or code.",
            ),
          };
      } else if (argument === "--candidate") {
        if (value.length === 0 || value.includes("\0"))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_PROPOSAL_CANDIDATE_PATH_INVALID",
              "The candidate path is invalid.",
              "Supply an SDD Project directory or CandidateTreeManifest file.",
            ),
          };
        candidatePath = value;
      } else if (argument === "--code-target") {
        const target = parseCodeTarget(value);
        if (target === undefined)
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_PROPOSAL_CODE_TARGET_INVALID",
              "A code target is not a Requirement ID.",
              "Use REQ-XXXXXXXX.",
            ),
          };
        codeTargets.push(target);
      } else if (argument === "--format") {
        if (value !== "human" && value !== "json")
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_FORMAT_INVALID",
              "Output format is unsupported.",
              "Use human or json.",
            ),
          };
        format = value;
      } else if (argument === "--config") configPath = value;
      else if (argument === "--cwd") cwd = value;
      else if (argument === "--root") root = value;
      else if (argument === "--spec-path") {
        if (!isProjectPath(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_SPEC_PATH_INVALID",
              "The specification path must be project-relative and portable.",
              "Use a path inside the selected project without traversal segments.",
            ),
          };
        specPath = value;
      } else if (argument === "--adoption") {
        if (value !== "incremental" && value !== "complete")
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_ADOPTION_INVALID",
              "The adoption mode is unsupported.",
              "Use incremental or complete.",
            ),
          };
        adoption = value;
      } else if (argument === "--count") {
        const parsedCount = Number(value);
        if (
          !Number.isSafeInteger(parsedCount) ||
          parsedCount < 1 ||
          parsedCount > MAX_GENERATED_ID_COUNT ||
          String(parsedCount) !== value
        )
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_ID_COUNT_INVALID",
              "The requested ID count is invalid.",
              `Use an integer from 1 through ${MAX_GENERATED_ID_COUNT}.`,
            ),
          };
        count = parsedCount;
      } else if (argument === "--history-ref") {
        if (value.length === 0 || value.includes("\0"))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_ID_HISTORY_REF_INVALID",
              "The history ref is invalid.",
              "Supply a non-empty Git ref.",
            ),
          };
        historyRef = value;
      } else if (
        argument === "--base" ||
        argument === "--target" ||
        argument === "--changed-from" ||
        argument === "--head" ||
        argument === "--ref"
      ) {
        if (value.length === 0 || value.includes("\0"))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_GIT_REF_INVALID",
              "A Git comparison ref is invalid.",
              "Supply a non-empty Git ref.",
            ),
          };
        if (argument === "--base") baseRef = value;
        else if (argument === "--target") targetRef = value;
        else if (argument === "--changed-from") changedFrom = value;
        else if (argument === "--head") headRef = value;
        else traceRef = value;
      } else if (argument === "--adapter") {
        if (!/^[a-z][a-z0-9-]{0,31}$/u.test(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_ADAPTER_ID_INVALID",
              "The selected adapter ID is invalid.",
              "Use a configured lowercase adapter ID.",
            ),
          };
        adapterIds.push(value);
      } else if (
        argument === "--import-jsonl" ||
        argument === "--import-junit" ||
        argument === "--test-index" ||
        argument === "--base-test-index" ||
        argument === "--target-test-index"
      ) {
        if (!isProjectPath(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_ADAPTER_IMPORT_PATH_INVALID",
              "An adapter import path is not project-relative and portable.",
              "Use a regular file path inside the selected project.",
            ),
          };
        if (argument === "--import-jsonl") importJsonl.push(value);
        else if (argument === "--import-junit") importJunit.push(value);
        else if (argument === "--test-index") testIndex = value;
        else if (argument === "--base-test-index") baseTestIndex = value;
        else targetTestIndex = value;
      } else {
        if (!isProjectPath(value))
          return {
            ok: false,
            diagnostic: cliDiagnostic(
              "SDD_CONFIG_CLI_OUTPUT_INVALID",
              "The output path must be project-relative and portable.",
              "Use a path inside the selected project without traversal segments.",
            ),
          };
        outputPath = value;
      }
    } else if (argument === "--quiet") {
      // The current commands emit no progress or non-primary human logs.
    } else if (argument === "--include") {
      if (argv[index + 1] !== "explanatory")
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_INCLUDE_INVALID",
            "The inspect include value is unsupported.",
            "Use --include explanatory.",
          ),
        };
      includeExplanatory = true;
      index += 1;
    } else if ((command === "inspect" || command === "trace") && objectId === undefined && isObjectId(argument))
      objectId = argument;
    else if (command === "id" && idKind === undefined && isIdKind(argument)) idKind = argument;
    else
      return {
        ok: false,
        diagnostic: cliDiagnostic(
          "SDD_CONFIG_CLI_ARGUMENT_INVALID",
          "A command argument is invalid.",
          "Correct the command arguments.",
        ),
      };
  }
  if (configPath !== undefined && cwd !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_PROJECT_SELECTOR_CONFLICT",
        "--config and --cwd are mutually exclusive.",
        "Select exactly one project resolution option.",
      ),
    };
  if (
    command === "init" &&
    (configPath !== undefined || cwd !== undefined || outputPath !== undefined || includeExplanatory)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "An option does not apply to init.",
        "Use --root, --spec-path, --adoption, --format, or --quiet with init.",
      ),
    };
  if (command !== "init" && (root !== undefined || specPath !== undefined || adoption !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "An initialization option was used with another command.",
        "Use initialization options only with sdd init.",
      ),
    };
  if (command === "id" && outputPath !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "Projectless ID output cannot select a project-relative output file.",
        "Read the ID result from standard output.",
      ),
    };
  if (command !== "id" && (idKind !== undefined || count !== undefined || historyRef !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "An ID-generation option was used with another command.",
        "Use ID-generation options only with sdd id.",
      ),
    };
  if (command !== "diff" && command !== "proposal.validate" && (baseRef !== undefined || targetRef !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A diff ref option was used with another command.",
        "Use --base and --target only with sdd diff.",
      ),
    };
  if (command === "proposal.validate" && targetRef !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "--target does not apply to proposal validation.",
        "Use --base with sdd proposal validate.",
      ),
    };
  if (command === "diff" && (baseRef === undefined || targetRef === undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_GIT_DIFF_REFS_REQUIRED",
        "diff requires base and target Git refs.",
        "Supply both --base and --target.",
      ),
    };
  if (
    command === "proposal.validate" &&
    (baseRef === undefined || proposalMode === undefined || candidatePath === undefined)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_PROPOSAL_INPUTS_REQUIRED",
        "proposal validate requires mode, base, and candidate inputs.",
        "Supply --mode, --base, and --candidate.",
      ),
    };
  if (
    command !== "proposal.validate" &&
    command !== "proposal.prepare" &&
    command !== "merge.check" &&
    (proposalMode !== undefined || candidatePath !== undefined || codeTargets.length > 0)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A proposal option was used with another command.",
        "Use proposal options only with sdd proposal validate.",
      ),
    };
  if (
    command === "proposal.prepare" &&
    (packagePath === undefined ||
      candidatePath === undefined ||
      branchHeadRef === undefined ||
      integrationRef === undefined)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_PREPARE_INPUTS_REQUIRED",
        "proposal prepare requires package, candidate, branch-head, and integration-ref inputs.",
        "Supply --package, --candidate, --branch-head, and --integration-ref.",
      ),
    };
  if (
    command === "proposal.prepare" &&
    (proposalMode !== undefined || codeTargets.length > 0 || baseRef !== undefined || targetRef !== undefined)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A proposal validation or diff option was used with proposal prepare.",
        "Use only preparation inputs with sdd proposal prepare.",
      ),
    };
  if (
    command !== "proposal.prepare" &&
    command !== "merge.check" &&
    (packagePath !== undefined || approvalPaths.length > 0)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A proposal preparation option was used with another command.",
        "Use preparation options only with sdd proposal prepare.",
      ),
    };
  if (command !== "proposal.prepare" && (branchHeadRef !== undefined || integrationRef !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "An explicit preparation ref was used with another command.",
        "Use --branch-head and --integration-ref only with sdd proposal prepare.",
      ),
    };
  if (command === "proposal.apply" && (patchPath === undefined || outputPath !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        patchPath === undefined ? "SDD_APPLY_PATCH_REQUIRED" : "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        patchPath === undefined
          ? "proposal apply requires a SpecPatch file."
          : "--output does not apply to proposal apply.",
        patchPath === undefined
          ? "Supply --patch with a strict version 1 SpecPatch file."
          : "Read the apply result from standard output.",
      ),
    };
  if (command !== "proposal.apply" && (patchPath !== undefined || worktreePath !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A proposal apply option was used with another command.",
        "Use --patch and --worktree only with sdd proposal apply.",
      ),
    };
  if (command !== "trace" && traceRef !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "--ref was used with another command.",
        "Use --ref only with sdd trace.",
      ),
    };
  if (command !== "trace" && command !== "merge.check" && testIndex !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "--test-index was used with another command.",
        "Use --test-index only with sdd trace.",
      ),
    };
  if (command !== "diff" && (baseTestIndex !== undefined || targetTestIndex !== undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A diff TestIndex option was used with another command.",
        "Use --base-test-index and --target-test-index only with sdd diff.",
      ),
    };
  if (command === "diff" && (baseTestIndex === undefined) !== (targetTestIndex === undefined))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_ADAPTER_TEST_INDEX_PAIR_REQUIRED",
        "Verification diff requires both base and target TestIndex inputs.",
        "Supply both --base-test-index and --target-test-index, or neither.",
      ),
    };
  if (command !== "validate" && changedFrom !== undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "--changed-from was used with another command.",
        "Use --changed-from only with sdd validate.",
      ),
    };
  if (
    command !== "tests.discover" &&
    (headRef !== undefined || adapterIds.length > 0 || importJsonl.length > 0 || importJunit.length > 0)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A test-discovery option was used with another command.",
        "Use --head, --adapter, and import options only with sdd tests discover.",
      ),
    };
  if (command === "tests.discover" && headRef === undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_ADAPTER_HEAD_REQUIRED",
        "tests discover requires a Git head ref.",
        "Supply --head with the exact discovery subject ref.",
      ),
    };
  if (command === "findings.validate" && (inputManifestPath === undefined || findingPaths.length === 0))
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_FINDING_INPUTS_REQUIRED",
        "findings validate requires an input manifest and at least one Finding.",
        "Supply --input-manifest and --findings.",
      ),
    };
  if (
    command === "merge.check" &&
    (changePath === undefined ||
      packagePath === undefined ||
      !isProjectPath(packagePath) ||
      candidatePath === undefined ||
      !isProjectPath(candidatePath) ||
      testIndex === undefined ||
      approvalPaths.length === 0 ||
      testEvidencePaths.length === 0 ||
      qaPaths.length === 0)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_GATE_INPUTS_REQUIRED",
        "merge check requires change, package, candidate, approval, TestIndex, test evidence, and QA inputs.",
        "Supply every required explicit versioned merge input as a project-relative path.",
      ),
    };
  const hasSemanticGateInput = findingPaths.length > 0 || resolutionPaths.length > 0 || humanReviewPaths.length > 0;
  if (command === "merge.check" && hasSemanticGateInput && inputManifestPath === undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_FINDING_INPUT_SET_INVALID",
        "Semantic finding inputs require exactly one input manifest.",
        "Supply --input-manifest with findings, resolutions, or human semantic review inputs.",
      ),
    };
  if (
    command !== "findings.validate" &&
    command !== "merge.check" &&
    (changePath !== undefined ||
      inputManifestPath !== undefined ||
      findingPaths.length > 0 ||
      resolutionPaths.length > 0 ||
      testEvidencePaths.length > 0 ||
      qaPaths.length > 0 ||
      humanReviewPaths.length > 0)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A finding or merge gate option was used with another command.",
        "Use gate artifact options only with sdd findings validate or sdd merge check.",
      ),
    };
  if (
    command === "findings.validate" &&
    (changePath !== undefined ||
      packagePath !== undefined ||
      candidatePath !== undefined ||
      approvalPaths.length > 0 ||
      testIndex !== undefined ||
      testEvidencePaths.length > 0 ||
      qaPaths.length > 0 ||
      humanReviewPaths.length > 0)
  )
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "A merge-only option was used with findings validate.",
        "Use only --input-manifest, --findings, and --resolutions with findings validate.",
      ),
    };
  if (command === "id" && idKind === undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_ID_KIND_REQUIRED",
        "id requires an ID kind.",
        "Supply project, capability, requirement, or concept.",
      ),
    };
  if ((command === "inspect" || command === "trace") && objectId === undefined)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_OBJECT_ID_REQUIRED",
        `${command} requires an object ID.`,
        "Supply a CAP, REQ, or CON ID.",
      ),
    };
  if (command !== "inspect" && includeExplanatory)
    return {
      ok: false,
      diagnostic: cliDiagnostic(
        "SDD_CONFIG_CLI_ARGUMENT_INVALID",
        "--include applies only to inspect.",
        "Remove --include.",
      ),
    };
  return {
    ok: true,
    value: {
      command,
      format,
      ...(configPath === undefined ? {} : { configPath }),
      ...(cwd === undefined ? {} : { cwd }),
      ...(objectId === undefined ? {} : { objectId }),
      ...(outputPath === undefined ? {} : { outputPath }),
      includeExplanatory,
      ...(root === undefined ? {} : { root }),
      ...(specPath === undefined ? {} : { specPath }),
      ...(adoption === undefined ? {} : { adoption }),
      ...(idKind === undefined ? {} : { idKind }),
      ...(command === "id" ? { count: count ?? 1 } : {}),
      ...(historyRef === undefined ? {} : { historyRef }),
      ...(baseRef === undefined ? {} : { baseRef }),
      ...(targetRef === undefined ? {} : { targetRef }),
      ...(traceRef === undefined ? {} : { traceRef }),
      ...(changedFrom === undefined ? {} : { changedFrom }),
      ...(headRef === undefined ? {} : { headRef }),
      adapterIds: [...new Set(adapterIds)],
      importJsonl,
      importJunit,
      ...(testIndex === undefined ? {} : { testIndex }),
      ...(baseTestIndex === undefined ? {} : { baseTestIndex }),
      ...(targetTestIndex === undefined ? {} : { targetTestIndex }),
      ...(proposalMode === undefined ? {} : { proposalMode }),
      ...(candidatePath === undefined ? {} : { candidatePath }),
      codeTargets,
      ...(packagePath === undefined ? {} : { packagePath }),
      ...(branchHeadRef === undefined ? {} : { branchHeadRef }),
      ...(integrationRef === undefined ? {} : { integrationRef }),
      approvalPaths,
      ...(patchPath === undefined ? {} : { patchPath }),
      ...(worktreePath === undefined ? {} : { worktreePath }),
      ...(changePath === undefined ? {} : { changePath }),
      ...(inputManifestPath === undefined ? {} : { inputManifestPath }),
      findingPaths,
      resolutionPaths,
      testEvidencePaths,
      qaPaths,
      humanReviewPaths,
    },
  };
}

function response(
  command: ResponseCommand,
  projectId: ProjectId | null,
  status: CliResponse["status"],
  result: unknown,
  diagnostics: readonly Diagnostic[],
): CliResponse {
  return { schema_version: "1.0", command, project_id: projectId, status, result, diagnostics } as CliResponse;
}

function owningDocument(graph: ValidatedSpecificationGraph, objectId: ObjectId): SpecificationDocument | undefined {
  for (const document of graph.documents.values()) {
    if ((document.type === "capability" || document.type === "concept") && document.id === objectId) return document;
    if (
      (document.type === "capability" || document.type === "capability-fragment") &&
      document.requirements.some((requirement) => requirement.id === objectId)
    )
      return document;
  }
  return undefined;
}

type ObjectFingerprints = { readonly structural: string; readonly semantic?: string };

function fingerprints(graph: ValidatedSpecificationGraph, objectId: ObjectId): ObjectFingerprints {
  const object = graph.objects.get(objectId);
  if (object === undefined) throw new Error("Cannot fingerprint an unknown object.");
  return !("anchor" in object) && object.type === "capability"
    ? { structural: fingerprintValidatedObject(graph, objectId, "structural") }
    : {
        semantic: fingerprintValidatedObject(graph, objectId, "semantic"),
        structural: fingerprintValidatedObject(graph, objectId, "structural"),
      };
}

function relations(object: CapabilityDocument | ConceptDocument | Requirement): readonly {
  type: string;
  target_id: ObjectId;
}[] {
  if (!("anchor" in object) && object.type === "capability") return [];
  return object.relations
    .map((relation) => ({ type: relation.type, target_id: relation.target_id }))
    .toSorted((left, right) =>
      left.type !== right.type
        ? left.type < right.type
          ? -1
          : 1
        : left.target_id < right.target_id
          ? -1
          : left.target_id > right.target_id
            ? 1
            : 0,
    );
}

function inspectResult(
  graph: ValidatedSpecificationGraph,
  objectId: ObjectId,
  explanatory: boolean,
): InspectResult | undefined {
  const object = graph.objects.get(objectId);
  if (object === undefined) return undefined;
  const document = owningDocument(graph, objectId);
  if (document === undefined) throw new Error("Validated object has no owning document.");
  const reverseRelations = directReverseRelations(graph, objectId);
  let value: Record<string, unknown>;
  if ("anchor" in object)
    value = {
      type: "requirement",
      id: object.id,
      title: object.title,
      kind: object.kind,
      verification: object.verification,
      owner_capability_id: object.owner,
      statement: object.statement,
      acceptance: object.acceptance,
      constraints: object.constraints,
      relations: relations(object),
      ...(explanatory ? { rationale: object.rationale ?? null, examples: object.examples ?? null } : {}),
    };
  else if (object.type === "concept")
    value = {
      type: "concept",
      id: object.id,
      title: object.title,
      definition: object.definition,
      identity: object.identity ?? null,
      states: object.states,
      relations: relations(object),
      ...(explanatory ? { rationale: object.rationale ?? null, examples: object.examples ?? null } : {}),
    };
  else
    value = {
      type: "capability",
      id: object.id,
      title: object.title,
      requirement_ids: [...graph.objects.values()]
        .filter((candidate): candidate is Requirement => "anchor" in candidate && candidate.owner === object.id)
        .map((requirement) => requirement.id)
        .toSorted(),
      ...(explanatory ? { purpose: object.purpose ?? null } : {}),
    };
  return {
    object: value,
    document_path: document.path,
    reverse_relations: reverseRelations,
    fingerprints: fingerprints(graph, objectId),
  };
}

function validateResult(
  graph: ValidatedSpecificationGraph,
  history: ValidateResult["history"],
  comparison?: ValidateComparisonResult,
): ValidateResult {
  const capabilities = [...graph.objects.values()].filter(
    (object) => !("anchor" in object) && object.type === "capability",
  );
  const concepts = [...graph.objects.values()].filter((object) => !("anchor" in object) && object.type === "concept");
  const requirements = [...graph.objects.values()].filter((object) => "anchor" in object);
  return {
    valid: true,
    history,
    object_counts: { capabilities: capabilities.length, requirements: requirements.length, concepts: concepts.length },
    fingerprints: [...graph.objects.entries()]
      .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([id, object]) => ({
        type: "anchor" in object ? "requirement" : object.type,
        id,
        ...fingerprints(graph, id),
      })),
    ...(comparison === undefined ? {} : { comparison }),
  };
}

function deltaClassesResult(
  before: ValidatedSpecificationGraph,
  after: ValidatedSpecificationGraph,
  indexes?: { readonly before: TestIndex; readonly after: TestIndex },
): DeltaClassesResult {
  const delta = computeGraphObjectDelta(before, after);
  const view = (value: typeof delta.semantic): DeltaClassResult => ({
    entries: value.entries,
    canonical_json_utf8: new TextDecoder().decode(value.canonicalBytes),
    fingerprint: value.fingerprint,
  });
  if (indexes === undefined)
    return {
      available_classes: ["semantic", "structural"],
      unavailable_classes: ["verification"],
      deltas: { semantic: view(delta.semantic), structural: view(delta.structural) },
    };
  const verification = computeVerificationObjectDelta(before, indexes.before, after, indexes.after);
  return {
    available_classes: ["semantic", "structural", "verification"],
    unavailable_classes: [],
    deltas: { semantic: view(delta.semantic), structural: view(delta.structural), verification: view(verification) },
  };
}

function mappedTrace(trace: GraphTrace, index: TestIndex): TraceResult {
  return {
    ...trace,
    mapped_tests: index.tests
      .filter((test) => test.requirement_ids.some((id) => id === trace.object_id))
      .map((test) => ({
        test_ref: test.test_ref,
        full_name: test.full_name,
        ...(test.source === undefined ? {} : { source: test.source }),
      })),
  };
}

function knownRequirementIds(graph: ValidatedSpecificationGraph): ReadonlySet<RequirementId> {
  return new Set([...graph.objects.keys()].filter(isRequirementId));
}

function humanView(value: CliResponse): string {
  const lines = [`${value.command}: ${value.status}`];
  if (value.project_id !== null) lines.push(`project: ${value.project_id}`);
  if (value.command === "validate" && value.status === "ok") {
    const result = value.result as ValidateResult;
    const counts = result.object_counts;
    lines.push(
      `objects: ${counts.capabilities} capabilities, ${counts.requirements} requirements, ${counts.concepts} concepts`,
    );
    if (result.comparison !== undefined)
      lines.push(
        `changed from: ${result.comparison.changed_from_ref}`,
        `semantic: ${result.comparison.deltas.semantic.fingerprint}`,
        `structural: ${result.comparison.deltas.structural.fingerprint}`,
        result.comparison.deltas.verification === undefined
          ? "verification: unavailable"
          : `verification: ${result.comparison.deltas.verification.fingerprint}`,
      );
  } else if (value.command === "inspect" && value.status === "ok") {
    const result = value.result as unknown as { object: { id: string; title: string }; document_path: string };
    lines.push(`${result.object.id} — ${result.object.title}`, `document: ${result.document_path}`);
  } else if (value.command === "trace" && value.status === "ok") {
    const result = value.result as TraceResult;
    lines.push(
      `object: ${result.object_id}`,
      `ancestry: ${result.ancestry.join(", ") || "none"}`,
      `dependencies: ${result.dependencies.join(", ") || "none"}`,
      `dependents: ${result.dependents.join(", ") || "none"}`,
      `referrers: ${result.referrers.map((item) => `${item.source_id} (${item.type})`).join(", ") || "none"}`,
    );
    if (result.mapped_tests !== undefined)
      lines.push(`mapped tests: ${result.mapped_tests.map((test) => test.test_ref).join(", ") || "none"}`);
  } else if (value.command === "diff" && value.status === "ok") {
    const result = value.result as DiffResult;
    lines.push(
      `base: ${result.base_ref}`,
      `target: ${result.target_ref}`,
      `semantic: ${result.deltas.semantic.fingerprint}`,
      `structural: ${result.deltas.structural.fingerprint}`,
      result.deltas.verification === undefined
        ? "verification: unavailable"
        : `verification: ${result.deltas.verification.fingerprint}`,
    );
  } else if (value.command === "init" && value.status === "ok") {
    const result = value.result as InitResult;
    lines.push(...result.created_paths.map((path) => `created: ${path}`));
  } else if (value.command === "id" && value.status === "ok") {
    const result = value.result as IdResult;
    lines.push(...result.candidates, `history: ${result.history.status}`);
  } else if (value.command === "tests.discover" && value.status === "ok") {
    const result = value.result as TestIndex;
    lines.push(`head: ${result.subject.head_ref}`, `tests: ${result.tests.length}`);
  } else if (value.command === "proposal.validate" && value.status === "ok") {
    const result = value.result as ProposalPackage;
    lines.push(
      `mode: ${result.mode}`,
      `base: ${result.base.git_ref}`,
      `base tree: ${result.base.tree_fingerprint}`,
      `candidate tree: ${result.candidate.tree_fingerprint}`,
      `semantic: ${result.object_delta.semantic_fingerprint}`,
      `structural: ${result.object_delta.structural_fingerprint}`,
      `affected requirements: ${result.affected_scope.requirements.join(", ") || "none"}`,
    );
  } else if (value.command === "proposal.prepare" && (value.status === "ok" || value.status === "review_required")) {
    const result = value.result as { readonly conflict_report: ConflictReport; readonly spec_patch: SpecPatch | null };
    lines.push(
      `branch head: ${result.conflict_report.branch_head}`,
      `integration: ${result.conflict_report.integration_ref}`,
      `conflicts: ${result.conflict_report.mechanical_conflicts.length}`,
      result.spec_patch === null
        ? "spec patch: unavailable"
        : `spec patch operations: ${result.spec_patch.operations.length}`,
    );
    for (const conflict of result.conflict_report.mechanical_conflicts)
      lines.push(
        `conflict: ${conflict.path} (${conflict.kind})${conflict.object_id === undefined ? "" : ` ${conflict.object_id}`}`,
      );
  } else if (value.command === "proposal.apply" && value.status === "ok") {
    const result = value.result as import("../proposal/index.ts").ProposalApplyResult;
    lines.push(
      `result tree: ${result.result_tree_fingerprint}`,
      ...result.applied_paths.map((path) => `applied: ${path}`),
    );
  } else if (value.command === "findings.validate" && (value.status === "ok" || value.status === "blocked")) {
    const result = value.result as FindingAssessment;
    lines.push(
      `findings: ${result.findings.length}`,
      `human review: ${result.human_review_state}`,
      `semantic completeness claimed: ${String(result.semantic_completeness_claimed)}`,
      ...result.findings.map((finding) => `finding: ${finding.finding_id} (${finding.state})`),
    );
  } else if (
    value.command === "merge.check" &&
    (value.status === "ok" || value.status === "blocked" || value.status === "review_required")
  ) {
    const result = value.result as MergeReport;
    lines.push(
      `readiness: ${result.status}`,
      `branch head: ${result.branch_head}`,
      `integration: ${result.integration_ref}`,
      `merge base: ${result.merge_base}`,
      `mode: ${result.mode}`,
      "approved_delta" in result.deltas_or_code_targets
        ? `approved semantic: ${result.deltas_or_code_targets.approved_delta.semantic}`
        : `code targets: ${result.deltas_or_code_targets.code_targets.map((target) => target.requirement_id).join(", ")}`,
      "approved_delta" in result.deltas_or_code_targets
        ? `approved structural: ${result.deltas_or_code_targets.approved_delta.structural}`
        : "approved structural: unchanged",
      `affected requirements: ${result.affected_scope.requirements.join(", ") || "none"}`,
      `affected capabilities: ${result.affected_scope.capabilities.join(", ") || "none"}`,
      result.test_summary.status === "NOT_APPLICABLE"
        ? "tests: NOT_APPLICABLE (empty affected scope)"
        : `tests: ${result.test_summary.status} (${result.test_summary.satisfied} satisfied, ${result.test_summary.unsatisfied} unsatisfied)`,
      result.qa_summary.status === "NOT_APPLICABLE"
        ? "QA: NOT_APPLICABLE (empty affected scope)"
        : `QA: ${result.qa_summary.status} (${result.qa_summary.satisfied} satisfied, ${result.qa_summary.unsatisfied} unsatisfied)`,
      `evidence: ${result.findings_and_evidence.evidence_status}`,
      `findings: ${result.findings_and_evidence.findings.length}`,
      `conflicts: ${result.diagnostics.filter((diagnostic) => diagnostic.code.includes("CONFLICT")).length}`,
      `adoption: ${result.adoption.mode}`,
      `inputs: ${result.input_manifest.length}`,
    );
  }
  for (const diagnostic of value.diagnostics)
    lines.push(`${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`);
  return `${lines.join("\n")}\n`;
}

function emit(runtime: CliRuntime, format: OutputFormat, value: CliResponse, outputTarget?: string): void {
  const rendered = format === "json" ? `${JSON.stringify(value)}\n` : humanView(value);
  if (outputTarget === undefined) runtime.writeStandardOutput(rendered);
  else runtime.writeOutputFile(outputTarget, rendered);
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function historyTechnicalDiagnostic(error: unknown): Diagnostic {
  if (error instanceof GitReadError && error.code === "GIT_REF_UNRESOLVED")
    return cliDiagnostic(
      "SDD_GIT_REF_UNRESOLVED",
      "The configured Git history ref could not be resolved.",
      "Fetch or correct the requested integration ref and run the command again.",
    );
  if (error instanceof HistoryIndexError)
    return cliDiagnostic(
      "SDD_ID_HISTORY_INVALID",
      "Reachable canonical history could not be validated.",
      "Repair the reachable project configuration and specification history before reserving IDs.",
    );
  if (error instanceof ProjectIdentityError)
    return cliDiagnostic(
      "SDD_ID_PROJECT_IDENTITY_INVALID",
      "Current repository project identities could not be validated.",
      "Repair repository .sdd/config.yaml files before reserving IDs.",
    );
  return cliDiagnostic(
    "SDD_ID_HISTORY_UNAVAILABLE",
    "Canonical Git history is unavailable for ID reservation.",
    "Run the command in a Git repository with the configured integration ref available.",
  );
}

function comparisonTechnicalDiagnostic(error: unknown): Diagnostic {
  if (error instanceof GitReadError && error.code === "GIT_REF_UNRESOLVED")
    return cliDiagnostic(
      "SDD_GIT_REF_UNRESOLVED",
      "A requested Git comparison ref could not be resolved.",
      "Fetch or correct the requested ref and run the command again.",
    );
  if (error instanceof GitReadError && error.code === "GIT_REPOSITORY_UNAVAILABLE")
    return cliDiagnostic(
      "SDD_GIT_REPOSITORY_UNAVAILABLE",
      "The selected project is not inside an available Git repository.",
      "Run the comparison inside the Git repository that contains the selected project.",
    );
  return cliDiagnostic(
    "SDD_GIT_READ_FAILED",
    "Git comparison data could not be read safely.",
    "Correct the repository or requested refs and run the comparison again.",
  );
}

function adapterTechnicalDiagnostic(error: unknown): Diagnostic {
  if (
    error instanceof AdapterImportError ||
    error instanceof JunitImportError ||
    error instanceof ProjectTestDiscoveryError ||
    error instanceof TestIndexError ||
    error instanceof TestIndexInputError
  ) {
    return cliDiagnostic(
      error.code,
      error.message,
      "Correct the adapter configuration or imported discovery data and run the command again.",
    );
  }
  return cliDiagnostic(
    "SDD_ADAPTER_DISCOVERY_FAILED",
    "Test discovery did not complete safely.",
    "Correct the adapter process, report files, or selected project and run the command again.",
  );
}

function historyIncompleteDiagnostic(severity: Diagnostic["severity"]): Diagnostic {
  return cliDiagnostic(
    "SDD_GIT_HISTORY_INCOMPLETE",
    "Reachable canonical Git history is incomplete.",
    "Fetch complete history before relying on identifier-reuse guarantees.",
    severity,
  );
}

function duplicateProjectIdDiagnostic(): Diagnostic {
  return cliDiagnostic(
    "SDD_ID_PROJECT_DUPLICATE",
    "A project ID is duplicated by current SDD Projects in this Git repository.",
    "Assign every current SDD Project in the repository a distinct SDD ID.",
  );
}

function projectSnapshotMissingDiagnostic(): Diagnostic {
  return cliDiagnostic(
    "SDD_GIT_PROJECT_NOT_FOUND",
    "The selected SDD Project does not exist at a requested Git ref.",
    "Select refs whose trees contain the configured project ID.",
  );
}

function projectSnapshotInvalidDiagnostic(): Diagnostic {
  return cliDiagnostic(
    "SDD_GIT_SNAPSHOT_INVALID",
    "A requested Git specification snapshot is invalid.",
    "Correct the project configuration and canonical graph at the requested ref.",
  );
}

function reusedObjectIdDiagnostic(objectId: ObjectId): Diagnostic {
  return {
    ...cliDiagnostic(
      "SDD_ID_REUSED",
      "A newly introduced canonical object ID was already defined in reachable project history.",
      "Assign the object a new random ID and preserve the historical ID as permanently reserved.",
    ),
    object_id: objectId,
  };
}

async function resolveSafeOutputTarget(
  fileSystem: FileSystem,
  projectRoot: string,
  outputPath: ProjectPath,
): Promise<{ ok: true; target: string } | { ok: false; diagnostic: Diagnostic }> {
  const segments = outputPath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const partial = segments.slice(0, index + 1).join("/");
    const target = resolveConfiguredPath(projectRoot, partial as ProjectPath);
    try {
      const metadata = await fileSystem.metadata(target);
      if (metadata.kind === "symbolic-link" || (index < segments.length - 1 && metadata.kind !== "directory"))
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_OUTPUT_UNSAFE",
            "The output path contains an unsafe component.",
            "Use an existing in-project directory path without symbolic links.",
          ),
        };
      if (index === segments.length - 1 && metadata.kind !== "file")
        return {
          ok: false,
          diagnostic: cliDiagnostic(
            "SDD_CONFIG_CLI_OUTPUT_INVALID",
            "The output target is not a regular file.",
            "Select a new path or an existing regular file.",
          ),
        };
    } catch (error) {
      if (isNotFound(error) && index === segments.length - 1) return { ok: true, target };
      return {
        ok: false,
        diagnostic: cliDiagnostic(
          "SDD_CONFIG_CLI_OUTPUT_PARENT_INVALID",
          "The output parent directory is unavailable.",
          "Create a safe in-project parent directory and run the command again.",
        ),
      };
    }
  }
  return { ok: true, target: resolveConfiguredPath(projectRoot, outputPath) };
}

export async function runCli(runtime: CliRuntime): Promise<ExitCode> {
  const parsed = parseInvocation(runtime.argv);
  const inferredCommand: ResponseCommand =
    runtime.argv[0] === "tests" && runtime.argv[1] === "discover"
      ? "tests.discover"
      : runtime.argv[0] === "findings" && runtime.argv[1] === "validate"
        ? "findings.validate"
        : runtime.argv[0] === "merge" && runtime.argv[1] === "check"
          ? "merge.check"
          : runtime.argv[0] === "proposal" &&
              (runtime.argv[1] === "validate" || runtime.argv[1] === "prepare" || runtime.argv[1] === "apply")
            ? `proposal.${runtime.argv[1]}`
            : runtime.argv[0] === "init" ||
                runtime.argv[0] === "id" ||
                runtime.argv[0] === "inspect" ||
                runtime.argv[0] === "trace" ||
                runtime.argv[0] === "diff" ||
                runtime.argv[0] === "validate"
              ? runtime.argv[0]
              : "unknown";
  const inferredFormat: OutputFormat = runtime.argv.some(
    (argument, index) => argument === "--format" && runtime.argv[index + 1] === "json",
  )
    ? "json"
    : "human";
  if (!parsed.ok) {
    emit(runtime, inferredFormat, response(inferredCommand, null, "error", null, [parsed.diagnostic]));
    return TECHNICAL_FAILURE_EXIT_CODE;
  }
  const invocation = parsed.value;
  try {
    if (invocation.command === "init") {
      const initialized = await initializeProject(
        { fileSystem: runtime.fileSystem, writer: runtime.projectWriter, randomness: runtime.randomness },
        {
          root: resolve(runtime.workingDirectory, invocation.root ?? "."),
          specPath: invocation.specPath ?? ("spec" as ProjectPath),
          adoption: invocation.adoption ?? "incremental",
        },
      );
      if (!initialized.ok) {
        const failure = initialized.failure;
        const diagnostic = cliDiagnostic(
          failure.code === "TARGET_CONFLICT"
            ? "SDD_INIT_TARGET_CONFLICT"
            : failure.code === "ROOT_INVALID"
              ? "SDD_INIT_ROOT_INVALID"
              : "SDD_INIT_TARGET_UNSAFE",
          failure.code === "TARGET_CONFLICT"
            ? "Initialization would overwrite an existing SDD Project file."
            : failure.code === "ROOT_INVALID"
              ? "The initialization root is not an existing directory."
              : "An initialization target is unsafe.",
          "Select an existing project root whose initialization targets do not conflict.",
        );
        emit(runtime, invocation.format, response("init", null, "error", null, [diagnostic]));
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      emit(
        runtime,
        invocation.format,
        response("init", initialized.value.projectId, "ok", { created_paths: initialized.value.createdPaths }, []),
      );
      return VALID_EXIT_CODE;
    }
    if (invocation.command === "id") {
      const selected = await resolveProject(
        runtime.fileSystem,
        invocation.configPath === undefined
          ? {
              kind: "nearest",
              start_directory:
                invocation.cwd === undefined
                  ? runtime.workingDirectory
                  : resolve(runtime.workingDirectory, invocation.cwd),
            }
          : { kind: "explicit", config_path: invocation.configPath, working_directory: runtime.workingDirectory },
      );
      if (selected.ok) {
        const project = selected.value;
        try {
          const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
          const identities = await buildCurrentProjectIdentityIndex(reader, runtime.fileSystem);
          if (identities.duplicateProjectIds.size > 0) {
            emit(
              runtime,
              invocation.format,
              response("id", project.configuration.project_id, "blocked", null, [duplicateProjectIdDiagnostic()]),
            );
            return BLOCKED_EXIT_CODE;
          }
          const resolvedRef = await reader.resolveRevision(
            invocation.historyRef ?? project.configuration.git.default_target_ref,
          );
          const history = await buildCanonicalHistoryIndex(reader, resolvedRef, project.configuration.project_id);
          if (history.status === "incomplete") {
            emit(
              runtime,
              invocation.format,
              response("id", project.configuration.project_id, "error", null, [historyIncompleteDiagnostic("error")]),
            );
            return TECHNICAL_FAILURE_EXIT_CODE;
          }
          if (invocation.idKind === undefined || invocation.count === undefined) {
            throw new Error("Parsed ID invocation is missing required values.");
          }
          const forbidden = new Set<GeneratedId>(
            invocation.idKind === "project"
              ? [...history.reservedProjectIds, ...identities.projectIdsByPath.values()]
              : history.reservedObjectIds,
          );
          if (invocation.idKind !== "project") {
            const loaded = await loadSpecificationDocuments(
              runtime.fileSystem,
              project.project_root,
              project.configuration.spec.root,
            );
            if (!loaded.ok) {
              emit(
                runtime,
                invocation.format,
                response("id", project.configuration.project_id, "blocked", null, loaded.diagnostics),
              );
              return BLOCKED_EXIT_CODE;
            }
            const graph = validateSpecificationGraph(loaded.value, project.configuration.spec.entrypoint);
            if (!graph.ok) {
              emit(
                runtime,
                invocation.format,
                response("id", project.configuration.project_id, "blocked", null, graph.diagnostics),
              );
              return BLOCKED_EXIT_CODE;
            }
            for (const objectId of graph.value.objects.keys()) forbidden.add(objectId);
          }
          const result: IdResult = {
            candidates: generateRandomIds(invocation.idKind, invocation.count, runtime.randomness, forbidden),
            history: { status: "complete", resolved_ref: resolvedRef },
          };
          emit(runtime, invocation.format, response("id", project.configuration.project_id, "ok", result, []));
          return VALID_EXIT_CODE;
        } catch (error) {
          const diagnostic = historyTechnicalDiagnostic(error);
          emit(
            runtime,
            invocation.format,
            response("id", project.configuration.project_id, "error", null, [diagnostic]),
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
      }
      const noProject = selected.diagnostics.every((diagnostic) => diagnostic.code === "SDD_CONFIG_NOT_FOUND");
      if (!noProject || invocation.configPath !== undefined) {
        emit(runtime, invocation.format, response("id", null, "error", null, selected.diagnostics));
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      if (invocation.historyRef !== undefined) {
        const diagnostic = cliDiagnostic(
          "SDD_ID_HISTORY_REF_REQUIRES_PROJECT",
          "A projectless ID cannot check a history ref.",
          "Remove --history-ref or select an SDD Project after project-aware history support is implemented.",
        );
        emit(runtime, invocation.format, response("id", null, "error", null, [diagnostic]));
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      if (invocation.idKind === undefined || invocation.count === undefined) {
        throw new Error("Parsed ID invocation is missing required values.");
      }
      const result: IdResult = {
        candidates: generateRandomIds(invocation.idKind, invocation.count, runtime.randomness),
        history: { status: "unchecked", resolved_ref: null },
      };
      emit(runtime, invocation.format, response("id", null, "ok", result, []));
      return VALID_EXIT_CODE;
    }
    const selected = await resolveProject(
      runtime.fileSystem,
      invocation.configPath === undefined
        ? {
            kind: "nearest",
            start_directory:
              invocation.cwd === undefined
                ? runtime.workingDirectory
                : resolve(runtime.workingDirectory, invocation.cwd),
          }
        : { kind: "explicit", config_path: invocation.configPath, working_directory: runtime.workingDirectory },
    );
    if (!selected.ok) {
      emit(runtime, invocation.format, response(invocation.command, null, "error", null, selected.diagnostics));
      return TECHNICAL_FAILURE_EXIT_CODE;
    }
    const project = selected.value;
    const selectedOutput =
      invocation.outputPath === undefined
        ? undefined
        : await resolveSafeOutputTarget(runtime.fileSystem, project.project_root, invocation.outputPath);
    if (selectedOutput !== undefined && !selectedOutput.ok) {
      emit(
        runtime,
        invocation.format,
        response(invocation.command, project.configuration.project_id, "error", null, [selectedOutput.diagnostic]),
      );
      return TECHNICAL_FAILURE_EXIT_CODE;
    }
    const outputTarget = selectedOutput?.target;
    if (invocation.command === "findings.validate") {
      try {
        if (invocation.inputManifestPath === undefined || invocation.findingPaths.length === 0)
          throw new Error("Parsed finding validation invocation is missing required inputs.");
        const [manifest, findings, resolutions] = await Promise.all([
          importSemanticAnalysisInputManifestFile(
            runtime.fileSystem,
            project.project_root,
            invocation.inputManifestPath,
            CLI_EVIDENCE_LIMITS,
          ),
          Promise.all(
            invocation.findingPaths.map((path) =>
              importFindingFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
            ),
          ),
          Promise.all(
            invocation.resolutionPaths.map((path) =>
              importFindingResolutionFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
            ),
          ),
        ]);
        const result = assessFindings({
          manifest,
          findings,
          resolutions,
          human_reviews: [],
          allowed_issuers: new Set(project.configuration.evidence.allowed_issuers),
          model_analysis_performed: true,
        });
        const projectMismatch = manifest.project_id !== project.configuration.project_id;
        const diagnostics = [
          ...(projectMismatch
            ? [
                cliDiagnostic(
                  "SDD_FINDING_PROJECT_MISMATCH",
                  "Finding inputs do not belong to the selected SDD Project.",
                  "Supply artifacts whose project_id matches the selected project.",
                ),
              ]
            : []),
          ...result.issues.map((issue) =>
            cliDiagnostic(
              issue.code,
              "A finding or resolution condition is not current and valid.",
              "Correct the cited manifest, Finding, configured issuer, or resolution evidence.",
            ),
          ),
        ];
        const blocked = projectMismatch || result.issues.some((issue) => issue.disposition === "BLOCKED");
        emit(
          runtime,
          invocation.format,
          response(
            "findings.validate",
            project.configuration.project_id,
            blocked ? "blocked" : "ok",
            result,
            diagnostics,
          ),
          outputTarget,
        );
        return blocked ? BLOCKED_EXIT_CODE : VALID_EXIT_CODE;
      } catch (error) {
        const diagnostic = cliDiagnostic(
          error instanceof EvidenceInputError ? error.code : "SDD_FINDING_INPUT_INVALID",
          error instanceof Error ? error.message : "Finding inputs could not be validated.",
          "Supply strict version 1 project-scoped finding artifacts.",
        );
        emit(
          runtime,
          invocation.format,
          response("findings.validate", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    if (invocation.command === "merge.check") {
      try {
        if (
          invocation.changePath === undefined ||
          invocation.packagePath === undefined ||
          !isProjectPath(invocation.packagePath) ||
          invocation.candidatePath === undefined ||
          !isProjectPath(invocation.candidatePath) ||
          invocation.testIndex === undefined
        ) {
          throw new Error("Parsed merge check invocation is missing required inputs.");
        }
        const candidatePath = await resolveProjectCandidatePath(
          runtime.fileSystem,
          project.project_root,
          invocation.candidatePath,
        );
        const [reader, change, packageValue, approvals, testIndexValue, testExecution, qa] = await Promise.all([
          discoverProcessGitReader(runtime.processRunner, project.project_root),
          importChangeDescriptorFile(runtime.fileSystem, project.project_root, invocation.changePath),
          importProjectJsonArtifact(
            runtime.fileSystem,
            project.project_root,
            invocation.packagePath,
            parseProposalPackage,
            16 * 1024 * 1024,
          ),
          Promise.all(
            invocation.approvalPaths.map((path) =>
              importApprovalEvidenceFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
            ),
          ),
          importTestIndexFile(
            runtime.fileSystem,
            project.project_root,
            invocation.testIndex,
            project.configuration.tests.import_limits.max_jsonl_bytes,
          ),
          Promise.all(
            invocation.testEvidencePaths.map((path) =>
              importTestExecutionEvidenceFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
            ),
          ),
          Promise.all(
            invocation.qaPaths.map((path) =>
              importQaEvidenceFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
            ),
          ),
        ]);
        const semanticReview =
          invocation.inputManifestPath === undefined
            ? undefined
            : await Promise.all([
                importSemanticAnalysisInputManifestFile(
                  runtime.fileSystem,
                  project.project_root,
                  invocation.inputManifestPath,
                  CLI_EVIDENCE_LIMITS,
                ),
                Promise.all(
                  invocation.findingPaths.map((path) =>
                    importFindingFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
                  ),
                ),
                Promise.all(
                  invocation.resolutionPaths.map((path) =>
                    importFindingResolutionFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
                  ),
                ),
                Promise.all(
                  invocation.humanReviewPaths.map((path) =>
                    importHumanSemanticReviewEvidenceFile(
                      runtime.fileSystem,
                      project.project_root,
                      path,
                      CLI_EVIDENCE_LIMITS,
                    ),
                  ),
                ),
              ]);
        const report = await runMergeGate({
          fileSystem: runtime.fileSystem,
          gitReader: reader,
          project,
          change: { artifact: change, source: invocation.changePath },
          package: { artifact: packageValue, source: invocation.packagePath },
          candidatePath,
          branch_head_ref: change.proposal_ref,
          integration_ref: change.integration_ref,
          approvals: approvals.map((artifact, index) => ({ artifact, source: invocation.approvalPaths[index]! })),
          governance: [],
          test_index: { artifact: testIndexValue, source: invocation.testIndex },
          test_execution: testExecution.map((artifact, index) => ({
            artifact,
            source: invocation.testEvidencePaths[index]!,
          })),
          qa: qa.map((artifact, index) => ({ artifact, source: invocation.qaPaths[index]! })),
          ...(semanticReview === undefined
            ? {}
            : {
                semantic_review: {
                  manifest: { artifact: semanticReview[0], source: invocation.inputManifestPath! },
                  findings: semanticReview[1].map((artifact, index) => ({
                    artifact,
                    source: invocation.findingPaths[index]!,
                  })),
                  resolutions: semanticReview[2].map((artifact, index) => ({
                    artifact,
                    source: invocation.resolutionPaths[index]!,
                  })),
                  human_reviews: semanticReview[3].map((artifact, index) => ({
                    artifact,
                    source: invocation.humanReviewPaths[index]!,
                  })),
                  model_analysis_performed: semanticReview[1].length > 0 || semanticReview[3].length === 0,
                },
              }),
          current_adapter_fingerprints: testIndexValue.subject.adapter_fingerprints,
        });
        const envelopeStatus =
          report.status === "PASS" ? "ok" : report.status === "BLOCKED" ? "blocked" : "review_required";
        emit(
          runtime,
          invocation.format,
          response("merge.check", project.configuration.project_id, envelopeStatus, report, report.diagnostics),
          outputTarget,
        );
        return report.status === "PASS"
          ? VALID_EXIT_CODE
          : report.status === "BLOCKED"
            ? BLOCKED_EXIT_CODE
            : REVIEW_REQUIRED_EXIT_CODE;
      } catch (error) {
        const code =
          error instanceof MergeInputError ||
          error instanceof EvidenceInputError ||
          error instanceof TestIndexInputError
            ? error.code
            : error instanceof GitReadError
              ? error.code === "GIT_REF_UNRESOLVED"
                ? "SDD_GIT_REF_UNRESOLVED"
                : "SDD_GIT_READ_FAILED"
              : error instanceof ProposalPackageInputError ||
                  error instanceof ProposalInputError ||
                  error instanceof ProposalPreparationError
                ? "code" in error
                  ? String(error.code)
                  : "SDD_GATE_INPUT_INVALID"
                : "SDD_GATE_INPUT_INVALID";
        const diagnostic = cliDiagnostic(
          code,
          error instanceof Error ? error.message : "Merge readiness could not be evaluated.",
          "Supply complete current project-scoped artifacts and resolvable Git refs.",
        );
        emit(
          runtime,
          invocation.format,
          response("merge.check", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    if (invocation.command === "proposal.apply") {
      try {
        if (invocation.patchPath === undefined) throw new Error("Parsed proposal apply invocation has no patch path.");
        const patch = await importSpecPatch(
          runtime.fileSystem,
          resolve(runtime.workingDirectory, invocation.patchPath),
        );
        const result = await applyProposal({
          fileSystem: runtime.fileSystem,
          writer: runtime.projectWriter,
          project,
          worktreeRoot:
            invocation.worktreePath === undefined
              ? project.project_root
              : resolve(runtime.workingDirectory, invocation.worktreePath),
          patch,
        });
        emit(
          runtime,
          invocation.format,
          response("proposal.apply", project.configuration.project_id, "ok", result, []),
        );
        return VALID_EXIT_CODE;
      } catch (error) {
        const technical =
          error instanceof SpecPatchInputError || !(error instanceof ProposalApplyError) || error.technical;
        const diagnostic = cliDiagnostic(
          error instanceof SpecPatchInputError || error instanceof ProposalApplyError ? error.code : "SDD_APPLY_FAILED",
          error instanceof Error ? error.message : "The specification patch could not be applied.",
          technical
            ? "Correct the patch file, worktree availability, or filesystem failure and run the command again."
            : "Restore the exact patch base and safe project paths, or regenerate the SpecPatch.",
        );
        emit(
          runtime,
          invocation.format,
          response("proposal.apply", project.configuration.project_id, technical ? "error" : "blocked", null, [
            diagnostic,
          ]),
        );
        return technical ? TECHNICAL_FAILURE_EXIT_CODE : BLOCKED_EXIT_CODE;
      }
    }
    if (invocation.command === "proposal.prepare") {
      try {
        if (
          invocation.packagePath === undefined ||
          invocation.candidatePath === undefined ||
          invocation.branchHeadRef === undefined ||
          invocation.integrationRef === undefined
        )
          throw new Error("Parsed proposal preparation invocation is missing required inputs.");
        const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
        const [packageValue, branchHead, integrationRef, approvalEvidence] = await Promise.all([
          importProposalPackage(runtime.fileSystem, resolve(runtime.workingDirectory, invocation.packagePath)),
          reader.resolveRevision(invocation.branchHeadRef),
          reader.resolveRevision(invocation.integrationRef),
          Promise.all(
            invocation.approvalPaths.map((path) =>
              importApprovalEvidenceFile(runtime.fileSystem, project.project_root, path, CLI_EVIDENCE_LIMITS),
            ),
          ),
        ]);
        const prepared = await prepareApprovedProposal({
          fileSystem: runtime.fileSystem,
          gitReader: reader,
          project,
          package: packageValue,
          candidatePath: resolve(runtime.workingDirectory, invocation.candidatePath),
          branchHead,
          integrationRef,
          approvalEvidence,
        });
        const specPatch =
          prepared.status !== "ok" || prepared.prepared_tree === undefined
            ? null
            : generateSpecPatch({
                project_id: project.configuration.project_id,
                integration: prepared.integration_tree,
                prepared: prepared.prepared_tree,
              });
        const status = prepared.status;
        const diagnostics = prepared.issues.map((issue) =>
          cliDiagnostic(
            issue.code,
            issue.code === "SDD_EVIDENCE_APPROVAL_MISSING"
              ? "Current ApprovalEvidence is required before branch preparation can emit a SpecPatch."
              : "Branch preparation did not satisfy an approval or preparation gate condition.",
            "Supply current configured ApprovalEvidence or resolve the reported preparation condition.",
          ),
        );
        emit(
          runtime,
          invocation.format,
          response(
            "proposal.prepare",
            project.configuration.project_id,
            status,
            { conflict_report: prepared.report, spec_patch: specPatch },
            diagnostics,
          ),
          outputTarget,
        );
        return status === "ok"
          ? VALID_EXIT_CODE
          : status === "review_required"
            ? REVIEW_REQUIRED_EXIT_CODE
            : BLOCKED_EXIT_CODE;
      } catch (error) {
        const mechanicalCode =
          error instanceof ProposalPreparationError &&
          [
            "SDD_PREPARE_PACKAGE_PROJECT_MISMATCH",
            "SDD_PREPARE_PACKAGE_BASE_UNBOUND",
            "SDD_PREPARE_CANDIDATE_SOURCE_MISMATCH",
            "SDD_PREPARE_PACKAGE_STALE",
            "SDD_PREPARE_CANDIDATE_CHANGED",
          ].includes(error.code);
        const mechanicalValidation = error instanceof ProposalValidationError && !error.technical;
        const mechanicalInput = error instanceof ProposalInputError && !error.technical;
        if (mechanicalCode || mechanicalValidation || mechanicalInput) {
          const diagnostic =
            error instanceof ProposalValidationError
              ? error.diagnostic
              : cliDiagnostic(
                  error instanceof ProposalPreparationError || error instanceof ProposalInputError
                    ? error.code
                    : "SDD_PREPARE_MECHANICAL_BLOCK",
                  error instanceof Error ? error.message : "Preparation is mechanically blocked.",
                  "Regenerate the ProposalPackage or restore its exact candidate and project bindings.",
                );
          emit(
            runtime,
            invocation.format,
            response("proposal.prepare", project.configuration.project_id, "blocked", null, [diagnostic]),
            outputTarget,
          );
          return BLOCKED_EXIT_CODE;
        }
        const diagnostic =
          error instanceof ProposalPackageInputError
            ? cliDiagnostic(
                "SDD_PREPARE_PACKAGE_INVALID",
                error.message,
                "Supply a strict bounded version 1 ProposalPackage file.",
              )
            : error instanceof ProposalPreparationError
              ? cliDiagnostic(error.code, error.message, "Correct the preparation inputs and run the command again.")
              : error instanceof ProposalValidationError
                ? error.diagnostic
                : comparisonTechnicalDiagnostic(error);
        emit(
          runtime,
          invocation.format,
          response("proposal.prepare", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    if (invocation.command === "proposal.validate") {
      try {
        if (
          invocation.baseRef === undefined ||
          invocation.proposalMode === undefined ||
          invocation.candidatePath === undefined
        ) {
          throw new Error("Parsed proposal invocation is missing required inputs.");
        }
        const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
        const baseRef = await reader.resolveRevision(invocation.baseRef);
        const result = await validateProposal({
          fileSystem: runtime.fileSystem,
          gitReader: reader,
          project,
          baseRef,
          candidatePath: resolve(runtime.workingDirectory, invocation.candidatePath),
          mode: invocation.proposalMode,
          codeTargets: invocation.codeTargets,
        });
        emit(
          runtime,
          invocation.format,
          response("proposal.validate", project.configuration.project_id, "ok", result, []),
          outputTarget,
        );
        return VALID_EXIT_CODE;
      } catch (error) {
        if (error instanceof ProposalValidationError) {
          emit(
            runtime,
            invocation.format,
            response(
              "proposal.validate",
              project.configuration.project_id,
              error.technical ? "error" : "blocked",
              null,
              [error.diagnostic],
            ),
            outputTarget,
          );
          return error.technical ? TECHNICAL_FAILURE_EXIT_CODE : BLOCKED_EXIT_CODE;
        }
        const diagnostic = comparisonTechnicalDiagnostic(error);
        emit(
          runtime,
          invocation.format,
          response("proposal.validate", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    if (invocation.command === "tests.discover") {
      try {
        if (invocation.headRef === undefined) throw new Error("Parsed test discovery invocation has no head ref.");
        const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
        const headRef = await reader.resolveRevision(invocation.headRef);
        const graph = await loadCanonicalProjectGraphAt(reader, headRef, project.configuration.project_id);
        if (graph === undefined) {
          emit(
            runtime,
            invocation.format,
            response("tests.discover", project.configuration.project_id, "error", null, [
              projectSnapshotMissingDiagnostic(),
            ]),
            outputTarget,
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
        const discovered = await discoverProjectTests({
          fileSystem: runtime.fileSystem,
          processRunner: runtime.processRunner,
          project,
          head_ref: headRef,
          known_requirement_ids: new Set([...graph.objects.keys()].filter(isRequirementId)),
          adapter_ids: invocation.adapterIds,
          import_jsonl: invocation.importJsonl,
          import_junit: invocation.importJunit,
          allowed_environment: runtime.adapterEnvironment ?? {},
        });
        emit(
          runtime,
          invocation.format,
          response(
            "tests.discover",
            project.configuration.project_id,
            "ok",
            discovered.index,
            discovered.warnings.map((code) =>
              cliDiagnostic(
                code,
                "A test producer did not retain nested suite hierarchy.",
                "Review the normalized full names or use a producer that retains hierarchy.",
                "warning",
              ),
            ),
          ),
          outputTarget,
        );
        return VALID_EXIT_CODE;
      } catch (error) {
        const diagnostic =
          error instanceof GitReadError
            ? comparisonTechnicalDiagnostic(error)
            : error instanceof HistoryIndexError
              ? projectSnapshotInvalidDiagnostic()
              : adapterTechnicalDiagnostic(error);
        emit(
          runtime,
          invocation.format,
          response("tests.discover", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    if (invocation.command === "diff") {
      try {
        if (invocation.baseRef === undefined || invocation.targetRef === undefined) {
          throw new Error("Parsed diff invocation is missing required refs.");
        }
        const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
        const resolved = new Map<string, GitObjectId>();
        const resolveOnce = async (ref: string): Promise<GitObjectId> => {
          const existing = resolved.get(ref);
          if (existing !== undefined) return existing;
          const objectId = await reader.resolveRevision(ref);
          resolved.set(ref, objectId);
          return objectId;
        };
        const baseRef = await resolveOnce(invocation.baseRef);
        const targetRef = await resolveOnce(invocation.targetRef);
        const [baseGraph, targetGraph] = await Promise.all([
          loadCanonicalProjectGraphAt(reader, baseRef, project.configuration.project_id),
          loadCanonicalProjectGraphAt(reader, targetRef, project.configuration.project_id),
        ]);
        if (baseGraph === undefined || targetGraph === undefined) {
          emit(
            runtime,
            invocation.format,
            response("diff", project.configuration.project_id, "error", null, [projectSnapshotMissingDiagnostic()]),
            outputTarget,
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
        let verificationIndexes: { readonly before: TestIndex; readonly after: TestIndex } | undefined;
        if (invocation.baseTestIndex !== undefined && invocation.targetTestIndex !== undefined) {
          const maxBytes = project.configuration.tests.import_limits.max_jsonl_bytes;
          const [beforeIndex, afterIndex] = await Promise.all([
            importTestIndexFile(runtime.fileSystem, project.project_root, invocation.baseTestIndex, maxBytes),
            importTestIndexFile(runtime.fileSystem, project.project_root, invocation.targetTestIndex, maxBytes),
          ]);
          validateTestIndexSubject(beforeIndex, {
            project_id: project.configuration.project_id,
            head_ref: baseRef,
            known_requirement_ids: knownRequirementIds(baseGraph),
          });
          validateTestIndexSubject(afterIndex, {
            project_id: project.configuration.project_id,
            head_ref: targetRef,
            known_requirement_ids: knownRequirementIds(targetGraph),
          });
          verificationIndexes = { before: beforeIndex, after: afterIndex };
        }
        const result: DiffResult = {
          base_ref: baseRef,
          target_ref: targetRef,
          ...deltaClassesResult(baseGraph, targetGraph, verificationIndexes),
        };
        emit(
          runtime,
          invocation.format,
          response("diff", project.configuration.project_id, "ok", result, []),
          outputTarget,
        );
        return VALID_EXIT_CODE;
      } catch (error) {
        const diagnostic =
          error instanceof TestIndexInputError
            ? adapterTechnicalDiagnostic(error)
            : error instanceof HistoryIndexError
              ? projectSnapshotInvalidDiagnostic()
              : comparisonTechnicalDiagnostic(error);
        emit(
          runtime,
          invocation.format,
          response("diff", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    if (invocation.command === "trace" && invocation.traceRef !== undefined) {
      try {
        const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
        const resolvedRef = await reader.resolveRevision(invocation.traceRef);
        const traceGraph = await loadCanonicalProjectGraphAt(reader, resolvedRef, project.configuration.project_id);
        if (traceGraph === undefined) {
          emit(
            runtime,
            invocation.format,
            response("trace", project.configuration.project_id, "error", null, [projectSnapshotMissingDiagnostic()]),
            outputTarget,
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
        const graphTrace = traceGraphObject(traceGraph, invocation.objectId!);
        if (graphTrace === undefined) {
          const diagnostic = cliDiagnostic(
            "SDD_GRAPH_OBJECT_UNKNOWN",
            "The requested object does not exist in the selected graph.",
            "Use an active CAP, REQ, or CON ID.",
          );
          emit(
            runtime,
            invocation.format,
            response("trace", project.configuration.project_id, "error", null, [diagnostic]),
            outputTarget,
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
        let result: TraceResult = graphTrace;
        if (invocation.testIndex !== undefined) {
          const index = await importTestIndexFile(
            runtime.fileSystem,
            project.project_root,
            invocation.testIndex,
            project.configuration.tests.import_limits.max_jsonl_bytes,
          );
          validateTestIndexSubject(index, {
            project_id: project.configuration.project_id,
            head_ref: resolvedRef,
            known_requirement_ids: knownRequirementIds(traceGraph),
          });
          result = mappedTrace(graphTrace, index);
        }
        emit(
          runtime,
          invocation.format,
          response("trace", project.configuration.project_id, "ok", result, []),
          outputTarget,
        );
        return VALID_EXIT_CODE;
      } catch (error) {
        const diagnostic =
          error instanceof TestIndexInputError
            ? adapterTechnicalDiagnostic(error)
            : error instanceof HistoryIndexError
              ? projectSnapshotInvalidDiagnostic()
              : comparisonTechnicalDiagnostic(error);
        emit(
          runtime,
          invocation.format,
          response("trace", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    const loaded = await loadSpecificationDocuments(
      runtime.fileSystem,
      project.project_root,
      project.configuration.spec.root,
    );
    if (!loaded.ok) {
      const technical = loaded.diagnostics.some((item) => /_READ_FAILED$/u.test(item.code));
      emit(
        runtime,
        invocation.format,
        response(
          invocation.command,
          project.configuration.project_id,
          technical ? "error" : "blocked",
          invocation.command === "validate" && !technical ? { valid: false } : null,
          loaded.diagnostics,
        ),
        outputTarget,
      );
      return technical ? TECHNICAL_FAILURE_EXIT_CODE : BLOCKED_EXIT_CODE;
    }
    const graph = validateSpecificationGraph(loaded.value, project.configuration.spec.entrypoint);
    if (!graph.ok) {
      emit(
        runtime,
        invocation.format,
        response(
          invocation.command,
          project.configuration.project_id,
          "blocked",
          invocation.command === "validate" ? { valid: false } : null,
          graph.diagnostics,
        ),
        outputTarget,
      );
      return BLOCKED_EXIT_CODE;
    }
    if (invocation.command === "inspect") {
      const result = inspectResult(graph.value, invocation.objectId!, invocation.includeExplanatory);
      if (result === undefined) {
        const diagnostic = cliDiagnostic(
          "SDD_GRAPH_OBJECT_UNKNOWN",
          "The requested object does not exist in the active graph.",
          "Use an active CAP, REQ, or CON ID.",
        );
        emit(
          runtime,
          invocation.format,
          response(invocation.command, project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      emit(
        runtime,
        invocation.format,
        response(invocation.command, project.configuration.project_id, "ok", result, graph.diagnostics),
        outputTarget,
      );
      return VALID_EXIT_CODE;
    }
    if (invocation.command === "trace") {
      const graphTrace = traceGraphObject(graph.value, invocation.objectId!);
      if (graphTrace === undefined) {
        const diagnostic = cliDiagnostic(
          "SDD_GRAPH_OBJECT_UNKNOWN",
          "The requested object does not exist in the active graph.",
          "Use an active CAP, REQ, or CON ID.",
        );
        emit(
          runtime,
          invocation.format,
          response("trace", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
      let result: TraceResult = graphTrace;
      if (invocation.testIndex !== undefined) {
        try {
          const reader = await discoverProcessGitReader(runtime.processRunner, project.project_root);
          const headRef = await reader.resolveRevision("HEAD");
          const headGraph = await loadCanonicalProjectGraphAt(reader, headRef, project.configuration.project_id);
          if (headGraph === undefined) throw new HistoryIndexError("Project missing from the HEAD snapshot.");
          const worktreeDelta = computeGraphObjectDelta(headGraph, graph.value);
          if (worktreeDelta.semantic.entries.length > 0 || worktreeDelta.structural.entries.length > 0) {
            throw new TestIndexInputError(
              "SDD_ADAPTER_TEST_INDEX_SUBJECT_MISMATCH",
              "The worktree graph differs from the TestIndex Git subject.",
            );
          }
          const index = await importTestIndexFile(
            runtime.fileSystem,
            project.project_root,
            invocation.testIndex,
            project.configuration.tests.import_limits.max_jsonl_bytes,
          );
          validateTestIndexSubject(index, {
            project_id: project.configuration.project_id,
            head_ref: headRef,
            known_requirement_ids: knownRequirementIds(graph.value),
          });
          result = mappedTrace(graphTrace, index);
        } catch (error) {
          const diagnostic =
            error instanceof TestIndexInputError
              ? adapterTechnicalDiagnostic(error)
              : error instanceof HistoryIndexError
                ? projectSnapshotInvalidDiagnostic()
                : comparisonTechnicalDiagnostic(error);
          emit(
            runtime,
            invocation.format,
            response("trace", project.configuration.project_id, "error", null, [diagnostic]),
            outputTarget,
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
      }
      emit(
        runtime,
        invocation.format,
        response("trace", project.configuration.project_id, "ok", result, graph.diagnostics),
        outputTarget,
      );
      return VALID_EXIT_CODE;
    }
    let validationReader: GitReader | undefined;
    const resolvedValidationRefs = new Map<string, Promise<GitObjectId>>();
    const getValidationReader = async (): Promise<GitReader> => {
      validationReader ??= await discoverProcessGitReader(runtime.processRunner, project.project_root);
      return validationReader;
    };
    const resolveValidationRef = async (ref: string): Promise<GitObjectId> => {
      const existing = resolvedValidationRefs.get(ref);
      if (existing !== undefined) return existing;
      const objectId = getValidationReader().then((reader) => reader.resolveRevision(ref));
      resolvedValidationRefs.set(ref, objectId);
      return objectId;
    };
    let comparison: ValidateComparisonResult | undefined;
    if (invocation.changedFrom !== undefined) {
      try {
        const reader = await getValidationReader();
        const [changedFromRef] = await Promise.all([
          resolveValidationRef(invocation.changedFrom),
          resolveValidationRef(project.configuration.git.default_target_ref),
          resolveValidationRef("HEAD"),
        ]);
        const baseGraph = await loadCanonicalProjectGraphAt(reader, changedFromRef, project.configuration.project_id);
        if (baseGraph === undefined) {
          emit(
            runtime,
            invocation.format,
            response("validate", project.configuration.project_id, "error", null, [projectSnapshotMissingDiagnostic()]),
            outputTarget,
          );
          return TECHNICAL_FAILURE_EXIT_CODE;
        }
        comparison = { changed_from_ref: changedFromRef, ...deltaClassesResult(baseGraph, graph.value) };
      } catch (error) {
        const diagnostic =
          error instanceof HistoryIndexError
            ? projectSnapshotInvalidDiagnostic()
            : comparisonTechnicalDiagnostic(error);
        emit(
          runtime,
          invocation.format,
          response("validate", project.configuration.project_id, "error", null, [diagnostic]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    let validationHistory: ValidateResult["history"] = { status: "incomplete", resolved_ref: null };
    const historyDiagnostics: Diagnostic[] = [];
    try {
      const reader = await getValidationReader();
      const identities = await buildCurrentProjectIdentityIndex(reader, runtime.fileSystem);
      if (identities.duplicateProjectIds.size > 0) {
        emit(
          runtime,
          invocation.format,
          response("validate", project.configuration.project_id, "blocked", { valid: false }, [
            duplicateProjectIdDiagnostic(),
          ]),
          outputTarget,
        );
        return BLOCKED_EXIT_CODE;
      }
      const resolvedRef = await resolveValidationRef(project.configuration.git.default_target_ref);
      const currentRevision = await resolveValidationRef("HEAD");
      const mergeBase = await reader.findMergeBase(currentRevision, resolvedRef);
      const historyStatus = await reader.historyStatus();
      validationHistory = { status: mergeBase === undefined ? "incomplete" : historyStatus, resolved_ref: resolvedRef };
      if (mergeBase === undefined) {
        historyDiagnostics.push(historyIncompleteDiagnostic("warning"));
      } else {
        const integrationIds = await loadCanonicalProjectObjectIdsAt(
          reader,
          resolvedRef,
          project.configuration.project_id,
        );
        const baselineIds = await loadCanonicalProjectObjectIdsAt(reader, mergeBase, project.configuration.project_id);
        const newlyIntroducedIds = [...graph.value.objects.keys()].filter((objectId) => !baselineIds.has(objectId));
        const parallelCollisions = newlyIntroducedIds.filter((objectId) => integrationIds.has(objectId));
        let reusedIds: readonly ObjectId[] = parallelCollisions;
        if (newlyIntroducedIds.length > 0) {
          const history = await buildCanonicalHistoryIndex(reader, resolvedRef, project.configuration.project_id);
          reusedIds = newlyIntroducedIds.filter((objectId) => history.reservedObjectIds.has(objectId));
        }
        const sortedReusedIds = [...new Set(reusedIds)].toSorted();
        if (sortedReusedIds.length > 0) {
          emit(
            runtime,
            invocation.format,
            response(
              "validate",
              project.configuration.project_id,
              "blocked",
              { valid: false },
              sortedReusedIds.map(reusedObjectIdDiagnostic),
            ),
            outputTarget,
          );
          return BLOCKED_EXIT_CODE;
        }
        if (historyStatus === "incomplete") historyDiagnostics.push(historyIncompleteDiagnostic("warning"));
      }
    } catch (error) {
      if (error instanceof HistoryIndexError || error instanceof ProjectIdentityError) {
        emit(
          runtime,
          invocation.format,
          response("validate", project.configuration.project_id, "blocked", { valid: false }, [
            historyTechnicalDiagnostic(error),
          ]),
          outputTarget,
        );
        return BLOCKED_EXIT_CODE;
      }
      if (error instanceof GitReadError && error.code === "GIT_REPOSITORY_UNAVAILABLE") {
        historyDiagnostics.push(historyIncompleteDiagnostic("warning"));
      } else {
        emit(
          runtime,
          invocation.format,
          response("validate", project.configuration.project_id, "error", null, [historyTechnicalDiagnostic(error)]),
          outputTarget,
        );
        return TECHNICAL_FAILURE_EXIT_CODE;
      }
    }
    emit(
      runtime,
      invocation.format,
      response(
        invocation.command,
        project.configuration.project_id,
        "ok",
        validateResult(graph.value, validationHistory, comparison),
        [...graph.diagnostics, ...historyDiagnostics],
      ),
      outputTarget,
    );
    return VALID_EXIT_CODE;
  } catch {
    const diagnostic = cliDiagnostic(
      "SDD_CONFIG_CLI_INTERNAL_FAILURE",
      "The command did not complete.",
      "Retry the command and report the stable diagnostic code if it persists.",
    );
    emit(runtime, invocation.format, response(invocation.command, null, "error", null, [diagnostic]));
    runtime.writeStandardError("sdd: command failed with an internal technical error.\n");
    return TECHNICAL_FAILURE_EXIT_CODE;
  }
}
