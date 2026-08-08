# Milestone 17 — Public npm CLI distribution

Milestone 17 made the exact `sdd-yo@0.3.0` package publicly installable from
npm while preserving the offline-tarball route, inert installation, the `sdd`
CLI, ESM/library exports, versioned schemas, and repository-scoped `sdd-yo`
Skill as one compatibility identity.

## Completed leaves

### 17.1 — Public-release contract and registry preflight

The identified human confirmed the unchanged ID-free distribution model. The
personal publisher is `briginas`, `sdd-yo` was available, the first public
version is `0.3.0`, and publication uses `briginas/sdd-yo` `publish.yml`, the
protected `release` environment, OIDC/provenance, and no retained credential.
The Change affected `CAP-6AD33965` and `REQ-B0B35D6D`, `REQ-A2199BC2`, and
`REQ-43B4311E`; it required the public-release security Requirements later
implemented. No candidate or package/registry mutation occurred in this leaf.

### 17.2 — Governed public-distribution specification Change

Identified human `ivan-briginas`, via `product-review`, approved the exact
`spec-code` subject based on `565bc151afaad7459ed6fce202e42c730ea2a7a0`.
The retained ProposalPackage, ApprovalEvidence, conflict report, and SpecPatch
are under ignored `.sdd/staging/milestone-17.2/`; the canonical patch bytes
were applied at `a116471a5d8a7ea09fe46fa5f5a3e76ad44711d0`.

### 17.3 — Public package implementation and release automation

The public manifest, lockfile, README, compatibility identity, Skill payload,
and protected `publish.yml` were implemented and locally verified. The
workflow binds the release tag, immutable commit, package identity, and exact
tarball; ordinary CI and local commands are not publish-capable. Requirement
coverage includes `REQ-B0B35D6D`, `REQ-A2199BC2`, `REQ-43B4311E`, and the
public-release security contract. No package was published in this leaf.

### 17.4 — Release rehearsal and exact artifact review

From `da3365ae58051facf9eb520b2b2db5116697c8a2`, the retained candidate had
2,125 entries, packed size 1,145,468 bytes, unpacked size 5,964,868 bytes,
SHA-256 `65a7f9f95684085ad54af828e32e5cb64bad2a9f1f3e1ce7769841cf04d4fae8`,
and npm integrity
`sha512-kr+RaJzHXEmtPEu/Dz+1zebmSkX6m+aAoBrda9Cu4M8erYquPhswcGhLaG6dWssy2ImE6Jo2IaRgNYuRzUjHCg==`.
The clean npm and isolated Yarn Plug'n'Play routes, npm publication dry run,
and complete local suite passed. Evidence remains under ignored
`.sdd/staging/milestone-17.4/`.

### 17.5 — Bootstrap-protected public publication

The bootstrap workflow was corrected for `REQ-ABFFEAF2`, `REQ-9CE36B68`, and
`REQ-0163273A`: it permits only the reviewed first public version, rejects an
existing package/version, confines the bootstrap secret to the final step, and
binds reviewed bytes and inventory. A rehearsal from
`5380db3eccdf0967ad05987991d7f654ef32a4f5` reproduced the 2,125-entry
candidate, SHA-256, inventory digest
`6341e4d5024509bb54bcdb255b2458ebbff314ba9d6480c529dc46a02a1f2838`, and
the reviewed npm integrity.

The first Release run `31272878913` made no registry write because detached
checkout validation could not resolve `main`. The workflow-only reference fix
reproduced that failure and passed after binding local `main` to `github.sha`.
The next attempt, run `31274039503`, initially stopped at npm `EOTP`; the
identified human selected a fresh seven-day read/write bypass-2FA bootstrap
token for one retry. Attempt 2 published `sdd-yo@0.3.0` from
`1a6eeeb54341077fbd3be8451918afe0915fd3ab` as `latest`, with reviewed
integrity, shasum `f6f0d84b87a9e2d8fc8e71778c379bf9a637ec1c`, and SLSA
provenance. The npm token and protected-environment secret were then confirmed
absent. No plugin publication, merge, QA verdict, or release announcement was
created.

### 17.6 — Public macOS consumer evidence and closeout

A fresh macOS consumer at ignored disposable path
`/private/tmp/sdd-yo-17.6-macos.qaOHGX` installed exact public
`sdd-yo@0.3.0` without a source checkout or private tarball. Node was
`v22.22.3` and npm `10.9.8`; the installed lockfile integrity was the reviewed
SHA-512 value above. `npm exec --package=sdd-yo@0.3.0 -- sdd --version --format
json` returned `status: "ok"` and package/CLI version `0.3.0` with compatible
major `1` for schemas and Skill.

The consumer resolved the library exports and `dist/index.d.ts`, contained all
18 version 1 contract schemas, installed the exact repository Skill with
payload fingerprint `sha256:78c42022e11b76099b20798a094f7f145d25aaeda32ecd48e972c0a67eb18780`,
and created an incremental project. A disposable initial Git commit contained
only the generated `.sdd/config.yaml` and `spec/` paths. The installed wrapper
then returned `status: "ok"`, `valid: true`, project `SDD-6E0C815E`, and
complete history. The pre-existing outside-root sentinel remained present.

The public README now states that independent public-consumer evidence is for
macOS only. Linux and Windows consumer compatibility are explicitly deferred
and not claimed.

## Validation and closeout

The exact closeout working tree passed:

```text
npm test                         # 236 tests passed
npm run test:package             # 1 package-smoke test passed
npm run check:schemas            # generated schema types current
npm run build
npm run typecheck
npm run format:check
npm run verify:contracts         # 28,213 checks passed
git diff --check
```

## Decisions and exclusions

- Public npm installation is verified only on macOS. Linux and Windows evidence
  is deferred; neither platform is claimed by this milestone closeout.
- The offline exact-tarball route remains supported and inert.
- No Codex plugin, marketplace submission, Git merge, QA verdict, release
  announcement, or new product behavior is implied.
- This archived record, the completed-plan index, and active-plan compaction
  are repository-maintenance documentation. They create no Git authority or
  commit.
