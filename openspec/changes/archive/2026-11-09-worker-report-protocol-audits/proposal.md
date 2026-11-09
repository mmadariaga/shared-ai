> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The security, performance, and accessibility audit workers returned `event: step-done` and `event: question` inline, and the audit coordinator emitted `step_ids` to the step machine without `--progress`. No audit report was validated before the coordinator acted on it. The RED, GREEN, spec, design, and review workers already return their reports through the shared worker report transport; this change moves the audit workers onto the same protocol, in `/sai-5-security`, `/sai-6-performance`, `/sai-7-accessibility`, and the audit cycles of `/sai-deep-review`.

## What Changes

- `sai/commands/audit/worker-common.md` fetches `sai/policies/worker-report-transport.md` and follows its author side. The worker strips the `--report-dir` line of the first task message, saves every report as a new file in that directory with `transfer.js put`, and returns only the `{path, sha256}` reference with its `warming` line. Step reports become `progress-` report files (`event: progress`, `step_ids`, `changed_files: []`); a question becomes a `needs_input` report with `question` and `options`; `completed` (with `report_path` and `counts`) and `failed` results become terminal report files. The retired `step-done` and `question` events are invalid reports.
- `sai/commands/audit/coordinator.md` fetches the transport policy and follows its receiver side. Start gains a step that opens one report directory per cycle with `transfer.js open` and keeps it in the conversation; a directory that cannot be opened ends the run before any dispatch. The task message, and the first message of a replacement worker, open with `--report-dir`. Every response after ready is validated with `worker-report-validator.js` before any field is read: a `progress-` file with `--kind progress`, any other file with `--kind terminal --command {audit}`. An unresolvable validator stops the run on that obstacle. An accepted progress report file is passed unchanged to `sai-state emit <id> {audit}-steps@1 --progress --input-file <report file>`. A `cancelled` report is an obstacle. A report that does not validate is an obstacle: the first goes back to the same worker with the validator's errors, a second consecutive one replaces the worker. The report directory is closed at Close and kept by a failed, stopped, or unanswered run.
- `sai/commands/deep-review/coordinator.md` fetches the transport policy. Each activated audit cycle opens its own report directory before its worker exists; the driving session validates every audit report against its own directory and `--command` and passes accepted progress report files unchanged to the progress emit, one at a time in the fixed order security, performance, accessibility. A report that does not validate counts toward the audit's obstacle budget; a cycle recorded as `failed` keeps its directory, and a cycle that ends with its report verified closes it.
- The security, performance, and accessibility worker cards and their step files say "progress report" and "save the `completed` report and return its reference" instead of `step-done` and returning `completed`.
- `sai/policies/worker-report-transport.md` lists the audit workers among its users, names their role fields `report_path` and `counts`, keeps their report directory in the conversation, and names `security`, `performance`, and `accessibility` as validator commands.
- `AGENTS.md` describes the audit workers and coordinators on the report transport.
- Tests cover the new contract wording: `test/audit-coordinator.test.js`, `test/deep-review-coordinator.test.js`, `test/accessibility-coordinator-worker.test.js`, `test/performance-coordinator-worker.test.js`, `test/step-machine-wiring.test.js`, and `test/worker-report-transport.test.js`.

Task messages and step pointers stay inline. The `ready` handshake, dispose, and cache warming are unchanged. No capability profile in `sai/install-manifest.json` and no validator outcome value changes.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `unattended-audit-coordinator`: the audit coordinator opens a report directory per cycle, validates every audit report file before acting, and advances the step machine through the progress emit with the same file; audit workers return report references.
- `audit-command-progress-plans`: audit step reports become `progress` report files carrying `step_ids`.
- `deep-review-command`: the audit cycles of `/sai-deep-review` open their own report directories and validate audit reports through the shared transport.
- `direct-build-report-transport`: the shared worker report policy now covers the audit workers and their role fields.
- `security-phase-worker`: security step, question, and terminal results become report files returned as references, with no time field; the not-applicable and SCA-skip batches become progress reports.
- `accessibility-phase-worker`: accessibility step, question, and terminal results become report files returned as references, with no time field.
- `security-worker-bindings`: the bindings pass the worker's report references to the coordinator unchanged.
- `accessibility-worker-bindings`: the bindings pass the worker's report references to the coordinator unchanged; a question arrives as a `needs_input` report.
- `performance-worker-instructions`: step batches are reported as progress reports.
- `security-step-gated-delivery`: the first pointer follows the `--report-dir` line, and gated skips are reported in progress reports.
- `accessibility-step-gated-delivery`: the first pointer follows the `--report-dir` line, and gated skips are reported in progress reports.

## Impact

Modified files:

- `AGENTS.md`
- `sai/policies/worker-report-transport.md`
- `sai/commands/audit/coordinator.md`
- `sai/commands/audit/worker-common.md`
- `sai/commands/deep-review/coordinator.md`
- `sai/commands/security/worker.md`
- `sai/commands/security/steps/close-security-outcome.md`
- `sai/commands/security/steps/discover-module-map.md`
- `sai/commands/security/steps/resolve-sast-analysis.md`
- `sai/commands/security/steps/resolve-sca.md`
- `sai/commands/performance/worker.md`
- `sai/commands/performance/steps/audit-performance-tiers.md`
- `sai/commands/performance/steps/close-performance-outcome.md`
- `sai/commands/performance/steps/map-stack-hot-paths.md`
- `sai/commands/performance/steps/resolve-diagnostics.md`
- `sai/commands/accessibility/worker.md`
- `sai/commands/accessibility/steps/common.md`
- `sai/commands/accessibility/steps/close-accessibility-outcome.md`
- `sai/commands/accessibility/steps/map-ui-framework.md`
- `sai/commands/accessibility/steps/resolve-runtime-audit.md`
- `sai/commands/accessibility/steps/resolve-static-audit.md`
- `test/accessibility-coordinator-worker.test.js`
- `test/audit-coordinator.test.js`
- `test/deep-review-coordinator.test.js`
- `test/performance-coordinator-worker.test.js`
- `test/step-machine-wiring.test.js`
- `test/worker-report-transport.test.js`

New files: none.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Part of issue https://github.com/mmadariaga/shared-ai/issues/389, whose first two slices (worker-report-protocol-implement, worker-report-protocol-plan-review) are already archived; this slice and worker-report-protocol-utility-workers are independent of each other.
