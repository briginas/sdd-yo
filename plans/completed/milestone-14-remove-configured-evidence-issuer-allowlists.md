# Milestone 14 — Remove configured evidence issuer allowlists

## Objective and final boundary

Milestone 14 removed the project evidence issuer allowlist, its now-empty
configuration mapping, and every issuer-membership decision. Evidence issuer
values remain required, bounded, untrusted provenance and contradiction
identity. Authentication and actor authorization remain external.

The milestone made a deliberate private pre-1.0 configuration break while
retaining `schema_version: 1`, updated the private package identity to `0.2.0`,
and performed no publication, installation, branch, normal commit, push,
merge, QA, or release action.

## Requirement traceability

The approved normal `spec-code` Change modified:

- `CON-4365C0F6` — Evidence is an external issuer assertion whose issuer text
  does not authenticate or authorize an actor;
- `REQ-0361538D` — strict version 1 project configuration has no evidence
  authorization policy;
- `REQ-32C76ED3` — approval recording requires bounded non-empty issuer text
  without configured membership;
- `REQ-220945C2` — current subject-bound human decisions remain mandatory while
  authentication and organizational authorization stay external.

The unchanged `REQ-2C8E8085` history-reservation behavior received supporting
coverage: reachable version 1 history is located through archival project
identity and spec paths without interpreting retired fields as active config.

## Execution leaves

### 14.1 — Govern the normative issuer-policy change

The complete candidate was retained under ignored
`.sdd/staging/milestone-14.1/`. The exact ProposalPackage subject was:

- project: `SDD-17EF8B29`;
- mode: `spec-code`;
- base: `2c235e07a33a392bcf4c64fd5ad1fe1628442aab`;
- base tree:
  `sha256:caac45bd4411615dd97564d8231a04cc13ab7351845fcf81dca9c92847510072`;
- candidate tree:
  `sha256:f46791f1fdcb22ad05d91291a1920f97bea99c7c042d7b71e7b73d707cabb450`;
- semantic delta:
  `sha256:6c97bf558c5cff94dbdd468ab7fdcc39703d41173596d2ec6e31d7e68c700c3b`;
- structural delta:
  `sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`;
- modified: `CON-4365C0F6`, `REQ-0361538D`, `REQ-220945C2`, and
  `REQ-32C76ED3`; added and deleted: none.

The exact candidate was approved by issuer `product-review`, actor
`ivan-briginas`, decision `approved`, and message `it's ok`. The deterministic
ApprovalEvidence preserves the message's final newline and was produced by the
pre-change `0.1.1` CLI. Its subject exactly matches the proposal fingerprints
above.

Proposal preparation used detached commit object
`5248790d7377b3dc981d2370deb2b8bf3580aeb4`, with parent
`2c235e07a33a392bcf4c64fd5ad1fe1628442aab` and tree
`e6e89475c018c98d8dec1ec5f95243a3a9c74983`. It was created through an
isolated temporary index solely to supply an exact Git object for mechanical
preparation; no branch, ref, real index, or working-tree path moved.

After separate explicit selection, the exact SpecPatch replaced only:

- `spec/capabilities/merge-readiness.md`;
- `spec/capabilities/multi-project-cli-and-skill.md`;
- `spec/concepts/evidence.md`.

### 14.2 — Remove the configuration and runtime policy

Removed the configuration member and parser branch, initialization output,
public TypeScript parameters, CLI composition, membership checks, diagnostics,
and remediation branches. Arbitrary syntactically valid issuer text now
continues through project, subject, freshness, decision, and contradiction
validation.

Active and candidate configurations remain strict and reject legacy top-level
fields with `SDD_CONFIG_UNKNOWN_FIELD`. Reachable Git history uses a separate
read-only archival locator containing only schema version, project ID, spec
root, and entrypoint. It performs no config migration and does not expose
retired historical fields to runtime policy.

### 14.3 — Align contracts, fixtures, package identity, and documentation

Removed the configuration mapping from repository config, initialization,
contract inventory, configuration fixtures, artifact fixture context, Skill
eval project configs, and maintained examples. Security coverage now treats
issuer text as untrusted provenance that neither authenticates nor authorizes
an actor. Evidence schema version `1.0` and all required artifact issuer fields
remain unchanged.

Updated package, lockfile, CLI compatibility identity, fake CLI, Skill payload
manifest, documentation, and assertions to private package version `0.2.0`.
The Skill approval reference hash is
`sha256:715345a15590d54225999d8860d00a94791eed475450dd332f93c58faa9917de`.

### 14.4 — Verify and close out

Focused configuration, evidence, approval, merge, history, proposal, and CLI
checks passed. Maintained repository scans found none of the retired config/API
identifiers or retired phrase specified by the acceptance boundary. The exact
ignored candidate's former configuration bytes are retained separately at
`.sdd/staging/milestone-14.1/approved-candidate-config.yaml` so the governed
subject remains auditable without presenting it as a nested active project.

## Retained evidence

- ProposalPackage:
  `.sdd/staging/milestone-14.1/proposal-package.json`, SHA-256
  `6fccdf847cbc99aca86560d8c5af0d6ebb9200b695ed3784f2f1c71c59ee72b4`.
- ApprovalEvidence:
  `.sdd/staging/milestone-14.1/approval.json`, SHA-256
  `904d085b58fabdd380f900071a46b2a1c4fbf03826dadc04fa0d259e47dec798`.
- SpecPatch:
  `.sdd/staging/milestone-14.1/spec-patch.json`, SHA-256
  `e30def12a11c409bc9d2e323f2f24b5b836c5301b69a381e01056497f486decf`.
- Exact human message file:
  `.sdd/staging/milestone-14.1/approval-reason.txt`, SHA-256
  `12d82371cdbe3d4e73e67de85a34ac957f695b3dd7b06ee1c430f21cf52983d8`.
- Archived candidate config bytes:
  `.sdd/staging/milestone-14.1/approved-candidate-config.yaml`, SHA-256
  `79147d193a9f8bdb27be9b7c8a9eb59fe16564ffbda683cfd2445f9fae632bc1`.

## Validation evidence

All required checks passed on 2026-08-07:

- focused initial configuration/evidence/approval/merge run: 54 tests, 0
  failures;
- focused configuration/history/proposal/CLI run: 47 tests, 0 failures;
- `npm test`: 234 tests, 0 failures;
- `npm run test:package`: 1 offline packed-consumer smoke test, 0 failures;
- `npm run check:schemas`;
- `npm run build`;
- `npm run typecheck`;
- `npm run format:check`;
- `npm run verify:contracts`: 27,412 checks after closeout compaction;
- `git diff --check`;
- maintained retired-terminology scan: no matches;
- active product, package, documentation, and assertion previous-version scan:
  no matches. This historical record alone retains the ApprovalEvidence
  producer identity described above.

## Exclusions and deferred scope

No evidence issuer field or evidence schema was removed. No compatibility
config parser, implicit migration, configuration major 2, authentication,
authorization, signature, identity provider, registry, publication,
installation, branch, normal commit, ref movement, push, merge, QA, or review
action was introduced.

The unrelated untracked `sdd-yo-0.1.0.tgz` remains unchanged. The candidate
backlog remains in the active plan; no next milestone was selected.

## Closeout result

Milestone 14 is complete as of 2026-08-07. This closeout authorizes no commit,
merge, push, publication, installation, or release.
