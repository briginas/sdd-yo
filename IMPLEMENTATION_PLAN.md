# SDD Yo implementation plan

## Status

- Active: no milestone selected
- Complete: Milestones 0–37; public `sdd-yo@0.5.6`
- Last updated: 2026-08-23

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
a pure deterministic reducer, sequence-and-fingerprint-checked atomic journal
publication, and a temporary read-only loopback renderer. Every newly selected
Skill-orchestrated `spec-code`, `spec`, or `code` workflow automatically
initializes or resumes one explicit project-local run and publishes only typed
boundaries. A `code` run is bound to its resolved base and complete canonical
active Requirement target set, uses a stable seven-stage package-only
projection, and never invents candidate authoring or SpecPatch ceremony. A
`spec` run binds the exact accepted existing behavior and intended QA plan as
descriptive non-evidence context, uses a stable eight-stage projection with no
implementation stage, and reports implementation as not applicable. Stable
stage projections, partial starts, exact duplicate retries, stale-writer
rejection, and separate observer conditions do not infer workflow authority.
One running observer follows valid later publications over protected SSE and
preserves its last valid snapshot across malformed updates or reconnects.
Execution, CLI outcome, approval,
merge readiness, artifact freshness, and integration remain independent axes.
Journals and snapshots are removable observation data rather than hidden
workflow state or authoritative evidence, and the observer cannot record a
decision, run a gate, mutate Git, publish, or release. Additional terminal,
IDE, CI, or hosted adapters remain deferred renderers over the same observation
contract.

Exact `sdd-yo@0.5.6` is public on npm from annotated tag `v0.5.6` at commit
`a7c7c703f4b5ba4b77c8601fb35df3c56f61cd76`. The registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`ef8777ef3ba41ea4cc6eb09a5dd26905006fd58ad4f20ca90a872d9fef4d4a85`, inventory
SHA-256 `53f908f036e3e6ef56240f7a02e28a39531e356726c4e43da660893628ef925f`, and
2,188 entries. npm trusted publishing records a cryptographically verified
SLSA provenance subject bound to `briginas/sdd-yo`, `publish.yml`, `v0.5.6`,
and the release commit. An isolated consumer installed the exact package and
verified its CLI, schema, Skill identity, and one valid npm attestation. The
source `package.json` remains the primary package identity; publication and
release remain separately authorized operations.
