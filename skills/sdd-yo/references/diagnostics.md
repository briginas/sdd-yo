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

## SDD_GIT_REF_UNRESOLVED

The requested or configured Git ref did not resolve. Report the exact ref and
CLI remediation; do not substitute another ref.

## SDD_USER_SKILL_PLATFORM_UNSUPPORTED

User-scoped installation, update, and removal are supported only on macOS.
Stop. Do not substitute a repository or global installation.

## SDD_USER_SKILL_ROOT_INVALID

The selected home or Application Support root is unavailable or unsafe.
Preserve all bytes and correct the platform root before retrying the explicit
lifecycle command.

## SDD_USER_SKILL_TARGET_UNSAFE

A user-store path component is not a safe real directory. Stop without
following links, creating descendants, or changing either store.

## SDD_USER_SKILL_PACKAGE_INVALID

The executing package, private CLI source, Skill payload, compatibility
identity, or declared inventory did not verify. Do not install or update from
these bytes and do not fetch a replacement implicitly.

## SDD_USER_SKILL_INSTALL_DESTINATION_EXISTS

An active destination already exists. Preserve it. Use explicit verified
update or removal; never overwrite it as a fresh installation.

## SDD_USER_SKILL_UPDATE_COLLISION

The target private version path is occupied by different bytes. Preserve both
stores and resolve the collision outside SDD Yo before retrying explicitly.

## SDD_USER_SKILL_LIFECYCLE_OWNERSHIP_INVALID

The selected user Skill or private CLI binding, inventory, path, identity, or
owned bytes did not verify. Preserve both stores. Do not delete, overwrite,
repair, or fall back to another CLI.

## SDD_USER_SKILL_LIFECYCLE_STATE_CHANGED

Verified lifecycle state changed before publication or removal. Preserve the
concurrent bytes and retry only after reviewing the selected stores.

## SDD_USER_SKILL_RECOVERY_REQUIRED

A prior explicit user lifecycle operation left private recovery state. Run the
intended explicit lifecycle command again to reconcile verified state. Do not
run an ordinary product command as repair.

## SDD_USER_SKILL_RECOVERY_INVALID

Private recovery state does not match the executing package or active binding.
Preserve it and stop; do not guess, merge, or delete recovery bytes.

## SDD_USER_SKILL_INSTALL_FAILED, SDD_USER_SKILL_UPDATE_FAILED, or SDD_USER_SKILL_REMOVE_FAILED

The explicit lifecycle command encountered a handled I/O failure. Preserve the
reported state and retry the same explicit command only after correcting the
technical cause. Never switch to PATH, global installation, overwrite, or
manual recursive deletion as recovery.

## Other diagnostic codes

Report the exact code, severity, message, and remediation from CLI JSON. State
that this skill slice has no code-specific recovery procedure. Do not guess a
repair or load unrelated reference sections.
