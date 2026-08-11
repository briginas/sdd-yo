export type CliHelpEntry = {
  readonly path: string;
  readonly usage: string;
  readonly summary: string;
};

export const CLI_HELP_ENTRIES: readonly CliHelpEntry[] = [
  {
    path: "skill install",
    usage: "sdd skill install (--root <repository-root> | --scope user)",
    summary: "Install the packaged Skill in one explicit repository or macOS user store.",
  },
  {
    path: "skill update",
    usage: "sdd skill update (--root <repository-root> | --scope user)",
    summary: "Update one verified repository-scoped or macOS user-scoped installation.",
  },
  {
    path: "skill remove",
    usage: "sdd skill remove (--root <repository-root> | --scope user)",
    summary: "Remove one verified repository-scoped or macOS user-scoped installation.",
  },
  {
    path: "init",
    usage: "sdd init [--root <path>] [--spec-path <path>] [--adoption incremental|complete]",
    summary: "Initialize a new SDD Project without overwriting existing files.",
  },
  {
    path: "id",
    usage: "sdd id project|capability|requirement|concept [--count <n>] [--history-ref <git-ref>]",
    summary: "Generate checked SDD identifiers.",
  },
  {
    path: "validate",
    usage: "sdd validate [--ref <git-ref>] [--history-ref <git-ref>] [--changed-from <git-ref>]",
    summary: "Validate a selected specification and its identity history.",
  },
  {
    path: "inspect",
    usage: "sdd inspect <CAP-ID|REQ-ID|CON-ID> [--ref <git-ref>] [--include explanatory]",
    summary: "Inspect one specification object and its relationships.",
  },
  {
    path: "trace",
    usage: "sdd trace <CAP-ID|REQ-ID|CON-ID> [--ref <git-ref>] [--test-index <path>]",
    summary: "Trace graph relationships and optional mapped tests.",
  },
  {
    path: "diff",
    usage: "sdd diff --base <git-ref> --target <git-ref> [--base-test-index <path> --target-test-index <path>]",
    summary: "Compare deterministic specification and optional verification deltas.",
  },
  {
    path: "candidate snapshot",
    usage: "sdd candidate snapshot --base <git-ref> --candidate-ref <git-ref> --manifest <project-relative-path>",
    summary: "Create an immutable candidate-tree manifest in an ignored staging path.",
  },
  {
    path: "approval record",
    usage:
      "sdd approval record --bundle <project-relative-path> --issuer <name> --actor <identity> --decision approved|rejected --reason <project-relative-path> --evidence <project-relative-path>",
    summary: "Record one explicit human decision as immutable ApprovalEvidence.",
  },
  {
    path: "tests discover",
    usage:
      "sdd tests discover --head <git-ref> [--adapter <id> ...] [--import-junit <path> ...] [--import-jsonl <path> ...]",
    summary: "Discover or import tests into a normalized TestIndex.",
  },
  {
    path: "findings validate",
    usage: "sdd findings validate --input-manifest <path> --findings <path> [--resolutions <path> ...]",
    summary: "Validate semantic findings and optional resolutions.",
  },
  {
    path: "merge check",
    usage:
      "sdd merge check --change <path> --package <path> --candidate <path> --approval <path> --test-index <path> --test-evidence <path> ... --qa <path> ... [semantic-review options]",
    summary: "Evaluate governed-scope merge readiness without modifying Git.",
  },
  {
    path: "proposal materialize",
    usage:
      "sdd proposal materialize --mode spec-code|spec|code --base <git-ref> [--candidate <path>] [--code-target <REQ-ID> ...] --bundle <project-relative-path>",
    summary: "Atomically retain a mode-correct exact proposal subject.",
  },
  {
    path: "proposal validate",
    usage: "sdd proposal validate --bundle <project-relative-path>",
    summary: "Revalidate an exact retained proposal subject without writing.",
  },
  {
    path: "proposal prepare",
    usage:
      "sdd proposal prepare --package <path> --candidate <path> --branch-head <git-ref> --integration-ref <git-ref> [--approval <project-relative-path> ...]",
    summary: "Prepare a ConflictReport and exact SpecPatch without writing the worktree.",
  },
  {
    path: "proposal apply",
    usage: "sdd proposal apply --patch <path> [--worktree <path>]",
    summary: "Apply one exact SpecPatch atomically without creating a commit.",
  },
] as const;

const GLOBAL_OPTIONS = [
  "--config <path>       Select an exact .sdd/config.yaml.",
  "--cwd <path>          Resolve the nearest project from this directory.",
  "--format human|json   Select output; human is the interactive default.",
  "--output <path>       Write a command's primary artifact.",
  "--quiet               Suppress non-primary human diagnostics.",
  "--help                Show top-level help.",
  "--version             Report CLI or machine-readable compatibility identity.",
] as const;

function topLevelHelp(): string {
  return [
    "sdd - repository-native specification governance",
    "",
    "Usage: sdd <command> [options]",
    "",
    "Commands:",
    ...CLI_HELP_ENTRIES.map((entry) => `  ${entry.path.padEnd(20)} ${entry.summary}`),
    "",
    "Global options:",
    ...GLOBAL_OPTIONS.map((option) => `  ${option}`),
    "",
    "Run sdd <command-path> --help for command-specific syntax.",
    "",
  ].join("\n");
}

function commandHelp(entry: CliHelpEntry): string {
  return [`Usage: ${entry.usage}`, "", entry.summary, "", "Run sdd --help for global options.", ""].join("\n");
}

export function renderCliHelp(argv: readonly string[]): string | undefined {
  if (argv.length === 1 && argv[0] === "--help") return topLevelHelp();
  if (argv.at(-1) !== "--help") return undefined;
  const path = argv.slice(0, -1).join(" ");
  const entry = CLI_HELP_ENTRIES.find((candidate) => candidate.path === path);
  return entry === undefined ? undefined : commandHelp(entry);
}
