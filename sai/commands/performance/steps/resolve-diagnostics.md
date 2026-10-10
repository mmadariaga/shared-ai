# Performance Step — Resolve Diagnostics Gate

Active step: resolve-diagnostics. The step is done when the diagnostics gate is resolved — an authorized run, the user's skip, or no diagnostic that would firm up a finding — and the `resolve-diagnostics` progress event is reported per the worker contract.

Without `--runtime`, resolve the gate as legitimately skipped without asking; the findings keep their numbers marked as estimated. With it, diagnostics are read-only measurements (`EXPLAIN`, `EXPLAIN ANALYZE` inside a rolled-back transaction, `lighthouse`, bundle analyzers, profilers in measurement mode) that firm up the numbers of tier-analysis findings; run them only after explicit user authorization, in bounded measurement mode.

1. When no diagnostic would firm up a finding in hand, resolve the gate without asking.
2. Otherwise return one `needs_input`, shaped per `@sai/policies/question-context.md`: list each proposed command with its target (database, environment, or URL) and the finding it serves, with options `Run diagnostics` / `Skip diagnostics`.
3. On `Run diagnostics`, run exactly the listed commands and quote their outputs exactly as the findings' evidence; each measured number replaces the estimate it firms up. On `Skip diagnostics`, the findings keep their numbers marked as estimated.
