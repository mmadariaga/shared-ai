# Performance Step — Resolve Diagnostics Gate

Active step: resolve-diagnostics. The step is done when every diagnostic that firms up a finding has run or is recorded as unavailable, and `step-done` is reported for `resolve-diagnostics`.

This step runs only with `--runtime`; without it the gate is resolved with no diagnostic, and the findings keep their numbers marked as estimated. `--runtime` is the whole authorization: ask no question, and never wait for an answer. Diagnostics are read-only measurements (`EXPLAIN`, `EXPLAIN ANALYZE` inside a rolled-back transaction, `lighthouse`, bundle analyzers, profilers in measurement mode), run in bounded measurement mode against a local or development target the repository configuration names, never against a production target.

1. List the diagnostics that would firm up a finding in hand, each with its target and the finding it serves. When none would, the gate is resolved.
2. Run each one. Quote its output exactly as the finding's evidence, and let the measured number replace the estimate it firms up.
3. A diagnostic whose tool is not installed, whose target is not reachable, or that has no safe target is not an obstacle: record it as unavailable in the report's `Diagnostics` field with the reason, keep the estimated mark on the numbers it would have firmed up, and go on.
