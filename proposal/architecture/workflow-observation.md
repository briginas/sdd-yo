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
`WorkflowJournalStore`. Initialization generates
`.sdd/staging/workflow-observation/spec-code/<run>.jsonl`; publication compares
the expected next sequence and whole-journal fingerprint before atomically
replacing complete JSONL bytes. Exact completed retries are idempotent, while
subject drift, stale writers, competing payloads, gaps, malformed bytes,
symbolic boundaries, traversal, and size excess fail before publication.

The `sdd-yo` Skill initializes or resumes exactly one journal for every newly
selected `spec-code` workflow and publishes only typed orchestration
boundaries. It retains the returned subject and cursor across human pauses and
agent turns. Observation failure is reported separately and does not change an
owning CLI result, human authority stop, artifact, or Git action. Other Skill
routes remain unchanged.

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

The running session watches the selected journal's parent directory so atomic
replacement publications remain visible. Notifications are hints only: they
trigger the shared complete-journal reader and deterministic replay. The
session accepts only the same project, Change, run, and producer at a strictly
later sequence, ignores an exact current duplicate, and preserves the last
valid snapshot when a read, validation, subject, or sequence check fails. That
failure is sent as a separate observer condition and never becomes workflow
state.

Snapshot events carry their `last_sequence` as the SSE `id`. The initial page
opens the stream with its rendered sequence, browser reconnects use
`Last-Event-ID`, and the server emits the current snapshot only when it is
strictly later than the client's cursor. The browser updates labeled text,
ordered stages, and artifact links in place through safe DOM properties; it
does not reload the page or interpret missing events. Closing the session is
idempotent and releases the journal watcher, connected SSE responses, and
loopback listener together.
