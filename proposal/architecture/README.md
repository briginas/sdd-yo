# SDD Yo Architecture

This set explains how the target behavior in the
[product specification](../spec/README.md) can be implemented without turning
implementation choices into hidden product requirements.

## Architecture map

- [System overview](overview.md)
- [Self-bootstrap and incremental promotion](bootstrap.md)
- [Implementation stack](implementation-stack.md)
- [Markdown dialect](markdown-format.md)
- [Project configuration](configuration.md)
- [Fingerprints, Git comparison, and exact patches](fingerprints-and-git.md)
- [Workflow artifacts and schemas](artifact-schemas.md)
- [Test adapters](test-adapters.md)
- [CLI](cli.md)
- [Agent Skill](skill.md)
- [Security and trust](security.md)
- [Evals and rollout](evals-and-rollout.md)

## Architectural status

These documents record the chosen target design. Some bounded subsets are
implemented and promoted into canonical `spec/`, while the remaining target
behavior stays under `proposal/spec/`. The applicable product Requirement
remains authoritative when an architecture detail and product behavior
conflict.
