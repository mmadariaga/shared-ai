# Performance Step — Resolve Performance Tier Analysis

Active step: audit-performance-tiers. Evaluate every hot path of the selected scope against the checklists of its tier. The step is done when every hot path is evaluated against every item of its tier's checklist and the cross-cutting checklist, and every flaw is recorded with its fields; then report the `audit-performance-tiers` progress event per the worker contract.

Fetch @sai/commands/performance/performance-report.template.md

For each tier in the selected scope: Fetch @sai/commands/performance/checklists/<tier>.md

Record each flaw with the fields of the finding shape in the template.

### Cross-cutting checklist

- **Logging volume** — debug-level logging in hot paths (allocation + I/O cost)
- **Tracing** — new span coverage on the new endpoints / consumers
- **Feature flags** — branch evaluation in tight loops
- **External calls** — new third-party HTTP/RPC dependencies on the critical path; missing timeouts, missing circuit breakers

### Diagnostics without `--runtime`

Without `--runtime`, `resolve-diagnostics` has nothing to run: report it in the same progress event as `audit-performance-tiers`, ask no question, and keep the estimated marks on the findings' numbers. The next pointer is then `close-performance-outcome`.
