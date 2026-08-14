# SDD Yo implementation plan

## Status

- Active: no milestone selected
- Complete: Milestones 0–32; public `sdd-yo@0.5.4`
- Last updated: 2026-08-14

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

For broad outcomes, the Skill has an advisory initiative-planning route. It
selects proportionate Light, Standard, or Deep design depth, produces an
ID-free initiative map, decomposes it into independently valuable and
verifiable vertical slices, and stops before governed authoring until exactly
one slice is explicitly selected. Generic planning invokes no CLI operation;
selected-project planning validates the project and inspects only the smallest
relevant active specification slice. The map stays conversational unless a
noncanonical project-local planning document is explicitly requested.

Workflow progress observation is implemented as versioned allowlisted events,
a pure deterministic reducer, injected producers, and a temporary read-only
loopback renderer. Execution, CLI outcome, approval, merge readiness, artifact
freshness, and integration remain independent axes. The observer accepts one
explicit project-relative journal, serves only exact referenced regular files,
and cannot record a decision, run a gate, mutate Git, publish, or release.
Journals and snapshots are removable observation data rather than hidden
workflow state or authoritative evidence. Additional terminal, IDE, CI, or
hosted adapters remain deferred renderers over the same observation contract.

Exact `sdd-yo@0.5.4` is public on npm from annotated tag `v0.5.4` at commit
`ba0cb1cb1e49bfe8ebe73620a8d79c2d9a22c8b5`. The registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`12c9e2805189c383c43021c6e39f0fab97b551c1fc1a3c37773644aeef127167`, inventory
SHA-256 `fb8bd8867afbcab6492ff2a94a5f6b25780d738d1b1b8db56c2e565bb8e740f1`, and
2,170 entries. npm trusted publishing records cryptographically verified SLSA
provenance. The source `package.json` remains the primary package identity;
publication and release remain separately authorized operations.
