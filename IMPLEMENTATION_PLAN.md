# SDD Yo implementation plan

## Status

- Active: no selected milestone; choose one bounded candidate before further
  implementation
- Complete: Milestones 0–27; public `sdd-yo@0.5.2`
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
CLI are implemented and verified. The Skill can additionally normalize one
explicit local feature branch, invalidate evidence after head movement, and
complete an explicitly authorized exact fast-forward with safe local branch
deletion; the CLI remains Git-side-effect-free and every remote operation stays
outside that route. Normal `spec-code` and `spec` Changes retain one
candidate-and-package bundle. A Skill-owned authored candidate is created
outside the repository through the host temporary boundary and removed after
successful bundle retention; failures preserve it, caller-owned candidates are
not removed, and `code` creates no candidate directory. `code` retains one
package-only bundle and performs no specification-patch ceremony. Proposal
validation, approval recording, preparation, and merge checks consume the exact
retained bundle; superseded `0.4.x` handoff routes are absent.

When model semantic analysis is unavailable, `semantic-review materialize`
derives and safely retains one exact current human-review manifest and a
versioned machine-comparable subject from the Change, proposal bundle, refs,
fixed analyzer, and explicit current Findings. After one informed human
`reviewed` decision, `semantic-review record` recomputes that subject and safely
publishes immutable HumanSemanticReviewEvidence only when it is unchanged. The
Skill displays the complete subject and supplied Findings, collects any missing
issuer or actor in that same pause, compares the recorder response exactly, and
continues deterministic stages already included in the selected outcome without
asking for retained inputs again. The CLI and Skill never make or infer the
human decision, create Findings, claim semantic completeness, or broaden Git,
merge, publication, or release authority.

Exact `sdd-yo@0.5.2` is public on npm from annotated tag `v0.5.2` at commit
`15f7a33c290ddd742ff57470af35480645ce03fb`. Its registry tarball matches the
reviewed release subject byte-for-byte with SHA-256
`2129c9ec55e0095aaff96554a2cd120641fa9338e408419a223cdab0c836beba`,
inventory SHA-256
`7d2e69d75debc2639fcc0a9470df3b9494a378b45c831db5e803f47235448079`,
and 2,139 entries. npm trusted publishing records SLSA provenance for the
GitHub Actions `publish.yml` subject. The public package, CLI identity, library,
schemas, repository Skill, macOS user-scoped private CLI and wrapper, and an
isolated exact consumer installation are verified.

The source `package.json` is the primary current package identity. CLI and
release automation derive its name and version from that immutable manifest;
package smoke derives current-product expectations from it and verifies the
required root lockfile and packaged Skill payload identity copies against it.
Exact installation commands remain synchronized for user safety, while
protocol versions and historical release evidence remain independent records.

## Current planning state

No further milestone is selected. Choose one candidate below, define its
Requirement traceability, boundaries, validation, done condition, and first
incomplete leaf before implementation begins.

## Candidate backlog

Other possible future milestones remain deliberately uncommitted:

- Linux or Windows support;
- a published Codex plugin;
- hosted workflow state or integrations;
- Markdown-dialect changes unrelated to the implemented normal Change
  workflow.

Selecting future work requires a new bounded milestone with an immediate leaf,
explicit exclusions, Requirement traceability, and proportionate validation.
