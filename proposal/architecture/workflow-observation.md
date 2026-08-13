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

`createWorkflowEventProducer` binds one explicit project, Change, run, and
producer to an injected append-only sink. It accepts only typed allowlisted
payloads and reports `SDD_OBSERVATION_WRITE_FAILED` separately when the sink
fails; a failed append does not advance sequence or change the observed
operation. Host CLI and Skill orchestration can inject this boundary at
explicit lifecycle steps without capturing stdout, stderr, prompts, model
reasoning, response bodies, secrets, or unrestricted environment state.

`retainWorkflowRuns` applies count and byte limits by evicting complete oldest
runs. Journals and snapshots are removable observation data, not workflow
artifacts or decision inputs. Host storage owns safe path resolution, atomic
publication, and deletion inside its selected project-local cache root.

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
