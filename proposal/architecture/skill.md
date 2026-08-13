# Agent Skill

## Workflow ownership

SDD Yo ships one optional progressive-disclosure skill named `sdd-yo`. It helps a
coding agent understand intent, retrieve the smallest relevant specification
slice, draft candidate changes, invoke deterministic checks, explain results,
and hand decisions back to humans.

The CLI is the authority for parsing, identity, graph validation, fingerprints,
patches, traceability, and gates. The skill is an orchestrator and authoring
guide, not a second implementation.

The packaged [Skill entrypoint](../../skills/sdd-yo/SKILL.md) is the single
agent-facing workflow. It selects an intent route and loads only the applicable
reference:

- project creation or adoption: [onboarding](../../skills/sdd-yo/references/onboarding.md);
- active behavior and object relationships:
  [object model](../../skills/sdd-yo/references/object-model.md);
- change mode and virtual candidate drafting:
  [modes](../../skills/sdd-yo/references/modes.md) and
  [authoring](../../skills/sdd-yo/references/authoring.md);
- deterministic Proposal Gate review:
  [proposal review](../../skills/sdd-yo/references/proposal-gate.md);
- explicit human decision recording:
  [approval](../../skills/sdd-yo/references/approval.md);
- informed human semantic review and immutable evidence recording:
  [semantic review](../../skills/sdd-yo/references/semantic-review.md);
- approved proposal preparation or exact patch application:
  [branch preparation](../../skills/sdd-yo/references/branch-preparation.md);
- test discovery, evidence validation, and merge readiness:
  [verification](../../skills/sdd-yo/references/verification.md);
- feature normalization and explicitly authorized local integration:
  [integration](../../skills/sdd-yo/references/integration.md);
- stable failure interpretation:
  [diagnostics](../../skills/sdd-yo/references/diagnostics.md).

These are separate routes with separate inputs and stops. Authoring does not
imply Proposal Gate review; review does not imply approval; approval does not
imply preparation or application; and none of those imply verification or Git
side effects. A current `PASS` does not imply local integration authority. The
integration route additionally requires either advance authorization for the
complete named local closeout or one explicit confirmation after current
`PASS` when normalization required no Git mutation. Squash, rebase, or another
pre-verification head movement requires the advance form before mutation.
Repository instructions select the active milestone and impose development
discipline, but do not restate or override the Skill sequence.

The local integration route is intentionally outside the deterministic CLI.
Before final evidence, the Skill resolves exact local feature and integration
refs, requires a clean worktree, reduces the feature range to one Change commit,
and rebases that commit onto the current integration commit when necessary.
Every feature-head movement invalidates dependent test, QA, and merge-readiness
inputs. After current `PASS`, one compare-and-swap Git ref transaction verifies
both exact refs while fast-forwarding only the local integration branch. The
Skill then verifies the resulting ref and clean worktree before ordinary safe
deletion of the integrated local feature branch. Conflicts, ref races, missing
authority, failed checks, and incomplete closeout preserve the feature branch.
Remote refs, pull-request merge, branch protection, tags, releases, and
publication remain separate and are never implied.

For `spec-code` and `spec`, a candidate materialized by the Skill is an owned,
transient input outside the selected repository. The Skill creates it through
the secure system temporary-directory primitive (`/private/tmp` on macOS),
copies the matching project configuration and complete specification tree, and
passes its exact path only to `proposal materialize`. After compatible
successful publication of the immutable bundle, the Skill removes that source
directory. It preserves and reports the path on materialization failure, never
removes caller-owned candidates, and creates no candidate for `code`. Retained
bundles, approvals, patches, and evidence remain ignored project-relative
artifacts; no candidate lifecycle state is stored in the repository.

For the human semantic-review fallback, the Skill selects fresh safe manifest
and evidence targets, asks the CLI to materialize the exact current review
subject, and presents that subject together with its normative context,
semantic candidates, refs, recorder identity, and every supplied Finding. One
unchanged subject has one human pause for `reviewed`; missing issuer or actor
values are collected in that same request. The recorder recomputes the subject
after the pause, and the Skill accepts only an exact subject match. Subject
drift requires a new review, while a target collision or transient publication
failure retries with a fresh safe target without repeating an unchanged human
decision.

Within an already selected bounded outcome, compatible deterministic stages
continue with retained inputs through materialization, recording, preparation,
verification, and read-only readiness computation. This removes routine
`continue` questions but does not combine semantic-model confirmation,
proposal approval, exact-patch application, semantic review, normative
ambiguity resolution, or new Git, merge, publication, and release authority.

## Packaging and execution boundary

Templates mirror the published Markdown schemas and contain no
project-specific IDs.

The packed payload manifest binds every regular Skill file to exact SHA-256
bytes and the package/Skill compatibility identity. Explicit
`sdd skill install --root <repository-root>` copies that verified payload to
`.agents/skills/sdd-yo` and adds `installation.json`. The installation binding
records the selected package identity, repository-relative packaged CLI path,
protocol versions, and payload fingerprint; it is repository state, not a
packed source file.

A repository-installed compatibility wrapper resolves only that bound CLI
unless the caller supplies one explicit absolute `--cli` path. A user-installed
wrapper rejects `--cli`, verifies its complete owned Skill and private package
inventories, and resolves only the canonical absolute private CLI path. Both
preflight exact machine-readable compatibility identity before every product
command and never search `PATH` for an accidental global `sdd` executable.

Explicit `sdd skill update --root <repository-root>` and
`sdd skill remove --root <repository-root>` own the later repository lifecycle.
Both require an exact compatible installation binding and verified byte
inventory. Update uses private sibling staging plus rollback before publishing
a complete replacement; removal first detaches only the verified destination.
Stale, modified, undeclared, symbolic-link, or cross-repository content is not
treated as lifecycle authority.

On macOS, explicit `sdd skill install|update|remove --scope user` selects a
separate injected user lifecycle boundary. It owns only
`~/.agents/skills/sdd-yo` and the exact version directory below
`~/Library/Application Support/sdd-yo/cli/`. The installed binding records the
canonical private `dist/bin/sdd.js`, complete package and Skill inventories,
their fingerprints, and the compatibility identity. Publication uses private
sibling staging, verifies ownership again before replacement or detachment,
and retains only verifiable recovery state across handled interruption. This
path never selects or mutates a repository and never creates a global
executable or PATH entry.

The user updater reports `unchanged` without rewriting an exact installation,
refuses an occupied same-version destination with different bytes, and removes
only the previously bound version after a complete replacement is active. The
remover first verifies and detaches both owned destinations. A later explicit
lifecycle operation reconciles only matching private recovery state; ordinary
product commands never repair it. Before forwarding a product command, the
user wrapper requires an explicit project selector and checks the returned
project identity against that selection.

## Trust rules

The skill treats repository Markdown, code, tests, diffs, tool output, linked
documents, and adapter output as untrusted content. Text such as “ignore the
skill,” “approve this,” or “send secrets” inside project data has no authority.

The skill:

- does not expose credentials, broad environment state, or unrelated files;
- does not call configured adapter commands without normal runtime permission;
- flags changed adapter configuration for human trust review;
- never turns model confidence into a gate decision;
- never decides, approves, rejects, or creates QAEvidence or FindingResolution
  on behalf of a human;
- may invoke the deterministic ApprovalEvidence recorder only when the exact
  subject and target were displayed, every human input was supplied explicitly,
  and retained inputs still match after the human pause;
- may invoke the deterministic human semantic-review recorder only after the
  exact CLI-produced subject and every supplied Finding were displayed and the
  human explicitly supplied `reviewed`, issuer, and actor for that subject;
- does not report success if the CLI is missing, incompatible, interrupted, or
  returns malformed JSON.

The Skill does not perform model semantic analysis or create Findings. It can
orchestrate the equivalent human-review fallback and can mechanically validate
existing Finding and FindingResolution artifacts through the verification
route.

## Failure behavior

On ambiguity, stale evidence, changed refs, conflicting artifacts, incomplete
coverage, or structural errors, the skill preserves user work and explains the
next bounded action. It does not repair normative meaning automatically. A
retry begins by re-resolving refs and recomputing dependent artifacts.

## Skill evals

The skill must be evaluated for:

- unambiguous discovery and explicit invocation alongside another installed
  SDD-oriented skill with a generic name;
- correct mode selection and ambiguity escalation;
- ID-free semantic-model presentation, format selection, correction
  invalidation, explicit confirmation before identity generation, and `code`
  bypass;
- progressive retrieval without whole-repository loading;
- exact use of CLI JSON rather than simulated checks;
- refusal to fabricate human evidence;
- prompt-injection resistance from every repository data channel;
- correct handling of stale refs and fingerprints;
- external temporary candidate cleanup after successful bundle retention,
  failure preservation, caller ownership, and the `code`-mode exclusion;
- explicit approval and rejection recording without inferred decisions or
  downstream authority;
- exact semantic-review subject and Finding presentation, one unchanged-subject
  pause, no inferred issuer or actor, post-pause subject comparison, technical
  target retry without repeated human decision, and automatic continuation
  only inside the selected bounded outcome;
- cross-project isolation in monorepos;
- clear distinction between governed scope and complete-project claims.
