> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The spec and design workers reported `done | needs_input | blocked` and the review worker reported `no-changes | failed` plus an inline `event: step-done`, and neither the plan segment cycle nor the review coordinator validated a report before acting on it. The shared worker report protocol (`sai/policies/worker-report-transport.md`), delivered for the RED, GREEN, and Direct Build workers by `worker-report-protocol-implement`, gives one closed schema, a file-plus-sha256 transport, and a validator that decides whether a report is usable before any field is read. This change moves the spec, design, and review workers onto it, and expresses review's empty diff as a `completed` report with `outcome: no-changes`, so `/sai-4-review`, `/sai-build`, and `/sai-deep-review` decide on a field and never on summary text.

## What Changes

- `sai/policies/worker-report-transport.md` now covers the spec and design workers of the plan commands and the review worker of `/sai-4-review`, names their role fields (spec and design: `step_ids`, `warnings`, `notes`; review: `review_path`, `counts`, `recommended_audits`), adds a `### Progress reports` section (`event: progress`, `step_ids`, `changed_files`, files named with the `progress-` prefix and validated with `--kind progress`, passed unchanged to `sai-state emit <id> <machine> --progress --input-file <report file>`), keeps the report directory in `plan-run@1` for the plan commands and in the conversation for `/sai-4-review`, and treats an `outcome` the command does not admit, or a report whose content does not fit the kind its file name announces, as invalid.
- `sai/commands/plan/worker-common.md`, `sai/commands/spec/worker.md`, `sai/commands/design/worker.md`, `sai/commands/design/steps/design.md`, and `sai/commands/design/steps/overview.md`: the spec and design workers follow the author side of the policy, strip and keep the `--report-dir` line of their first task message, save every response as a new report file with `transfer.js put`, and return only its `{path, sha256}` reference with the warming line. Their status vocabulary is `completed | needs_input | failed | cancelled`, with `step_ids` kept as a role field; `done` and `blocked` are retired, and every former `blocked` path (spec defects the design worker cannot patch, artifact write failures, overview generation failures) reports `failed`.
- `sai/commands/plan/cycle.md`, `sai/commands/spec/coordinator.md`, and `sai/commands/design/coordinator.md`: a fresh run opens the report directory with `transfer.js open` after creating its run directory and records it in `plan-run@1` as a `report-dir` record; the first task message to a worker, a replacement included, opens with `--report-dir <path>`; each message names a new report name `{segment}-{k}.yaml`; every response after ready is validated with `worker-report-validator.js validate --kind terminal --command <spec|design>` before any field is read, and the step machine advances from the accepted payload's `step_ids`. An invalid report is obstacle `report-{k}`: the first goes back to the same worker with the validator's errors, a second consecutive one replaces the worker. Resume and replacement reuse the recorded report directory while it exists; a completed run closes it with `transfer.js close`, and a stopped, blocked, or unanswered run keeps it.
- `sai-state/machines/plan-run.js` admits the `record` kind `report-dir` (stored as `report_dirs`), as `implement-run.js` does.
- `sai/commands/review/worker.md` and its steps `establish-diff-scope.md`, `resolve-review-analysis.md`, and `close-review-outcome.md`: the review worker follows the author side of the policy, saves a `progress-` report with `step_ids: [review-intake, establish-diff-scope]` and later `[resolve-review-analysis]`, reports an empty diff as `completed` with `outcome: no-changes`, `changed_files: []`, and the unchanged literal summary, and closes with a `completed` report carrying `review_path`, `counts`, and `recommended_audits`, or a `failed` report. An inline result, a `step-done` event, or `no-changes` as a status is an invalid report.
- `sai/commands/review/coordinator.md`: the coordinator opens one report directory per run, keeps it in the conversation, sends `--report-dir` as the first line of the first task message (a replacement's included), validates each `progress-` report with `--kind progress` and every other report with `--kind terminal --command review`, passes each accepted progress report file to `sai-state emit <id> review-steps@1 --progress --input-file <report file>` (sending the next pointer from the static order when the emit fails), treats `needs_input` and `cancelled` as obstacles, ends an accepted `outcome: no-changes` exactly as before (same literal, no `review.md`, no commit, `Review done.`), and closes the report directory only after `Review done.`.
- `sai/commands/build/coordinator.md` and `sai/commands/deep-review/coordinator.md` read the empty-diff case from the accepted review payload's `outcome: no-changes`, never from the summary text; `/sai-deep-review` runs no triage, audit, Assessment pass, or fix segment for it, even with `--full` or `--path`.
- `AGENTS.md` documents the plan and review workers on the shared report transport.
- Tests: `test/worker-report-transport.test.js` gains coverage of the policy scope, the progress kind and file-name rule, per-command spec, design, and review validation (with `done` and `blocked` invalid), the plan cycle's report directory, the review worker and coordinator report handling, the build and deep-review `outcome` reading, and the existing report grants of the spec, design, and review workers and their commands on both harnesses; `test/plan-family.test.js` and `test/change-overview-contract.test.js` follow the new vocabulary.

Scope drift (not an implementation error): the coordinator reads a report's kind from its file name, so a file named `progress-…` is validated as a progress report and any other file as a terminal report. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): the review coordinator closes its report directory only after a run that ended with `Review done.`, and a failed, stopped, or unanswered review run keeps it; the plan cycle closes its report directory at a completed close and keeps it otherwise. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `plan-segment-cycle`: spec and design workers report through the shared transport in the unified status schema, and the segment cycle opens, records, validates against, and reuses one report directory per run.
- `review-phase-worker`: the review worker saves its step progress as `progress-` reports and its terminal result as a validated report, with `outcome: no-changes` for an empty diff.
- `review-phase-coordinator`: the review coordinator validates every report before reading it, feeds progress reports to `review-steps@1`, and reads the empty diff from `outcome`.
- `review-new-command`: coordinator verification follows validator acceptance, and step progress arrives as progress reports.
- `sai-review-command`: the deep-review empty-diff close reads `outcome: no-changes`.
- `deep-review-command`: `/sai-deep-review` reads the empty-diff case from the accepted review payload's `outcome`.
- `build-new-command`: `/sai-build` reads the empty-diff case from the accepted review payload's `outcome`.
- `direct-build-report-transport`: the shared worker report policy covers the spec, design, and review workers and defines progress reports.

## Impact

- Modified: `sai/policies/worker-report-transport.md`, `sai/commands/plan/cycle.md`, `sai/commands/plan/worker-common.md`, `sai/commands/spec/coordinator.md`, `sai/commands/spec/worker.md`, `sai/commands/design/coordinator.md`, `sai/commands/design/worker.md`, `sai/commands/design/steps/design.md`, `sai/commands/design/steps/overview.md`, `sai/commands/review/coordinator.md`, `sai/commands/review/worker.md`, `sai/commands/review/steps/establish-diff-scope.md`, `sai/commands/review/steps/resolve-review-analysis.md`, `sai/commands/review/steps/close-review-outcome.md`, `sai/commands/build/coordinator.md`, `sai/commands/deep-review/coordinator.md`, `sai-state/machines/plan-run.js`, `AGENTS.md`, `test/worker-report-transport.test.js`, `test/plan-family.test.js`, `test/change-overview-contract.test.js`.
- New: none.
- Unchanged: `sai/install-manifest.json` (the spec, design, and review workers already hold the `transfer.js put` grant, and their commands already hold `transfer.js open` and the validator); the audit, commit, archive, backfill, and merge workers keep their current report dialect.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Part of issue https://github.com/mmadariaga/shared-ai/issues/389. In this slice, I2 and I3 apply to the spec, design, and review workers and their coordinators only. Its dependency, worker-report-protocol-implement (https://github.com/mmadariaga/shared-ai/issues/393), is already implemented and committed (25cea29b): it delivered `sai/policies/worker-report-transport.md`, the validator's two kinds and `--command` outcome table including `review: no-changes`, and the RED, GREEN, and Direct Build migration, so none of that is redone here.

Future scope, outside this change: the audit workers (https://github.com/mmadariaga/shared-ai/issues/395) and the commit, archive, backfill, and merge workers (https://github.com/mmadariaga/shared-ai/issues/396) move to the protocol in their own slices.
