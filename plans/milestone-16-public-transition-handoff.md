# Milestone 16 public-transition handoff

This is a read-only handoff record for Milestone 16.3. It records the local
and GitHub state inspected on 2026-08-07; it does not authorize a commit,
push, history rewrite, GitHub metadata mutation, or repository visibility
change.

## Reviewed subject

- Local branch: `main` at `34ba8afd0ddd023427a2bc9aaae61e378fd71396`
  (`chore: add public repository baseline`).
- Remote: `git@github.com:briginas/sdd-yo.git`.
- GitHub repository: `https://github.com/briginas/sdd-yo`; private, with
  `main` as its default branch. Issues and Projects are enabled; Discussions
  and Wiki are disabled; forking is currently allowed.
- The working tree also contains an untracked `.DS_Store`. It is not part of
  the reviewed commit and must remain unstaged unless explicitly intended.

## Visibility consequences

Changing the GitHub repository from private to public would make the full
reachable Git history and the current tracked tree publicly readable. It does
not publish the npm package or the Codex Skill.

- `package.json` remains at `sdd-yo@0.2.0` with `"private": true`. The
  reviewed package dry run reports 2,125 entries and no registry publication.
  The package smoke test also verifies the private, offline installation path.
- `.gitignore` excludes `*.tgz`, so generated package tarballs are not a
  normal tracked surface. A public-source transition must not be paired with
  `npm publish` or a marketplace release without separate authorization.
- The tracked dogfood records and completed bootstrap plan contain macOS
  absolute paths under `/Users/dev.briginas/dev/…`. The 152 reachable commits
  also carry the author email `dev.briginas@gmail.com`. These are public-data
  consequences of visibility, not credentials found by this review.
- A narrow scan of the current tree and all reachable history found no
  credential-shaped private key, AWS key, GitHub token, Slack token, Google API
  key, or npm token. The only history matches were test-only `npm_config_*`
  variable names and a loopback registry URL.
- Local `git fsck --no-reflogs --unreachable` reported unreachable objects,
  including five local commits. They are not reachable from a normal ref and
  are not made public by changing repository visibility, but a future
  `--mirror`, `--all`, or other nonstandard push must be separately reviewed.

## Local validation evidence

All commands below ran on the reviewed subject and passed:

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

`npm pack --dry-run --json` initially encountered the known root-owned default
npm-cache `EPERM`; rerunning with
`npm_config_cache=/private/tmp/sdd-yo-public-transition-cache` succeeded. Its
dry-run tarball identity was `sdd-yo@0.2.0`, with SHA-1
`733d6babb2f54a7d6ae811bddd7797a51d12e8d8` and 2,125 entries. This did not
write a tarball to the repository.

## GitHub configuration result

Read-only GitHub inspection confirmed the repository is private. Its
`security_and_analysis` field was unavailable (`null`). GitHub returned HTTP
403 for both ruleset listing and `main` branch-protection inspection, stating
that the feature requires GitHub Pro or a public repository. This is an access
limitation, not evidence that either control is configured.

## Post-transition checklist

After the repository is public, an authorized repository administrator must:

1. Re-read the repository visibility, default branch, and public source tree;
   confirm that the intended author identity, email, dogfood paths, and
   historical evidence are acceptable as public data.
2. Enable and verify private vulnerability reporting; verify the public
   `SECURITY.md` route and maintain a private maintainer contact fallback.
3. Inspect and enable GitHub security controls available to the selected plan,
   including dependency alerts, Dependabot alerts and updates, secret
   scanning, push protection, code scanning where applicable, and the security
   policy display.
4. Re-check repository rulesets and `main` protection after visibility makes
   them available. Require pull requests, the `CI / Validate` check, review
   policy appropriate to the maintainer model, linear history as desired, and
   explicit controls for force pushes and deletion.
5. Review Actions permissions, fork pull-request behavior, and workflow
   secrets; retain least-privilege `contents: read`, pinned Node version, and
   no credentials persisted by checkout.
6. Verify the issue, discussion, project, wiki, and fork settings against the
   intended public collaboration model.
7. Confirm the package remains private and that neither npm publication nor
   Codex-plugin marketplace publication is part of this transition.

## Separate authorization required

No remote action has occurred. Before proceeding, the repository owner must
separately authorize the exact set of desired actions: committing this handoff,
pushing it, any history rewrite or ref cleanup, GitHub metadata/ruleset/security
changes, and the private-to-public visibility change. Authorization for one of
these actions does not authorize the others.
