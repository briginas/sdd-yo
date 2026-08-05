# SDD Yo Architecture

This set records how the implemented behavior in the canonical
[product specification](../../spec/README.md) is realized without turning
implementation choices into hidden product requirements.

## Architecture map

- [System overview](overview.md)
- [Implementation stack](implementation-stack.md)
- [Markdown dialect](markdown-format.md)
- [Project configuration](configuration.md)
- [Fingerprints, Git comparison, and exact patches](fingerprints-and-git.md)
- [Workflow artifacts and schemas](artifact-schemas.md)
- [Test adapters](test-adapters.md)
- [CLI](cli.md)
- [Agent Skill](skill.md)
- [Security and trust](security.md)
- [Enforced governed scope operations](../../docs/enforced-governed-scope.md)
- [Evals and rollout](evals-and-rollout.md)

## Architectural status

These documents record maintained implementation choices and boundaries.
Canonical product Requirements remain authoritative when architecture and
product behavior conflict. New behavior enters through a bounded normal
`spec-code`, `spec`, or `code` Change; architecture prose does not create or
reserve product behavior.
