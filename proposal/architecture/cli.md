# Command-line interface

## Executable and global behavior

The provisional executable is `sdd`. All commands accept:

```text
--config <path>       Select an exact .sdd/config.yaml.
--cwd <path>          Resolve the nearest project from this directory.
--format human|json   Select output; human is the interactive default.
--output <path>       Write the primary artifact to a new or replaced file.
--quiet               Suppress non-primary human diagnostics.
```

`--config` and `--cwd` are mutually exclusive. Without either, resolution
starts at the process working directory. JSON goes to stdout unless `--output`
is given; logs and progress go to stderr. Colors are disabled for JSON and
when stdout is not a terminal.

`--project` is not a version 1 selector. When invocation or resolution cannot
select one SDD Project, recovery names the supported alternatives explicitly:
use `--cwd <project-root>` to search upward from a directory, or use
`--config <project-root>/.sdd/config.yaml` to select the exact configuration.

After `sdd init`, the invoker checks whether the host repository's existing
formatter owns the created file types and, when it does, formats only the
created files before producing fingerprint-bound proposals or evidence. SDD Yo
does not detect, install, configure, or execute a formatter; if the host
formatter ignores those file types, onboarding records that boundary and
leaves the deterministic initialized bytes unchanged.

Every JSON response has:

```json
{
  "schema_version": "1.0",
  "command": "validate",
  "project_id": "SDD-17EF8B29",
  "status": "ok",
  "result": {},
  "diagnostics": []
}
```

Arrays representing sets are deterministically sorted. Human output is a view
over this object and is not parsed by automation.

`candidate snapshot` additionally requires `--manifest`; that path receives
the reusable CandidateTreeManifest while the ordinary command response remains
on stdout. `--output` is unavailable for this command so a response write
cannot partially follow successful immutable artifact creation.

## Exit codes

General commands use:

- `0`: operation completed and no blocking validation diagnostic exists;
- `1`: the requested validation or gate result is blocked;
- `2`: a gate result requires human review;
- `3`: invocation, configuration, I/O, protocol, or internal technical failure.

`merge check` maps `PASS`, `BLOCKED`, and `REVIEW_REQUIRED` to `0`, `1`, and
`2`. A crash, panic, uncaught exception, or incomplete result must never exit
`0`.

`proposal prepare` returns `0` with an exact SpecPatch when approval and
preparation are current and clean, `2` with `status: "review_required"` and a
null patch when approval is missing or review is required, `1` for stale,
rejected, contradictory, mismatched, or definitely blocked inputs, and `3` for
malformed inputs, I/O, unresolved refs, missing merge bases, or other technical
failures.

## Commands

### `sdd skill install`

```text
sdd skill install --root <repository-root>
```

Installs the verified Skill payload from the executing private package at
`.agents/skills/sdd-yo` in one explicitly selected Git repository root. It can
run before SDD Project initialization, does not use `--cwd` or `--config`, and
refuses an existing destination, symlink traversal, incompatible payload, or a
CLI path outside the selected repository. Its version 1 result contains the
repository-relative destination, sorted installed paths, payload fingerprint,
and exact compatibility identity. Update and removal are separate future
commands.

### `sdd init`

```text
sdd init [--root <path>] [--spec-path <path>] [--adoption incremental|complete]
```

Creates `.sdd/config.yaml` plus the minimal `spec/README.md`,
`spec/capabilities/`, and `spec/concepts/` structure. It refuses to overwrite
existing files unless a future explicit migration command owns that behavior.
The generated project ID is cryptographically random. The empty initial
specification contains no Capability, Requirement, or Domain Concept ID.

### `sdd id`

```text
sdd id project|capability|requirement|concept [--count <n>] [--history-ref <git-ref>]
```

Generates uppercase random IDs and checks the selected repository's complete
Git history when a project resolves. Without a project it can generate
candidates but marks historical uniqueness as unchecked. With a project,
`--history-ref` selects the integration history tip; otherwise the resolved
project's configured `git.default_target_ref` is used. `--count` defaults to
`1`, accepts integers from `1` through `256`, and returns candidates unique
within that invocation; a random collision is retried rather than returned.

### `sdd validate`

```text
sdd validate [--ref <git-ref>] [--history-ref <git-ref>] [--changed-from <git-ref>]
```

Parses configuration and specification, resolves the graph, validates
identities and links, checks historical reuse, and computes fingerprints.
`--ref` selects the specification snapshot but does not change the history
tip. `--history-ref` overrides the configured history tip. `--changed-from`
additionally reports semantic and structural object deltas against the named
ref.

### `sdd inspect`

```text
sdd inspect <CAP-ID|REQ-ID|CON-ID> [--ref <git-ref>] [--include explanatory]
```

Returns the typed object, owning document, normative sections, relations,
reverse relations, and fingerprints.

### `sdd trace`

```text
sdd trace <CAP-ID|REQ-ID|CON-ID> [--ref <git-ref>] [--test-index <path>]
```

Returns graph ancestry, dependencies, dependents, referring objects, and
mapped tests when an index is supplied. It does not run tests. The base
graph-only result contains:

```text
object_id, ancestry, dependencies, dependents, referrers
```

For a Requirement, `ancestry` contains its owning Capability, `dependencies`
and `dependents` are transitive `depends-on` closures that exclude the selected
Requirement, and `referrers` contains direct inbound active relations with
relation type and source ID. Capability and Concept ancestry and dependency
closures are empty. Set-like arrays are sorted by object ID. TestIndex-backed
mapped tests are an additive test-traceability behavior and are not required
for graph-only trace. A supplied TestIndex must match the selected project,
resolved Git subject, and active Requirement identities. For a worktree trace,
`HEAD` and the worktree graph must have equal semantic and structural
fingerprints before the HEAD-bound index is accepted.

### `sdd diff`

```text
sdd diff --base <git-ref> --target <git-ref> \
  [--base-test-index <path> --target-test-index <path>]
```

Produces semantic and structural object-delta entries and fingerprints between
two validated Git specification snapshots. The result identifies its available
fingerprint classes and does not represent an unavailable verification class
as an empty delta. Verification deltas become available with TestIndex support.
Proposal validation owns candidate directory/manifest input, and later finding
analysis owns semantic-review candidates; the base `diff` command emits neither
an approval nor a review conclusion.

The version 1 base result reports resolved opaque `base_ref` and `target_ref`
object IDs, `available_classes: ["semantic", "structural"]`,
`unavailable_classes: ["verification"]`, and a `deltas` object. Each available
class contains `entries`, the exact compact `canonical_json_utf8` string, and
its `fingerprint`. `validate --changed-from` uses the same class fields under a
`comparison` result, reports the resolved `changed_from_ref`, and compares it
to the selected worktree graph rather than claiming a target Git object ID.
Supplying both subject-matched TestIndexes adds `verification` to
`available_classes`, removes it from `unavailable_classes`, and adds its
independently canonicalized delta. Supplying only one index is invalid.

### `sdd candidate snapshot`

```text
sdd candidate snapshot --base <git-ref> --candidate-ref <git-ref> \
  --manifest <project-relative-path>
```

Resolves each supplied ref once, loads the selected SDD Project from both Git
trees, and creates one deterministic CandidateTreeManifest at a new regular
file under an existing Git-ignored project-local staging directory. The
manifest binds the base specification-tree fingerprint and contains the
path-sorted exact UTF-8 candidate specification files and hashes. It can be
supplied directly to each existing `--candidate` input after byte-for-byte
materialization from durable storage.

The command rejects a missing or mismatched project at either ref, invalid
specification trees, traversal, symbolic-link output components, missing
parents, a path inside the configured specification root, a path not ignored
by Git, and an existing manifest target. It does not read the working-tree
candidate, create `.sdd/config.yaml`, replace retained bytes, ingest an
archive, mutate Git, or establish a durable store. The invoker exports the
manifest before optionally removing the staging copy.

### `sdd proposal validate`

```text
sdd proposal validate --mode spec-code|spec|code --base <git-ref> \
  --candidate <path> [--code-target <REQ-ID> ...]
```

Mechanically validates a candidate and emits a deterministic
`ProposalPackage`. In version 1, `--candidate` accepts either an SDD Project
directory or a CandidateTreeManifest file; archive ingestion is reserved for a
future CLI version. `spec-code` and `spec` require a non-empty semantic delta.
`code` requires empty semantic and structural deltas plus one or more active
Requirement targets, whose semantic and structural fingerprints are captured
in the package. This operation does not validate implementation-behavior,
existing-behavior, approval, or semantic-review claims.

### `sdd proposal prepare`

```text
sdd proposal prepare --package <path> --candidate <path> \
  --branch-head <git-ref> --integration-ref <git-ref> \
  [--approval <project-relative-path> ...]
```

Performs mechanical three-way analysis and emits a ConflictReport plus an exact
`SpecPatch`. `B` is `package.base.git_ref`; `P` is the exact candidate directory
or CandidateTreeManifest supplied again and revalidated against the package
candidate-tree and object-delta fingerprints; `H` is `--branch-head`; and `M`
is `--integration-ref`. It reads refs and candidate state but does not write
them. ApprovalEvidence must name the exact project, configured issuer, approved
mode, base object ID, and semantic and structural delta fingerprints. Missing
approval or reviewable preparation drift withholds SpecPatch and returns
`review_required`; stale, negative, contradictory, or definite blocker state
returns `blocked`.

The stable result value is:

```json
{
  "conflict_report": { "artifact_type": "conflict_report" },
  "spec_patch": { "artifact_type": "spec_patch" }
}
```

Whenever approval or preparation does not permit patch emission, the same
shape is returned with `"spec_patch": null`. The clean, review-required, and
blocked results never modify the worktree or Git state.

### `sdd proposal apply`

```text
sdd proposal apply --patch <path> [--worktree <path>]
```

This is the only specification write operation after initialization. It
verifies config scope, path and symlink safety, all before-hashes, target
uniqueness, the whole candidate result, and then applies atomically. It
creates no commit and has no fuzzy, force, or partial mode. A successful JSON
result contains the strictly path-sorted `applied_paths` and the validated
`result_tree_fingerprint`. A project, base, path, before-hash, or result-tree
mismatch is mechanically blocked; malformed input and filesystem transaction
failure are technical errors. `--output` is intentionally unavailable so the
command cannot introduce a second specification write outside the patch.

### `sdd tests discover`

```text
sdd tests discover --head <git-ref> [--adapter <id> ...] \
  [--import-junit <path> ...] [--import-jsonl <path> ...]
```

Runs or imports configured discovery protocols and emits a normalized
`TestIndex`. Command execution remains subject to host permission policy.
Each `--import-junit` path requires exactly one selected configured JUnit
adapter so the imported local IDs have an explicit namespace. JSONL imports
declare their adapter ID in the required stream header.

### `sdd findings validate`

```text
sdd findings validate --input-manifest <path> --findings <path> \
  [--resolutions <path> ...]
```

Validates finding schemas, deterministic IDs, cited objects/sections, input
fingerprints, decision eligibility, and resolution freshness. It does not call
a model or make a human decision.

### `sdd merge check`

```text
sdd merge check --change <ChangeDescriptor-path> \
  --package <ProposalPackage-path> --candidate <directory|manifest> \
  --approval <path> \
  --test-index <path> --test-evidence <path> ... --qa <path> ... \
  [--input-manifest <path> --findings <path> ...] \
  [--resolutions <path> ...] \
  [--human-semantic-review <path>]
```

The ChangeDescriptor supplies the integration and proposal refs while the
ProposalPackage and candidate bytes remain explicit so the command can repeat
package validation rather than trusting hidden workflow state. The command
resolves the current configured integration ref and declared proposal ref,
recomputes conflict and affected scope, validates all evidence, and returns a
`MergeReport`. It never modifies Git or hosting state.

When recomputation produces an empty affected scope, the human view prints
`NOT_APPLICABLE (empty affected scope)` for both test and QA summaries rather
than presenting zero-object `PASS` summaries. The report's top-level readiness
and exit-code mapping remain unchanged.

## Input rules

- `-` means standard input only where the command has one unambiguous artifact
  input.
- Relative paths resolve from project root after config discovery.
- Retained inputs from an external project-namespaced store are materialized
  byte-for-byte under an ignored project-local staging root before invocation;
  the CLI does not read the external store or treat Git commits as workflow
  storage. Primary output may be captured from stdout or written to that
  staging root and exported after the command.
- Refs are resolved once at command start and reported as object IDs.
- Candidate directories are read as immutable snapshots; a change during the
  command causes a technical failure.
- Size, count, depth, and command time limits come from configuration.
- Secrets and unrestricted environment dumps are never emitted.

The staging lifecycle is defined in
[Workflow artifacts and schemas](artifact-schemas.md#retention-topology). It
does not authorize absolute or escaping paths, symlink indirection, persistent
nested SDD Projects, or archive ingestion.

## Diagnostic stability

Diagnostics use namespaces such as:

```text
SDD_CONFIG_*
SDD_MARKDOWN_*
SDD_ID_*
SDD_GRAPH_*
SDD_GIT_*
SDD_PATCH_*
SDD_ADAPTER_*
SDD_EVIDENCE_*
SDD_FINDING_*
SDD_GATE_*
```

Automation branches on code, location, object ID, and structured details, not
English message text.

## Library boundary

The executable is a thin adapter over a provider-neutral library. Core modules
accept explicit bytes, typed configuration, object graphs, Git reader
interfaces, clocks, and process runner interfaces. They do not read global
state implicitly. This enables the CLI, CI integrations, and Agent Skill to
share exact behavior.

## Deferred commands

Version 1 deliberately has no `branch`, `commit`, `push`, `merge`, `approve`,
`qa approve`, hosted-service, daemon, or issue-tracker command. Migration,
formatting, and repository-wide orchestration commands require separate
requirements before addition.
