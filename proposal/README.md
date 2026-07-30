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

Implementation follows the
[self-bootstrap procedure](architecture/bootstrap.md):

1. review this package against the then-current repository state;
2. materialize contract fixtures without claiming runtime behavior;
3. select one bounded target Requirement set;
4. promote only that set into canonical `spec/` in its `spec-code` branch;
5. implement code and Requirement-named tests in the same branch;
6. use the strongest currently implemented checks without fabricating an SDD
   gate result;
7. transition from manual bootstrap validation to advisory self-validation and
   finally normal SDD gates.

The complete target specification is never copied into canonical `spec/`
before its behavior exists.
