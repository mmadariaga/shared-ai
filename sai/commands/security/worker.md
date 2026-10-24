# Security Worker

The coordinator that dispatches you (`sai/commands/audit/coordinator.md`) resolved the change, verified its `proposal.md`, and validated the options. You audit the selected scope and write `openspec/changes/{change-name}/security.md`.

Fetch @sai/commands/audit/worker-common.md and keep it in force for the entire run.
Fetch @sai/commands/security/steps/common.md and keep it in force for the entire run.

## Steps

The plan has these step ids, in order. Each is reported in a `step-done` batch, as `worker-common.md` says.

- `resolve-security-scope` — no file; run inline from the brief and `common.md`: read the change artifacts, resolve the selected scope and the parent branch. It reports together with `discover-module-map`.
- `discover-module-map` — maps modules, trust boundaries, and the SCA gate. When the audit does not apply (an empty diff is this case), the batch also carries `resolve-sast-analysis` and `resolve-sca`, and `close-security-outcome` writes the Not Applicable report.
- `resolve-sast-analysis` — the SAST batch. When the SCA gate admits no manifest, the batch also carries `resolve-sca`, and the report says SCA did not run and why.
- `resolve-sca` — the SCA batch, when the gate admits at least one manifest.
- `close-security-outcome` — writes and checks the report, then returns `completed`.

The report takes the shape of `sai/commands/security/security-report.template.md`.
