# Milestone 11 private installation and onboarding record

## Status and authority

- Status: completed archive; leaves 11.1 through 11.5 and the revised milestone
  done condition completed on 2026-08-06.
- Recorded against: repository history through `d52f1e7` plus the validated
  Yarn Plug'n'Play quickstart and closeout working tree. The closeout commit is
  discoverable from Git history and is not reconstructed in this record.
- Current planning authority remains
  [`../../IMPLEMENTATION_PLAN.md`](../../IMPLEMENTATION_PLAN.md). Canonical
  behavior remains under [`../../spec/`](../../spec/README.md).
- The originally planned leaf 11.6 was withdrawn by explicit user direction
  during closeout. It did not pass, and this archive does not claim retained
  macOS, Linux, or Windows external-project onboarding evidence.

## Objective and final boundary

Milestone 11 made the private `sdd-yo@0.1.0` package installable from one exact
local tarball, exposed deterministic package/CLI/schema/Skill identity,
installed and managed the optional Skill inside one selected Git repository,
and documented reproducible npm and Yarn Plug'n'Play first-use paths. It kept
the package and repository private and introduced no registry or marketplace
publication.

The final milestone boundary is local private-artifact installation and
first-run onboarding verified by deterministic repository and packed-consumer
tests. Cross-platform external-project study evidence, public or private
registry publication, marketplace availability, provenance, human QA, and
whole-project completeness are not milestone completion claims.

## Completed execution leaves

### 11.1 — CLI discoverability and compatibility identity

Introduced canonical `CAP-0AA61339`, `REQ-FFE60B5A`, `REQ-D9CF3A46`, and
`REQ-97D96950`. Stable top-level and command-specific help, exact CLI version
reporting, and machine-readable package/CLI/JSON-schema/Skill compatibility
identity were implemented at `cfa7d10`; the leaf completion record was updated
at `1dc37fa`. Identity commands remain projectless and mutation-free.

### 11.2 — Installable private npm tarball and version binding

Introduced canonical `CAP-6AD33965`, `REQ-B0B35D6D`, `REQ-A2199BC2`, and
`REQ-43B4311E`. Commit `c822e24` retained `"private": true`, the Node.js
`>=22.18.0` baseline, exact production dependencies, built CLI/library/type
surfaces, version 1 schemas, and the matching Skill payload. Package
installation has no lifecycle hook and works offline from the exact tarball.

### 11.3 — Explicit repository-scoped Skill installation and first use

Introduced canonical `CAP-45C2C93F`, `REQ-3F19778B`, `REQ-CF3A1070`, and
`REQ-A0456614`. The proposal approved by issuer `product-review`, actor
`Ivan Briginas`, was prepared from candidate commit `2017b02` against base
`fe5b59a` and applied to result fingerprint
`sha256:8dc5854d20d685b02be58812ae47a324327ff12dfa4dbc65366a369433474788`.
Implementation commit `0ceddcd` installs exact packaged Skill bytes only under
`.agents/skills/sdd-yo`, binds them to the repository-contained packaged CLI,
and completes explicit `init` plus first `validate` without PATH fallback.

### 11.4 — Explicit Skill update, removal, and lifecycle safety

Introduced canonical `CAP-6C317966`, `REQ-DAF21960`, `REQ-8DC50806`, and
`REQ-AA165BDE`. The proposal approved by issuer `product-review`, actor
`Ivan Briginas`, was prepared from candidate commit `078ead2` against base
`363d383` and applied to result fingerprint
`sha256:ecf5d825597e4681ca354ef45c2bddab11c1bcd3f0574b1215fe8802e9b7c462`.
Implementation commit `0d36288` added explicit ownership-checked update and
removal, exact no-op reporting, interruption rollback, and fail-closed
traversal, symlink, stale-binding, concurrent-state, and adjacent-project
handling.

### 11.5 — User-facing quickstart and recovery documentation

Commit `d52f1e7` added the root private-tarball quickstart, prerequisites,
identity check, repository Skill installation and invocation, initialization,
first validation, JSON automation, lifecycle commands, diagnostic recovery,
and human-authority boundaries. The closeout working tree added an isolated
`.sdd-tooling/consumer` path for Yarn Plug'n'Play repositories without changing
their Yarn dependency graph or `nodeLinker`.

The Requirement-named package smoke test binds the documented commands to the
packed README and executes the ordinary npm consumer plus the Yarn Plug'n'Play
fixture. The Yarn fixture keeps `.sdd-tooling/` ignored, installs the exact
tarball offline, binds the Skill to
`.sdd-tooling/consumer/node_modules/sdd-yo/dist/bin/sdd.js`, runs incremental
`init` and `validate`, and preserves `yarn.lock` and `.pnp.cjs` bytes.

## Withdrawn leaf and decision

The active plan originally contained this leaf:

> **11.6 — Clean external-project onboarding evidence.** Exercise the exact
> private packed artifact and documentation in fresh external incremental and
> complete-adoption fixtures on every supported platform. Require successful
> CLI and Skill compatibility checks, deterministic initialization and
> validation, no source checkout or global executable dependency, no
> unreported writes, and retained evidence tied to source, package, Skill,
> platform, and command versions. A local tarball proves private installation
> readiness; it does not claim registry or marketplace availability.

On 2026-08-06 the user explicitly directed that leaf 11.6 be removed and that
Milestone 11 close after the Yarn Plug'n'Play quickstart correction. The leaf
is therefore `withdrawn`, not `completed`, `passed`, `not applicable`, or
`deferred`. No cross-platform onboarding report was fabricated or inferred
from local package smoke, the local Boosty onboarding exercise, or older
cross-platform product conformance artifacts.

## Final package and validation evidence

The final documentation-bearing private `sdd-yo@0.1.0` tarball generated from
the closeout working tree has:

- SHA-256
  `47196cd225c7373f7461584aa023322d7c40dc998e3eec1ae07d63b404de6dd1`;
- 2,111 entries;
- packed size 1,133,121 bytes;
- unpacked size 5,911,765 bytes;
- 82 bundled production packages.

The complete closeout validation passed:

- `npm test`: 220 tests passed;
- `npm run test:package`: one packed-consumer smoke test passed, including the
  ordinary npm and isolated Yarn Plug'n'Play paths;
- `npm run check:schemas` passed;
- `npm run build` passed;
- `npm run typecheck` passed;
- `npm run format:check` passed;
- `npm run verify:contracts` passed with 27,245 checks;
- the contract verifier also passed from `/private/tmp` with 27,245 checks;
- `git diff --check` passed.

The final oracle count is lower than the pre-closeout 27,410 result because the
completed Milestone 11 prose was compacted out of the active plan. No maintained
contract, fixture, diagnostic family, required case, or canonical Requirement
was removed.

Passing automated checks do not create human approval or QA evidence. No
cross-platform onboarding result, registry or marketplace publication,
provenance claim, Git push, or release action is implied.

## Retained exclusions and follow-ups

- The package and repository remain private; no npm registry or Codex plugin
  marketplace publication occurred.
- No global CLI or Skill installation, source checkout, manual symlink, or
  install lifecycle hook is part of the documented onboarding route.
- No branch, commit, push, merge, approval, QA, or finding resolution is a
  version 1 CLI side effect.
- Post-Milestone 11 candidates and deferred work remain in the active
  [`IMPLEMENTATION_PLAN.md`](../../IMPLEMENTATION_PLAN.md) until separately
  selected.
