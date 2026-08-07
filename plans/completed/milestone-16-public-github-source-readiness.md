# Milestone 16 — Public GitHub source readiness

Milestone 16 prepared `briginas/sdd-yo` for public source visibility without
changing implemented product behavior, publishing the private `sdd-yo@0.2.0`
npm package, or publishing the optional Codex plugin.

## Completed leaves

### 16.1 — Exposure audit and immediate safety remediation

The tracked tree, reachable history, package surface, GitHub state, and
dependency advisories were reviewed. `.gitignore` now excludes `*.tgz` so a
locally generated package tarball is not normally tracked. The confirmed
compatible lockfile remediation updated development-only `js-yaml` from 4.3.0
to 4.3.1. These changes were retained in `8bdafab` (`chore: start public
repository readiness`).

The narrow current-tree and reachable-history scan found no credential-shaped
private key, AWS key, GitHub token, Slack token, Google API key, or npm token.
Its history matches were test-only `npm_config_*` variable names and a loopback
registry URL. The local object database had unreachable objects, including five
commits; they are not part of a normal ref push and were not rewritten.

### 16.2 — Public repository documentation and contribution baseline

`34ba8af` (`chore: add public repository baseline`) added the Apache-2.0
license, conduct, contribution and security guidance, issue/PR metadata, and
the `CI` workflow. The README and package metadata make the public-source and
private-package distinction explicit. The package-inventory boundary remains
covered by `REQ-B0B35D6D` and `REQ-43B4311E`; no runtime behavior changed.

The owner selected the retained author identity, email, dogfood paths, and
historical evidence as acceptable public data. The package remains private and
offline-first; no registry or marketplace publication is implied.

### 16.3 — Public transition handoff

The full local validation suite passed on the reviewed subject:

```text
npm test                         # 235 tests passed
npm run test:package             # 1 package-smoke test passed
npm run check:schemas            # generated schema types current
npm run build
npm run typecheck
npm run format:check
npm run verify:contracts         # 27,514 checks passed
git diff --check
```

`npm pack --dry-run --json` completed with an isolated cache after the default
npm cache returned its known root-owned-file `EPERM`. The dry-run identity was
`sdd-yo@0.2.0`, SHA-1 `733d6babb2f54a7d6ae811bddd7797a51d12e8d8`, with 2,125
entries; no tarball was written to the repository.

The public-transition handoff was committed as `220ebd9` (`docs: record public
transition handoff`) and pushed to `main`. The repository was then changed from
private to public at <https://github.com/briginas/sdd-yo>. The transition did
not publish the npm package or Codex plugin. The `CI` workflow passed for
`220ebd90e9d989c86c3b4f7aa55a11cf9e60db9e` at
<https://github.com/briginas/sdd-yo/actions/runs/31205525025>.

Dependabot vulnerability alerts and Dependabot security updates are enabled.
The owner selected no ruleset or branch protection for `main`; ruleset listing
is empty and `main` intentionally remains unprotected. GitHub Actions remains
enabled with `allowed_actions=all` and SHA pinning disabled. Private
vulnerability reporting, secret scanning, secret-scanning push protection,
non-provider patterns, and validity checks remain disabled by owner decision.
Two repository-update payload attempts for secret scanning were rejected with
`Invalid security_and_analysis payload` (HTTP 422), with no setting change.

## Decisions and exclusions

- Public source visibility is separate from package and plugin distribution.
  The private package and Codex plugin remain unpublished.
- No history rewrite, unreachable-ref cleanup, npm publication, marketplace
  publication, or code/runtime behavior change occurred.
- `main` intentionally has no ruleset or branch protection. Actions policy and
  disabled security controls are retained as inspected; reconsider them only
  through a separately selected and authorized change.
- The untracked local `.DS_Store` was excluded from every commit.

## Closeout result

All three leaves are complete. This record, the completed-plan index, and the
compacted active plan form the Milestone 16 closeout change. Documentation
formatting and `git diff --check` must be re-run against that exact closeout
diff before any separately authorized commit. No product Requirement, runtime
behavior, approval, QA decision, or Git authority is created by this closeout.
