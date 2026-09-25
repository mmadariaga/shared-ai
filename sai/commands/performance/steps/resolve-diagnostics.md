# Performance Step — Resolve Diagnostics Gate

Active step: resolve-diagnostics. The step is done when the diagnostics gate is resolved — diagnostics run or legitimately skipped — and the `resolve-diagnostics` progress event is reported per the worker contract.

Diagnostics are optional, read-only measurements (`EXPLAIN`, `EXPLAIN ANALYZE` inside a rolled-back transaction, `lighthouse`, bundle analyzers, profilers in measurement mode) that firm up the numbers of tier-analysis findings.

1. When no diagnostic would firm up a finding in hand, resolve the gate as legitimately skipped without asking.
2. Otherwise return one `needs_input`, shaped per `@sai/policies/question-context.md`: list each proposed command with its target (database, environment, or URL) and the finding it serves, with options `Run diagnostics` / `Skip diagnostics`.
3. On `Run diagnostics`, run exactly the listed commands in bounded read-only measurement mode — never modify production code, schemas, migrations, configuration, dependencies, manifests, or lockfiles — and quote their outputs exactly as the findings' evidence. On `Skip diagnostics`, the findings keep their numbers marked `estimated — verify with {method}`.
