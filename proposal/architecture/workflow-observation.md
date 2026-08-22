# Read-only workflow observation

## Product boundary

`WorkflowEvent -> WorkflowSnapshot` is the provider-neutral boundary. The
runtime validates allowlisted discriminated events and replays them with a pure
sequence reducer. Exact duplicate delivery is idempotent; conflicting
duplicates, gaps, mixed projects, mixed producers, and invalid transitions fail
before a new snapshot is returned.

Execution, deterministic CLI outcome, merge readiness, artifact freshness,
approval, and integration remain separate typed fields. The observation module
does not import gate composition and never converts one field into another.

## Producers and retention

`createWorkflowEventProducer` remains the provider-neutral append boundary.
The resumable CLI path binds one explicit project, Change, run, and producer to
`WorkflowJournalStore`. Initialization generates the mode-scoped path
`.sdd/staging/workflow-observation/<mode>/<run>.jsonl`. A `code` initialization
also resolves the selected base once as `base_ref` and binds canonical non-empty
`code_targets`, including every active Requirement's semantic and structural
fingerprints, into the immutable run subject. Publication compares the expected
next sequence and whole-journal fingerprint before atomically replacing
complete JSONL bytes. Resume and publication require the same complete subject.
Exact completed retries are idempotent, while subject drift, stale writers,
competing payloads, gaps, malformed bytes, symbolic boundaries, traversal, and
size excess fail before publication.

The `sdd-yo` Skill initializes or resumes exactly one journal for every newly
selected `spec-code` or `code` workflow and publishes only typed orchestration
boundaries. It retains the returned mode-specific subject and cursor across
human pauses and agent turns. A `code` route references only its package-only
unchanged ProposalPackage and proceeds from an explicit proposal decision to
implementation; it never invents semantic-model confirmation, identity
generation, authored-candidate materialization, branch preparation, or
SpecPatch preparation or application. Observation failure is reported
separately and does not change an owning CLI result, human authority stop,
artifact, or Git action. `spec` and non-Change Skill routes remain unchanged.

`retainWorkflowRuns` applies count and byte limits by evicting complete oldest
runs. Journals and snapshots are removable observation data, not workflow
artifacts or decision inputs. The Node store owns safe path resolution,
non-symbolic parents, exclusive creation, a sibling writer lock, fingerprint
compare-and-swap, and atomic replacement inside the selected project root.

## Local renderer

`startWorkflowObserver` creates one temporary HTTP server on
`127.0.0.1` and an operating-system-selected port. A 256-bit random capability
protects the initial HTML, current versioned snapshot, Server-Sent Events, and
only the exact artifact paths already present in that snapshot. The server
rejects other hosts, origins, methods, paths, traversal, symbolic links, and
subjects; responses disable caching and MIME sniffing.

The renderer uses document landmarks, text labels, focus indication, a polite
live region, and separate status cards. It contains no mutation endpoint or
control. Disconnect changes only the observer banner; it does not change the
workflow snapshot or an authoritative SDD value. Closing the session releases
all clients and the listener.

The running session watches the selected mode-scoped journal's parent directory
so atomic replacement publications remain visible. Notifications are hints
only: they trigger the shared complete-journal reader and deterministic replay.
The session accepts only the same complete mode-specific subject at a strictly
later sequence, ignores an exact current duplicate, and preserves the last
valid snapshot when a read, validation, subject, or sequence check fails. For
`code`, that subject includes `base_ref` and the exact `code_targets` bindings.
The failure is sent as a separate observer condition and never becomes workflow
state.

Snapshot events carry their `last_sequence` as the SSE `id`. The initial page
opens the stream with its rendered sequence, browser reconnects use
`Last-Event-ID`, and the server emits the current snapshot only when it is
strictly later than the client's cursor. The browser updates labeled text,
ordered stages, and artifact links in place through safe DOM properties; it
does not reload the page or interpret missing events. Closing the session is
idempotent and releases the journal watcher, connected SSE responses, and
loopback listener together.

## Mode-specific stage projection

The shared reducer selects one stable projection from the run mode. A
`spec-code` run retains its nine stages. A `code` run has exactly seven stages:
`workflow-initialization` (workflow initialization and targets),
`code-proposal`, `proposal-decision`, `implementation`,
`verification-and-review`, `local-integration`, and `terminal-outcome`. Its
proposal stage references the package-only unchanged ProposalPackage.
Semantic-model, authored specification-candidate, branch-preparation, and
exact-SpecPatch stages do not exist in the `code` projection and are never
inferred from later progress.

Both projections use the same explicit stage states, partial-start semantics,
live-follow transport, and independent approval, readiness, freshness, and
integration axes. Evidence invalidated by an implementation or normalization
head movement is stale until its owning workflow refreshes it. Waiting records
only a real authority boundary; terminal completion supplies no approval,
readiness, Git, merge, publication, or release authority.
