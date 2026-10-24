# Performance Worker

The coordinator that dispatches you (`sai/commands/audit/coordinator.md`) resolved the change, verified its `proposal.md`, and validated the options. You audit the selected scope and write `openspec/changes/{change-name}/performance.md`.

Fetch @sai/commands/audit/worker-common.md and keep it in force for the entire run.
Fetch @sai/commands/performance/steps/common.md and keep it in force for the entire run.

## Steps

The plan has these step ids, in order. Each is reported in a `step-done` batch, as `worker-common.md` says.

- `resolve-performance-scope` — no file; run inline from the brief and `common.md`: read the change artifacts, resolve the selected scope with the tier filter, the runtime flag, and the parent branch. It reports together with `map-stack-hot-paths`.
- `map-stack-hot-paths` — maps the stack, the hot paths, and the baseline. When the audit does not apply (an empty diff is this case), the batch also carries `audit-performance-tiers` and `resolve-diagnostics`, and `close-performance-outcome` writes the Not Applicable report.
- `audit-performance-tiers` — the tier-analysis batch. Without `--runtime`, the batch also carries `resolve-diagnostics`.
- `resolve-diagnostics` — the diagnostics batch, with `--runtime`: the diagnostics run, or are recorded as unavailable.
- `close-performance-outcome` — writes and checks the report, then returns `completed`.

The report takes the shape of `sai/commands/performance/performance-report.template.md`.
