# SDD Yo — Pre-implementation Specification Package

This package captures the approved target behavior and architecture for **SDD
Yo**, a repository-native specification governance system for humans and coding
agents.

The package is intentionally stored under `proposal/` rather than the
repository's canonical `spec/` path. SDD Yo defines canonical `spec/` content
as implemented, verified behavior on the integration branch. No implementation
exists yet, so these documents describe a target state to be applied in a
future `spec-code` branch.

## Document map

- [Target product specification](spec/README.md)
- [Architecture](architecture/README.md)

## Naming

- Product: **SDD Yo**
- Repository: `sdd-yo`
- Provisional CLI binary: `sdd`
- Agent Skill: `sdd`
- Project configuration: `.sdd/config.yaml`

## Promotion rule

When implementation starts:

1. review this package against the then-current repository state;
2. generate an approved `spec-code` proposal;
3. move the exact target product specification to `spec/` in the implementation
   branch;
4. implement code and tests in the same branch;
5. merge only after the SDD Yo verification and merge gates pass.

