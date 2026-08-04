# Performance benchmarks

The offline performance harness generates a deterministic synthetic SDD
Project, runs each measured workload in a fresh Node.js process, and emits one
JSON report. Fixture creation is outside measured time. A worker's
`process.resourceUsage().maxRSS` records peak resident memory for its isolated
process.

Run the documented full scale with five samples per workload:

```text
npm run benchmark:performance -- --profile full --samples 5
```

Retain a new report without replacing an existing evidence file:

```text
npm run benchmark:performance -- --profile full --samples 5 --output evals/performance/results/<environment>.json
```

Use the smoke profile only to verify harness wiring:

```text
npm run benchmark:performance -- --profile smoke --samples 1
```

The full profile contains exactly:

- 10,000 model objects in 100 MiB of UTF-8 specification content;
- 100,000 normalized test nodes;
- one warm inspect and one warm trace target in the constructed graph.

The report includes fixture generation version and SHA-256, scale, sample
count, median, p95, peak resident memory, CPU model and count, total memory,
platform, operating-system release, architecture, filesystem type, Node.js
version, package version, and a SHA-256 fingerprint over the benchmark script,
product source, package manifest, and lockfile. Repeated runs use identical
fixture bytes and source fingerprints when those inputs are unchanged, even
though timing and environment fields may differ. `--output` uses create-only
semantics and refuses to replace retained evidence.

`measurement_status` reports whether a workload produced measurements.
`target_status` reports `MET`, `NOT_MET`, `TARGET_UNSPECIFIED`, or
`NOT_MEASURED`. Overall target status is `INCOMPLETE` when any required
measurement failed or any target is unspecified. The accepted targets are 25
seconds p95 for full validation, 256 MiB peak resident memory for TestIndex
construction, and 1 second p95 for each warm query. The harness never converts
the presence of a measurement into a pass.

The exact environment fields in a retained full-profile report define that
run's reference machine. A result from one environment is not evidence for a
different operating system, architecture, runtime, or filesystem.

Full-profile results become performance evidence only when retained with the
exact report bytes and environment description. Smoke-profile results are
harness checks and cannot satisfy a product target.
