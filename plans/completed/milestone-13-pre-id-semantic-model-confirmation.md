# Milestone 13 — Pre-ID semantic-model confirmation

## Objective and final boundary

Milestone 13 made every `spec` and `spec-code` authoring route present and
explicitly confirm the semantic shape of the future specification before
generating new IDs or expanding Markdown templates. `code` mode, Proposal Gate
approval, SpecPatch selection, implementation, QA, and Git authority remained
separate. The milestone changed no CLI, compatibility wrapper, versioned JSON
schema, Markdown template, or runtime implementation boundary outside the
progressive-disclosure Skill and its eval evidence.

## Requirement traceability

The milestone implemented and verified:

- owning Capability `CAP-404305F6` — Multi-project CLI and skill integration;
- orchestration dependency `REQ-26234DC8`;
- `REQ-D17B2FB9` — confirm the semantic model before specification identities.

Requirement-named executable tests cover the new checkpoint and its eval
scenarios. The canonical Requirement was applied through the approved exact
SpecPatch recorded below.

## Execution leaves

### 13.1 — Pre-ID semantic-model Requirement and Proposal Gate

Generated `REQ-D17B2FB9` through the compatible CLI against complete history at
`147db7bcc207504f5ec219869ab02665a6554594`. The bounded `spec-code` candidate
added it under `CAP-404305F6` and depended on `REQ-26234DC8`.

The exact ProposalPackage subject was:

- project: `SDD-17EF8B29`;
- mode: `spec-code`;
- base: `147db7bcc207504f5ec219869ab02665a6554594`;
- base tree: `sha256:f27e9d879026521426efb11be15837da759ee3277642f18b61ea32408675f025`;
- candidate tree: `sha256:30bc074a1b8ca76b24c02b669306e94f678f9ae64fb72e33d8800f522c3f861c`;
- semantic delta: `sha256:5c3ad4943bb43703ece43e7317c72d804e3c42da15634822d8597579b2e5be30`;
- structural delta: `sha256:be6be5e7f5077862a2fd4883022b6a51f66088bf17c93b4ced51aa303ef80223`;
- added: `REQ-D17B2FB9`; modified: `CAP-404305F6`; deleted: none.

The exact SpecPatch was prepared and applied after the explicit product
approval. ProposalPackage, ApprovalEvidence, ConflictReport, and SpecPatch
remain under ignored `.sdd/staging/milestone-13.1/`. The canonical result tree
was `sha256:30bc074a1b8ca76b24c02b669306e94f678f9ae64fb72e33d8800f522c3f861c`.

### 13.2 — Exact specification patch

ApprovalEvidence was recorded for the exact subject from issuer
`product-review` and actor `Ivan Briginas`; its SHA-256 was
`9a17b79e67aa897317047bb529d88df170d00dd0617624d14e28aa5aeddf48b8`.

With separately authorized Git preparation, candidate commit
`3588fe154c46d4da5b8f94b3243b721ff2042998` was created on local branch
`codex/milestone-13-spec-candidate` with parent
`147db7bcc207504f5ec219869ab02665a6554594`. `proposal prepare` returned `ok`
with no mechanical conflicts and SpecPatch SHA-256
`02b5f98eba99c651688c22bcd51413cf9b06380e26726ba9da2c8fa2730a3db9`.

After explicit selection, `proposal apply` replaced only
`spec/capabilities/multi-project-cli-and-skill.md` and returned the exact result
tree above with no diagnostics.

### 13.3 — Skill orchestration and evals

The packed progressive-disclosure Skill now sequences inspect/clarify, an
ID-free semantic model, explicit confirmation, ID generation, template
expansion, and complete virtual-candidate preview. It uses a short nested list
for a simple model, a vertical diagram for a complex model, invalidates prior
confirmation after correction, preserves the `code` bypass, and separates the
authoring checkpoint from downstream authority.

The eval corpus contains:

- `authoring-semantic-model-simple-confirmation`;
- `authoring-semantic-model-complex-correction`;
- `authoring-code-bypasses-semantic-model`.

The semantic-model result schema, inert template, completed result, and
identified verdict transcript are retained under `evals/skill/`. The installed
payload revision is
`4c4c23691de1d03092db7d11ac2ed74587606dcfa2c5562bc36d9205066e693b`.

The separate planned human-review leaf was removed by explicit user decision;
the supplied identified reviewer verdict was nevertheless retained as the
manual verification evidence required by `REQ-D17B2FB9`:

- reviewer: Ivan Briginas, `human Skill reviewer`;
- all three semantic-model scenarios: `pass`;
- overall verdict: `pass`;
- transcript: `evals/skill/transcripts/ivan-briginas-semantic-model-verdict.md`;
- transcript SHA-256:
  `sha256:f3020313e0516e1c47995baa871317dc19b6b70ef6bca4c4b04affbcc0783511`.

## Validation evidence

All required checks passed on 2026-08-07:

- focused Skill/eval run: 28 tests, 0 failures before closeout evidence, and
  14 eval tests after retaining the completed semantic-model result;
- `npm test`: 233 tests, 0 failures, exit 0;
- `npm run test:package`: 1 test, 0 failures;
- `npm run check:schemas`;
- `npm run build`;
- `npm run typecheck`;
- `npm run format:check`;
- `npm run verify:contracts`: 27,580 checks;
- canonical `validate`: `valid: true`, 12 Capabilities, 80 Requirements,
  10 Concepts, diagnostics empty;
- `git diff --check`.

The replacement private package artifact was rebuilt after the previous local
copy was unavailable:

- `sdd-yo-0.1.0.tgz`;
- SHA-256: `903f53cb294c36b105863df17ba0687a393686a4d26c57a041ca06089b6e8d59`.

The package identity and payload manifest are both `0.1.0`. No commit, merge,
push, publication, or release was performed.

## Exclusions and deferred scope

No automatic semantic approval, ApprovalEvidence from authoring confirmation,
Proposal Gate authorization, SpecPatch selection, implementation, QA decision,
Git operation, publication, release, package version change, or marketplace
plugin was introduced by the Skill checkpoint. The candidate backlog and
deferred scope remain in the active plan. No next milestone was selected.

## Closeout result

Milestone 13 is complete as of 2026-08-07. This closeout does not authorize a
commit, merge, push, publication, or release. The newly rebuilt private package
artifact is retained as an untracked workspace file.
