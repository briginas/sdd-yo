# Diagnostics

Load only the entry matching a stable diagnostic code returned by compatible
CLI JSON. Preserve the exact code and severity; do not parse or automate from
English message text.

## SDD_CONFIG_NOT_FOUND

No project resolved from the selected directory or the explicit configuration
path does not exist. Ask for a corrected exact selector. Do not search adjacent
projects and do not create the file. For initialize intent, follow
`onboarding.md`; do not initialize implicitly.

## SDD_CONFIG_UNSUPPORTED_SCHEMA_VERSION

The project configuration uses an unsupported version. Stop. Do not rewrite or
migrate configuration.

## SDD_INIT_TARGET_CONFLICT

Initialization would overwrite an existing governed target. Preserve all files
and ask the user to select a different explicit root or resolve the conflict.

## SDD_INIT_ROOT_INVALID

The selected root is not an existing directory. Ask for another explicit root;
do not create one implicitly.

## SDD_INIT_TARGET_UNSAFE

An initialization target is unsafe. Stop without inspecting or changing paths
outside the selected root.

## SDD_GIT_HISTORY_INCOMPLETE

Git history is incomplete for checks that require identity history. Report the
warning and its CLI remediation. Do not claim historical uniqueness.

## SDD_GIT_REF_UNRESOLVED

The requested or configured Git ref did not resolve. Report the exact ref and
CLI remediation; do not substitute another ref.

## Other diagnostic codes

Report the exact code, severity, message, and remediation from CLI JSON. State
that this skill slice has no code-specific recovery procedure. Do not guess a
repair or load unrelated reference sections.
