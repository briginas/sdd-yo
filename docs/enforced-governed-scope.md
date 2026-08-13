# Enforced governed scope operations

This guide is for project owners and CI operators who make an SDD Yo Merge
Gate result a required external merge condition. It applies only to the
Capabilities governed by the selected SDD Project. In `incremental` adoption,
a `PASS` is `PASS (governed scope only)`, not a claim that the complete
repository is specified or verified.

SDD Yo validates structure, issuer syntax, exact subjects, fingerprints,
evidence freshness, and deterministic gate status. Issuer text is untrusted
provenance. The invoking organization remains responsible for authenticating
issuers, authorizing actors, sandboxing adapter processes, protecting
credentials and hosts, and deciding whether its separation of duties is
sufficient.

## Authorization record

Before enforcement, the project owner records the following values in an
organization-controlled system outside the Git refs being assessed:

- selected `project_id`, configuration path, integration ref, and adoption
  mode;
- each evidence kind, its issuer naming convention, the external system that
  authenticates that issuer, and the actors or service identities authorized
  to produce it;
- each test adapter command, executable or image identity, protocol, permitted
  environment, credentials, filesystem scope, network policy, timeout, and
  resource limits;
- who may change the specification root, project scope, integration ref,
  evidence policy, adapter configuration, limits, or optional model policy;
- who may enable, disable, or bypass the required external check;
- incident contacts, retained-report location, rollback authority, and the
  conditions for re-enabling enforcement;
- the owner's explicit acceptance of this authorization, execution, incident,
  and rollback policy.

Repository configuration may name an adapter, but cannot authorize it. A
change to evidence policy, adapter, project boundary, integration ref,
materially expanded limit, or optional model policy requires fresh external
trust review. Evidence bound to the previous configuration is not reused.

## Enforcement contract

The external workflow:

1. selects exactly one SDD Project with `--cwd <project-root>` or
   `--config <project-root>/.sdd/config.yaml`;
2. obtains authenticated evidence through the systems named in the
   authorization record and materializes the exact retained bytes under an
   ignored project-local staging root;
3. invokes `sdd merge check` with the explicit ChangeDescriptor, retained
   proposal bundle, approval, TestIndex, test-execution, QA, applicable finding
   inputs, and, when model analysis is unavailable, the CLI-materialized
   SemanticAnalysisInputManifest plus recorder-created
   HumanSemanticReviewEvidence;
4. treats only a complete, schema-compatible MergeReport whose top-level status
   is `PASS` and whose process exit code is `0` as merge-ready;
5. fails closed on `BLOCKED`, `REVIEW_REQUIRED`, exit code `3`, timeout, crash,
   malformed or missing JSON, project mismatch, unknown schema major, or an
   unavailable required analyzer;
6. retains the exact inputs and deterministic report in the authorized
   project-namespaced store before cleaning the staging root;
7. exposes incremental results as `PASS (governed scope only)` and never
   relabels them as complete-project success.

Human output is an operator view and is not an automation API. The workflow
must not infer `PASS` from a green test command, a zero-object summary, a cached
report, a prior Git ref, or a repository file that claims to authorize its own
issuer.

The required-check decision is fail-closed and uses the process result and JSON
from the same invocation:

```text
merge_ready =
  process_exit_code == 0
  and response.schema_version == "1.0"
  and response.command == "merge.check"
  and response.project_id == selected_project_id
  and response.status == "ok"
  and response.result.status == "PASS"
  and response.result.adoption.mode == configured_adoption_mode
  and response.result.adoption.project_scope_fingerprint is present
```

Every other combination blocks the required check. In particular, exit code
`0` without the complete compatible JSON response does not allow a merge, and
a copied JSON `PASS` without the matching process result is not current gate
execution. The external check name or summary uses `SDD PASS (governed scope
only)` for `incremental` adoption and may use unqualified `SDD PASS` only for
an explicitly approved `complete` project.

In a repository containing multiple SDD Projects, the host workflow determines
which projects a change affects and requires an independent current result for
each selected project. Version 1 does not infer cross-project affected scope.
The authorized project owner configures those per-project jobs as hosting or CI
required checks. SDD Yo produces the report and exit code but never creates,
updates, bypasses, or removes branch protection.

## Incident response

An incident includes suspected issuer or credential compromise, unauthorized
evidence, unexpected adapter execution, trust-configuration drift, stale or
contradictory evidence, a crash or timeout, loss of retained inputs, a moved
Git subject, or any path that appears to produce success without a complete
current report.

The operator first contains the incident without manufacturing a replacement
decision:

1. keep the required check fail-closed when repository integrity is uncertain;
2. stop accepting new evidence from affected issuers and stop affected
   adapters;
3. preserve the exact report, inputs, resolved Git object IDs, CLI version,
   configuration, adapter identity, logs that do not contain secrets, and the
   external authentication record;
4. revoke or rotate affected credentials in the owning external system;
5. classify affected projects, refs, evidence kinds, and time windows;
6. invalidate and regenerate dependent indexes, evidence, findings, and reports
   after remediation;
7. escalate any suspected false `PASS` for focused security review before
   re-enabling enforcement.

Deleting derived caches is safe, but a cache is never incident evidence or a
source of truth. Do not roll Git refs back, rewrite canonical specification,
edit retained artifacts, weaken exact-subject validation, or convert a
technical failure into `PASS`.

## Rollback of enforcement

Rollback disables the external merge requirement; it does not change SDD Yo's
deterministic result or the canonical specification. Only an owner authorized
in the operational record may accept the temporary loss of enforcement.

1. record the reason, affected SDD Projects, approving owner, start time, and
   restoration condition;
2. preserve the last exact gate inputs and report;
3. remove or disable only the hosting or CI rule that requires the SDD check;
4. leave canonical `spec/`, Git refs, evidence bytes, findings, and project
   configuration unchanged unless they independently require an approved
   Change;
5. make the unenforced state visible to contributors and prevent cached or
   historical `PASS` reports from being presented as current protection;
6. remediate the external system or SDD integration and obtain fresh evidence;
7. rerun the complete gate against current refs and inputs;
8. restore the required check only after a current `PASS` and explicit owner
   confirmation that the restoration condition is satisfied.

If organizational policy forbids merging while the check is unavailable, keep
the check required and blocked instead of rolling enforcement back. SDD Yo does
not choose between those policies and never modifies branch protection itself.

## Acceptance boundary

Publishing this guide does not constitute project-owner acceptance. Before a
project enters enforced governed scope, an identified owner must explicitly
accept its concrete authorization record, adapter execution boundary, incident
response, and rollback policy through the organization's authorized workflow.
That decision must not be inferred from repository ownership, passing tests,
configuration authorship, or this document.

Related contracts:

- [Security and trust](../proposal/architecture/security.md)
- [Workflow artifact retention](../proposal/architecture/artifact-schemas.md#retention-topology)
- [Command-line interface](../proposal/architecture/cli.md)
- [Evals and rollout](../proposal/architecture/evals-and-rollout.md)
- [Merge readiness](../spec/capabilities/merge-readiness.md)
