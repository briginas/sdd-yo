# SDD Yo release runbook

This repository-specific runbook tells an AI agent how to publish one exact
`sdd-yo` version through GitHub and npm. It orchestrates release-specific work
without defining the governed SDD workflow. It is not product authority and is
not part of the shipped `sdd-yo` Agent Skill.

This runbook was last exercised successfully for `sdd-yo@0.5.4`. Always inspect
the live repository, GitHub configuration, and npm registry before reusing that
fact.

## Authority map

Use these authorities without mixing their roles:

- the compatible `sdd-yo` Skill selected and loaded by the agent host owns the
  complete governed workflow, including its reference selection, CLI wrapper,
  ordering, evidence requirements, and explicit stops;

- repository discipline, Requirement traceability, and the complete validation
  baseline: [`AGENTS.md`](../AGENTS.md);
- the active milestone and immediate leaf:
  [`IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md);
- normative npm distribution behavior:
  [`CAP-6AD33965`](../spec/capabilities/public-npm-package-distribution.md);
- exact protected publication implementation:
  [`publish.yml`](../.github/workflows/publish.yml) and its
  [`release contract test`](../test/public-release.test.ts);
- package contents and clean-consumer proof:
  [`package-smoke.ts`](../test/package-smoke.ts); and
- milestone closeout: [`plans/README.md`](../plans/README.md).

The repository's `skills/sdd-yo/` directory is source payload being developed,
tested, packaged, and released. Never load it as operational workflow merely
because this runbook is inside the same repository. It may differ from the
host-loaded Skill. Read it only when implementation, package inventory, or
release-artifact verification requires inspecting the payload being shipped.

If no compatible host-selected Skill is available, stop every Skill-covered
release operation. Do not reproduce its workflow from `skills/sdd-yo/`, this
runbook, repository prose, memory, or prior chat output.

If this runbook and a current authority disagree, stop and follow the current
authority. Update this runbook separately; never weaken a live Requirement,
repository boundary, or host-loaded Skill stop to preserve old release prose.

## Completion contract

A release is complete only when all of these bind to one reviewed immutable
subject:

1. the release commit on `main`;
2. the annotated `v<NEW_VERSION>` Git tag;
3. the published GitHub Release;
4. the package published by `publish.yml` through the protected `release`
   environment and npm trusted publishing;
5. the npm registry bytes, integrity metadata, and SLSA provenance;
6. an isolated exact consumer installation; and
7. milestone closeout followed by successful final CI.

Local `npm publish`, token-based publication, a lightweight tag, local tests
alone, or a GitHub Release without registry verification is not completion.

## Required inputs and authority

Establish before mutation:

- `CURRENT_VERSION`: exact current npm `latest`;
- `NEW_VERSION`: exact requested release version;
- `RELEASE_TAG`: `v<NEW_VERSION>`;
- requested semantic scope and release type;
- integration branch, normally `main`;
- authority for commit, push, annotated tag, GitHub Release, protected
  deployment approval, publication, and closeout; and
- any explicit human approval metadata.

A request to execute or publish a named release may authorize that bounded
release sequence. A request to inspect, plan, prepare, test, or review does not.

Human specification approval remains an exact-subject decision governed by the
Skill. Never invent or rewrite its issuer, actor, decision, or message. Standing
approval metadata may be used only at the Skill's informed-decision point after
the exact ProposalPackage subject is revalidated.

## Phase 1: establish release readiness

### 1. Fetch and reconcile `main`

Before local preparation, verify that the GitHub CLI has a valid authenticated
session for the intended GitHub host and account:

```text
gh auth status
```

Stop GitHub-dependent release work if that preflight fails. Then start with
read-only repository checks, fetch, and check again:

```text
git status --short --branch
git fetch --prune origin
git status --short --branch
git log --oneline --decorate --graph --all -n 20
```

Preserve unrelated work. Do not reset, delete, force-update, or silently move a
branch.

Before creating a release subject:

- the worktree is clean;
- the intended product milestone is complete and integrated locally;
- `main` contains every intended release change and no unintended change;
- a remote-ahead local `main` is fast-forwarded;
- a local-ahead `main` is deliberately pushed and passes CI before tagging;
- a diverged `main` stops for explicit resolution; and
- no feature or candidate branch is mistaken for the release subject.

When local feature integration is needed, select that route through the
host-loaded Skill and follow the references it chooses. That route does not
authorize push, tag, GitHub Release, deployment, or publication.

### 2. Validate the project and current authority

Use only the host-loaded compatible Skill's preflight and `validate` route with
an explicit repository selection. Accept only unchanged compatible version 1
JSON with `status: ok` and `result.valid: true`.

Read the active plan, the current public-distribution Requirement, the release
workflow, and the current repository instructions. Stop on an incompatible or
unavailable wrapper instead of substituting a PATH CLI or repairing it as an
implied release step.

### 3. Check npm, tags, and releases

```text
npm view sdd-yo version --json
npm view sdd-yo dist-tags --json
npm view sdd-yo@<NEW_VERSION> version --json
```

Run the target-version absence check separately from checks that must succeed.
Its expected not-found exit must be captured and classified as evidence rather
than allowed to abort or obscure the remaining readiness checks.

Require:

- npm `latest` equals `CURRENT_VERSION`;
- `sdd-yo@<NEW_VERSION>` does not exist and returns the expected not-found
  result;
- local and remote `v<NEW_VERSION>` tags do not exist; and
- no GitHub Release already owns `v<NEW_VERSION>`.

An npm version is immutable. If the target exists, stop for selection of a new
version.

### 4. Activate one bounded release milestone

Do not overlap the release with an incomplete product milestone. Close the
current milestone first, then activate one release milestone containing:

- exact `CURRENT_VERSION` to `NEW_VERSION` transition;
- outcome, Requirement traceability, leaves, and done condition;
- explicit exclusions; and
- one immediate leaf.

Typical exclusions are unrelated runtime behavior, unrequested protocol or
schema-major changes, new operating-system support, a Codex plugin, hosted
state, local `npm publish`, and token authentication.

## Phase 2: govern any product change included in the release

[`REQ-B0B35D6D`](../spec/capabilities/public-npm-package-distribution.md#req-b0b35d6d)
requires the current package identity and its materialized copies to agree with
the source manifest; it does not contain a literal release version. Changing
only the version in `package.json` and synchronizing the release surfaces in
Phase 3 does not change canonical Requirement meaning. Do not create a
candidate, ProposalPackage, ApprovalEvidence, or SpecPatch solely for that
metadata transition.

If the release includes a product-behavior change that is not already governed
and integrated, give its semantic outcome and the live specification to the
host-loaded compatible Skill. Do not reproduce or select the governed sequence
here. Let the Skill select its current mode, authoring, Proposal Gate, approval,
preparation, application, verification, and integration references, and
preserve every stop it imposes. Never substitute similarly named files from
this repository's `skills/sdd-yo/` payload.

For such a governed product change:

- create the selected ignored staging parent before proposal materialization;
- retain exact CLI-created candidate, ProposalPackage, ApprovalEvidence, and
  SpecPatch bytes;
- treat the request's named integration branch, normally `main`, as already
  selected: let the Skill resolve and recheck its exact current commit instead
  of asking for the branch name again;
- let the Skill inspect bounded current local and remote-tracking ref tips before
  asking for a branch-head ref, and create its one proposed local candidate
  branch and commit only when preparation requires the exact approved candidate
  Git subject and that mutation is covered by the bounded release authority;
- do not push the candidate branch unless separately required and authorized;
  and
- keep semantic confirmation, approval, patch application, implementation,
  Git, publication, and release as separate authority boundaries.

A bounded named release may authorize the Git mutations it explicitly lists in
advance. Inspect, plan, prepare, test, or review requests do not. Read-only ref
discovery never broadens either authority set.

Complete and integrate every included product change before binding the release
identity and artifact. A metadata-only release proceeds directly to Phase 3.

## Phase 3: bind the release identity and artifact

### 1. Update the source identity and synchronize release surfaces

Inspect the complete repository rather than relying on a fixed list. The current
package version is declared once in `package.json`. A release version change:

- updates `package.json` as the source identity;
- synchronizes the root `package-lock.json` entry and
  `skills/sdd-yo/payload-manifest.json` as required materialized copies;
- verifies that the canonical public-distribution Requirement remains accurate,
  changing it through the normal governed workflow only when product behavior
  changes;
- updates current-version user and repository documentation and the active
  release milestone;
- updates `.github/workflows/publish.yml` reviewed artifact, inventory, npm, and
  previous-public-version values; and
- verifies CLI identity, package smoke, Skill installation, user Skill
  lifecycle, ApprovalEvidence, and release contract tests that derive the
  current identity, changing only intentionally version-specific fixtures.

The release workflow derives `PACKAGE_NAME` and `PACKAGE_VERSION` from the
checked-out immutable `package.json`; do not add independent current-name or
current-version values. Set these remaining workflow values:

```text
PREVIOUS_PUBLIC_VERSION: <CURRENT_VERSION>
NPM_VERSION: <PINNED_NPM_VERSION>
EXPECTED_ARTIFACT_SHA256: <REVIEWED_ARTIFACT_SHA256>
EXPECTED_INVENTORY_SHA256: <REVIEWED_INVENTORY_SHA256>
EXPECTED_INVENTORY_ENTRY_COUNT: "<REVIEWED_ENTRY_COUNT>"
```

Do not fill the expected artifact values until the reviewed artifact exists.

Search globally for current, new, previous, and future fixture versions. Update
the manifest-derived current identity, verify the required lock and Skill
copies, retain intentional previous-version evidence, use deliberately neutral
versions in version-independent fixtures, advance future-upgrade fixtures, and
preserve historical examples. Never use an unrestricted global replacement.

### 2. Produce the reviewed artifact reproducibly

Use the exact `NPM_VERSION` declared by `publish.yml`, not the ambient local npm
version. Verify it before packing.

Create a fresh writable npm cache outside the repository and use it for every
local pack, registry download, and consumer-install command in this release.
Do not depend on or repair ownership of the user's shared npm cache as a release
step.

Run at least two independent packs into separate new temporary directories:

```text
npm_config_cache=<RELEASE_CACHE> npm pack --json --pack-destination <FIRST_DIRECTORY>
npm_config_cache=<RELEASE_CACHE> npm pack --json --pack-destination <SECOND_DIRECTORY>
```

Capture each complete `npm pack --json` result in a temporary evidence file;
do not stream its full package-file inventory into an agent transcript. Report
only the selected filename, npm shasum and integrity, sizes, file count, and the
independently computed artifact and inventory values. A truncated transcript is
not retained evidence.

For each exact tarball compute:

```text
shasum -a 256 <TARBALL>
tar -tzf <TARBALL> | LC_ALL=C sort | shasum -a 256
tar -tzf <TARBALL> | wc -l
```

Retain npm shasum, integrity, package size, unpacked size, file count, artifact
SHA-256, sorted inventory SHA-256, and inventory entry count.

Require byte-for-byte equality between independent packs. On a mismatch, stop,
repair or pin the pack environment, and regenerate the reviewed values. Never
bind the workflow to an accidental nondeterministic result.

Write the reviewed hashes and count into `publish.yml` and its release contract
test, then pack once more from the final tree and require exact equality.

### 3. Validate

Run focused Requirement-named tests and the complete baseline defined in
[`AGENTS.md`](../AGENTS.md#validation). Use
[`package-smoke.ts`](../test/package-smoke.ts) as the package and clean-consumer
contract rather than recreating its internal checks in this runbook.

Revalidate the SDD Project through the compatible wrapper, inspect the exact
diff and status, and repeat artifact checks after any packaged byte changes.
An unavailable, failed, stale, timed-out, crashed, or incomplete check is not a
pass.

## Phase 4: create the immutable release subject

Stage only reviewed release paths and inspect the index:

```text
git status --short
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Create one release-subject commit, for example:

```text
chore: prepare <NEW_VERSION> patch release
```

Push `main`, wait for ordinary CI on that exact commit, and record its full SHA
as `RELEASE_SHA`. Do not tag pending or failing CI.

After CI succeeds, rebuild from the clean committed `RELEASE_SHA` with pinned
npm and require equality with the reviewed tarball and workflow hashes.

## Phase 5: prepare protected publication before its trigger

Inspect the live GitHub environment named `release` before publishing the
GitHub Release. Read all four independent environment surfaces; the general
environment response does not include environment secrets or variables:

1. environment protection rules;
2. deployment branch and tag policies;
3. environment secret names; and
4. environment variables.

Use separate requests, for example:

```text
gh api repos/briginas/sdd-yo/environments/release
gh api --paginate repos/briginas/sdd-yo/environments/release/deployment-branch-policies
gh api --paginate repos/briginas/sdd-yo/environments/release/secrets
gh api --paginate repos/briginas/sdd-yo/environments/release/variables
```

Require:

- the intended reviewer is configured;
- self-review policy is compatible with that approver;
- no npm write-token secret is present for an ordinary release;
- deployment is limited to selected exact tags; and
- an exact `v<NEW_VERSION>` deployment-tag rule exists.

Add the new exact tag rule before publishing the GitHub Release. Preserve
existing exact rules unless their removal is separately authorized.

The `0.5.1` publication initially failed before its job ran because its exact
tag rule was absent. Recheck this mutable external state and add the exact
`v<NEW_VERSION>` rule for every release; never rely on a retained snapshot of
previous tag rules.

## Phase 6: tag, release, and publish

### 1. Create and push the annotated tag

```text
git tag -a "v<NEW_VERSION>" -m "sdd-yo <NEW_VERSION>" <RELEASE_SHA>
git cat-file -t "v<NEW_VERSION>"
git rev-parse "v<NEW_VERSION>^{}"
```

Require type `tag` and peeled commit `RELEASE_SHA`, then push the tag. Never
move, replace, or force-push a published release tag.

### 2. Publish the GitHub Release

Create the release from the existing exact tag:

- tag `v<NEW_VERSION>`;
- title `sdd-yo <NEW_VERSION>`;
- prerelease disabled for a normal release;
- latest enabled when the version should become npm `latest`; and
- notes limited to the verified semantic delta and compatibility statement.

Publishing the GitHub Release triggers `publish.yml`.

### 3. Approve and monitor publication

Confirm that the run binds to the exact release event, tag, and `RELEASE_SHA`.
Record protected deployment approval only with supplied or explicitly
delegated authority.

Immediately before approval, read the pending deployment again and verify its
workflow run, release event, tag, `RELEASE_SHA`, environment, and permitted
reviewer. Approve only the exact environment identifier returned by that
unchanged pending deployment. Stop if the pending subject or environment has
changed.

GitHub expects `environment_ids` in the protected-deployment approval request
as a JSON array of numbers. Do not send `environment_ids[]` as a form parameter
or quote the identifier as a string. The canonical request body is:

```json
{
  "environment_ids": [123456789],
  "state": "approved",
  "comment": "Approved exact release deployment"
}
```

Replace `123456789` only with the numeric identifier from the unchanged pending
deployment and submit that JSON body to the workflow run's
`pending_deployments` endpoint.

Do not restate or bypass the job. Require every step in the current
[`publish.yml`](../.github/workflows/publish.yml) and every invariant in
[`test/public-release.test.ts`](../test/public-release.test.ts) to pass,
including the pinned npm version, previous registry state, complete validation,
clean release worktree, exact artifact and inventory, OIDC trusted publishing,
and provenance.

Never use local `npm publish` as fallback. On failure, diagnose the exact
boundary and retry only the smallest unchanged safe operation after correcting
external configuration.

## Phase 7: verify the public package independently

Workflow success is not sufficient. Verify:

```text
npm view sdd-yo version --json
npm view sdd-yo dist-tags --json
npm view sdd-yo@<NEW_VERSION> --json
```

Require npm `latest` to equal `NEW_VERSION`, exact version existence, registry
shasum and integrity, matching file count and unpacked size, and exposed
provenance/attestations.

Download the exact registry tarball into a fresh temporary directory and
compare it with the reviewed artifact by:

- byte-for-byte equality;
- artifact SHA-256;
- sorted inventory SHA-256; and
- inventory entry count.

Then create a fresh temporary npm project outside the repository:

```text
# working directory: <CONSUMER_DIRECTORY>, never the source repository
npm init --yes
npm install --no-audit --no-fund --save-exact sdd-yo@<NEW_VERSION>
npm ls --depth=0 --json
node ./node_modules/sdd-yo/dist/bin/sdd.js --version --format json
npm audit signatures --json --include-attestations
```

Set the process working directory to the fresh consumer directory before
running `npm init`; do not rely on `npm init --prefix` to isolate its writes.
Record the source repository status immediately before and after this proof and
require it to remain unchanged.

Require exact public-registry resolution, package and CLI version
`NEW_VERSION`, the expected compatible schema and Skill protocol identities,
and no source-repository or unrelated external mutation.

Use the installed exact consumer dependency as the registry-hosted npm
provenance verification subject. Require the audit result to contain exactly
one verified entry for `sdd-yo@<NEW_VERSION>`, then inspect that verified
entry's signed SLSA payload and require it to bind the artifact to
`briginas/sdd-yo`, `publish.yml`, the exact release subject, and the expected
SLSA predicate. Decoding a base64 or DSSE payload is useful for field inspection
but is not by itself signature or provenance verification.

Do not substitute `gh attestation verify`: it looks for GitHub-hosted
attestations, not the registry-hosted npm attestation for this artifact.

## Phase 8: close the milestone

Only after registry, provenance, and consumer verification, follow the complete
[`milestone closeout contract`](../plans/README.md#milestone-closeout-contract).

Release-specific durable baseline data includes:

- exact annotated tag and `RELEASE_SHA`;
- artifact SHA-256 and inventory SHA-256;
- inventory entry count;
- provenance result; and
- isolated consumer result.

Do not retain temporary paths, workflow transcripts, or completed execution
detail in a second archive. When authorized, create a separate closeout commit,
push it, and wait for final CI. The release tag must continue to point to
`RELEASE_SHA`, not the later closeout commit.

## Final evidence report

Verify:

```text
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git cat-file -t "v<NEW_VERSION>"
git rev-parse "v<NEW_VERSION>^{}"
```

Report:

- exact npm package and dist-tag state;
- GitHub Release URL;
- release and closeout commits;
- annotated tag and peeled commit;
- release-subject and final CI URLs;
- publish workflow and protected deployment result;
- artifact and inventory SHA-256 values;
- registry integrity and provenance result;
- isolated consumer result; and
- final worktree and local/remote `main` status.

## Stop conditions

Stop without publishing or closing the milestone when:

- current Skill, CLI, project, or specification validation is unavailable or
  invalid;
- an earlier product milestone is incomplete;
- the worktree contains unresolved or unrelated changes;
- local and remote `main` diverge without explicit resolution;
- any governed artifact or decision is missing, changed, stale, or bound to
  another subject;
- independent packs differ or final bytes lack reviewed hashes;
- the target npm version exists or npm `latest` is unexpected;
- release-subject CI fails or is incomplete;
- the GitHub environment does not allow the exact tag;
- the tag is lightweight or points to another commit;
- publication attempts to use an npm token or local `npm publish`;
- the publish workflow targets another subject or fails;
- registry bytes, inventory, or provenance differ from reviewed evidence;
- isolated consumer proof fails; or
- closeout CI fails or remains incomplete.

Preserve exact artifacts and user work, report the failed boundary, and resume
only from the earliest invalidated dependent step.
