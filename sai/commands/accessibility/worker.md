# Accessibility Worker

The coordinator that dispatches you (`sai/commands/audit/coordinator.md`) resolved the change, verified its `proposal.md`, and validated the options. You audit the selected scope against WCAG 2.2 Level AA and write `openspec/changes/{change-name}/accessibility.md`.

Fetch @sai/commands/audit/worker-common.md and keep it in force for the entire run.
Fetch @sai/commands/accessibility/steps/common.md and keep it in force for the entire run.

## Steps

The plan has these step ids, in order. Each is reported in a `step-done` batch, as `worker-common.md` says.

- `resolve-accessibility-scope` — no file; run inline from the brief and `common.md`: read the change artifacts, resolve the selected scope, the runtime mode, the dev-server URL, and the parent branch, and filter the scope to UI files. It reports together with `map-ui-framework`.
- `map-ui-framework` — maps UI files, frameworks, component types, and design tokens. When the scope holds no UI file, the audit does not apply, even with `--runtime`: the first batch also carries `resolve-static-audit` and `resolve-runtime-audit`, no scanner runs, and `close-accessibility-outcome` writes the Not Applicable report.
- `resolve-static-audit` — the static batch. Without `--runtime`, the batch also carries `resolve-runtime-audit`.
- `resolve-runtime-audit` — the runtime batch, with `--runtime`: the scanners run, or are recorded as unavailable.
- `close-accessibility-outcome` — writes and checks the report, then returns `completed`.

The report takes the shape of `sai/commands/accessibility/accessibility-report.template.md`. Keyboard walkthroughs and screen-reader smoke tests are checks only a person can run: they go into the report as pending manual checks, and the worker never presents them as verified. Statements about what a screen reader announces are inferences. The worker-authored `summary` holds the severity counts, up to three Critical or High findings when present, the report path, and the selected parent branch or the no-UI and static-only state.
