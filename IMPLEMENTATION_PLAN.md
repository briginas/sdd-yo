# SDD Yo implementation plan

## Status

- Active: Milestone 31 — release `sdd-yo@0.5.4`
- Complete: Milestones 0–30; public `sdd-yo@0.5.3`
- Last updated: 2026-08-13

## Authority and navigation

- Implemented product behavior: [`spec/README.md`](spec/README.md)
- Architecture and implementation boundaries:
  [`proposal/architecture/README.md`](proposal/architecture/README.md)
- Execution-planning and closeout procedure:
  [`plans/README.md`](plans/README.md)
- Repository work discipline and validation: [`AGENTS.md`](AGENTS.md)

## Product baseline

SDD Yo is an offline-first, repository-native specification-governance system:
a deterministic TypeScript library, the `sdd` CLI and versioned JSON protocols,
language-independent test adapters, exact approval-bound workflow artifacts,
and an optional progressive-disclosure `sdd-yo` Agent Skill.

The version 1 library, CLI, schemas, proposal and exact-patch workflow, evidence
composition, findings validation, merge readiness, governed-scope integration,
repository-scoped Skill route, and macOS user-scoped Skill with a bound private
CLI are implemented and verified. The Skill can normalize one explicit local
feature branch, invalidate evidence after head movement, and complete an
explicitly authorized exact fast-forward with safe local branch deletion. The
CLI remains Git-side-effect-free and every remote operation stays outside that
route.

Normal `spec-code` and `spec` Changes retain one candidate-and-package bundle.
A Skill-owned candidate is authored outside the repository and removed only
after successful bundle retention; failures preserve it, caller-owned
candidates are not removed, and `code` retains a package-only bundle without a
specification-patch ceremony. Proposal validation, approval recording,
preparation, and merge checks consume the exact retained bundle.

When model semantic analysis is unavailable, the explicit human-review route
materializes a versioned machine-comparable subject from the Change, proposal,
refs, analyzer, and Findings. The CLI and Skill never make or infer the human
decision, create Findings, claim semantic completeness, or broaden Git, merge,
publication, or release authority.

After an exact recorded approval for `spec-code` or `spec`, the Skill performs
bounded read-only discovery across current local and remote-tracking ref tips.
It reuses an already-selected integration ref, rechecks exact commits before
preparation, requires explicit selection among multiple matches, and proposes
one concrete local branch and commit when none exists. Discovery, approval, and
preparation never supply Git mutation or push authority.

Workflow progress observation is implemented as versioned allowlisted events,
a pure deterministic reducer, injected producers, and a temporary read-only
loopback renderer. Execution, CLI outcome, approval, merge readiness, artifact
freshness, and integration remain independent axes. The observer accepts one
explicit project-relative journal, serves only exact referenced regular files,
and cannot record a decision, run a gate, mutate Git, publish, or release.
Journals and snapshots are removable observation data rather than hidden
workflow state or authoritative evidence. Additional terminal, IDE, CI, or
hosted adapters remain deferred renderers over the same observation contract.

Exact `sdd-yo@0.5.3` is public on npm from annotated tag `v0.5.3` at commit
`a1bffd3c054afc9cae097187ab8089b7dbab0241`. The registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`24b8baaad5043fd6a81a98a942cffefcba1fdec70a5a017af7b410991abd2bbb` and npm
trusted publishing records cryptographically verified SLSA provenance. The
source `package.json` remains the primary package identity; publication and
release remain separately authorized operations.

## Milestone 31 — release `sdd-yo@0.5.4`

Outcome: publish the already integrated `main` subject as an independently
verifiable public patch release. Requirement traceability: `REQ-B0B35D6D`.

Leaves:

1. Bind source, lockfile, packaged Skill manifest, user documentation, release
   workflow inventory, and reviewed package artifact to `0.5.4`.
2. Validate the exact release subject, push `main`, and wait for successful CI.
3. Create the exact protected tag, GitHub Release, trusted publication, and
   independent registry, provenance, and clean-consumer proof.
4. Record durable release facts, compact the plan, push closeout, and wait for
   final CI.

Done condition: annotated `v0.5.4`, GitHub Release, trusted npm publication,
matching artifact/inventory/provenance, clean-consumer proof, and a separately
validated closeout commit all bind to the intended immutable subjects.

Exclusions: product behavior or specification changes, protocol/schema-major
changes, new platform support, Codex plugin publication, local `npm publish`,
or token authentication.

## Candidate backlog

Other possible future milestones remain deliberately uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- additional workflow renderers such as a TUI or Codex/IDE panel;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
