# Performance Step — Resolve Diagnostics Gate

Active step: resolve-diagnostics. Resolve the diagnostics authorization or applicability gate per the worker contract before any measurement runs; report the `resolve-diagnostics` progress event per the worker contract — completed whether the authorized diagnostics run or are legitimately skipped.

Diagnostics are optional, read-only measurements (`EXPLAIN`, `lighthouse`, profilers in measurement mode) executed only with explicit user authorization. When no diagnostic is applicable to the findings or scope in hand, the gate resolves as legitimately skipped without asking.

When authorization is granted, execute only bounded read-only measurement mode — never modify production code, schemas, migrations, configuration, dependencies, manifests, or lockfiles — and quote measured outputs exactly as evidence for the tier-analysis findings.
