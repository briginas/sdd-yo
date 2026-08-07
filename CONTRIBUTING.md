# Contributing to SDD Yo

Issues and pull requests are welcome. Keep each contribution bounded,
reviewable, and independently verifiable.

## Before starting

- Read [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) for the active
  milestone and immediate leaf.
- Use [`spec/README.md`](spec/README.md) as the source of truth for implemented
  product behavior and
  [`proposal/architecture/README.md`](proposal/architecture/README.md) for
  implementation boundaries.
- Discuss product-behavior or specification changes in an issue before
  implementation. New behavior must use the repository's normal governed
  Change workflow.
- Report vulnerabilities through [`SECURITY.md`](SECURITY.md), not a public
  issue.

## Development setup

Use Node.js `22.18.0` or newer and the locked npm dependency graph:

```text
npm ci
```

Do not add a runtime dependency unless the platform API and existing
dependencies are insufficient and the reason is documented.

## Change discipline

- Keep one concern per pull request and preserve unrelated files.
- State the intended behavior, explicit exclusions, and validation evidence.
- Name every affected `REQ-XXXXXXXX` identifier in the pull request.
- Every executable test that verifies a Requirement must include its exact
  uppercase Requirement ID in the normalized test or ancestor-suite name.
- Keep deterministic CLI output, human approval, QA, and review evidence
  distinct. Passing tests do not imply a human decision.
- Do not add automatic branch, commit, push, merge, approval, or QA side
  effects to the version 1 CLI.

## Validation

Run the complete repository validation before requesting review:

```text
npm test
npm run test:package
npm run check:schemas
npm run build
npm run typecheck
npm run format:check
npm run verify:contracts
git diff --check
```

Include the commands that ran and their outcomes in the pull request. A
failure, timeout, unavailable dependency, or incomplete result is not a pass.

## License

By submitting a contribution, you agree that it may be distributed under the
repository's [Apache License 2.0](LICENSE).
