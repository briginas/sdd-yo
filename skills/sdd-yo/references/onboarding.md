# Initialization and onboarding

Load this reference only for initialize or onboard intent.

## Confirm the boundary

Before writing anything, obtain both:

1. one explicit existing directory as the project root; and
2. adoption mode `incremental` or `complete`.

Do not infer either value. Do not initialize a parent, adjacent project, or
repository root merely because it is nearby. Do not install the CLI.

## Initialize

Run:

```text
node scripts/check-cli-compatibility -- init --root <explicit-root> --adoption <incremental|complete>
```

Require a version 1 response with `command: "init"`, `status: "ok"`, a stable
`project_id`, no error diagnostics, and `result.created_paths` containing only
project-relative paths.

Verify existence and expected entry type only for each path reported in
`created_paths`, resolved beneath the explicit root. Reject absolute paths,
`..`, path escape, and symlink traversal. Do not scan for or alter other files.

## Formatter handoff

Tell the user which files the CLI reported. Ask whether the host repository's
existing formatter owns those created file types. If it does, obtain normal
permission and format only the reported created files. Do not detect, install,
configure, or execute a formatter on your own. If no formatter owns them,
record that boundary and leave the initialized bytes unchanged.

## Validate the empty project

After the formatter handoff is resolved, run:

```text
node scripts/check-cli-compatibility -- validate --cwd <explicit-root>
```

Require `status: "ok"`, `result.valid: true`, the same `project_id`, and an
empty object fingerprint list. Surface warnings, including incomplete Git
history, without converting them into failure or success claims they do not
make.

Stop after reporting initialization and validation. Do not create a Capability,
Requirement, Domain Concept, baseline, proposal, test evidence, or Git change.
