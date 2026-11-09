> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The commit worker returned its result inline, the archive and backfill workers used the shared worker report transport only on the Direct Build route, and the merge worker reported `blocked`, a status the shared validator rejects, while the merge coordinator read the report by path without validating it. Every routed worker now reports through one validated schema and one file-plus-hash transport, so every coordinator validates worker results through the same path, short results included.

## What Changes

- `sai/policies/worker-report-transport.md` now applies to the commit, archive, backfill, and merge workers of `/sai-commit`, `/sai-archive`, `/sai-backfill`, and `/sai-merge`; only the `--no-specs` POC keeps its existing transport. It names their role fields (commit: none; archive: `resolved_change_name`; backfill: `resolved_change_name`, `draft_references`, and `corrected_specs`; merge: the fields its step files name), their validator commands (`commit`, `archive`, `backfill`, `merge`), and where each keeps its report directory (the conversation for commit, archive, and backfill; `merge-run@1` for merge). The `failure_class` and `unrecoverable` fields now apply to every `failed` archive or backfill report that carries `resolved_change_name`, on every route.
- `sai/commands/commit/coordinator.md` and `worker.md`: the coordinator opens one report directory per run with `transfer.js open`, sends it as the first task line `--report-dir`, validates every report with `--command commit` before reading any field, sends a first invalid report back to the same worker and replaces it on a second consecutive one, and closes the directory at close unless the run stopped on an unresolved obstacle. The worker saves every `needs_input` and terminal report with `transfer.js put`, returns only `{path, sha256}` with its `warming` line, and reports `changed_files: []`. The authorization question, gates, stop texts, `Commit done.`, and the coordinator's ownership of `commit.js apply` are unchanged.
- `sai/commands/archive/coordinator.md` and `worker.md`: on the ordinary route the coordinator opens its own report directory, sends `--report-dir` with the change name, validates every report with `--command archive`, applies the same invalid-report rule, and closes the directory at close; the header-fix backfill worker receives the same `--report-dir` line and returns its corrected specs in the `corrected_specs` field of a report validated with `--command backfill`. The worker reports through the transport on every route.
- `sai/commands/backfill/coordinator.md` and `worker.md`: the coordinator opens a report directory separate from the transfer directory and sends `--report-dir` before `--transfer-dir`; it validates every report with `--command backfill`, applies the invalid-report rule, and hands both directories to a replacement worker. The worker strips the report line first, saves every report there, carries `draft_references` as a report field, and returns header-fix content as `corrected_specs` `{destination, content}` entries.
- `sai/commands/merge/coordinator.md`, `worker.md`, and `steps/*.md`: the coordinator opens a report directory right after `start`, records it in `merge-run@1` as a `report-dir` record, sends it as the first line of the first message to each worker, validates every report with `--command merge`, hands the accepted strategy and apply report paths on, and treats an invalid or `failed` report as an obstacle of its step. The worker saves each report through `transfer.js put`; the step reports use `completed | failed` in place of `done | escalate | blocked`, and an escalation is a non-empty `escalations` list on a `completed` strategy report. The run directory and report directory are both kept on a stopped run and removed or closed only on a completed one.
- `sai-state/machines/merge-run.js`: `record` accepts the `report-dir` reference, listed as `report_dirs`.
- `AGENTS.md` describes the new transport for the four commands.
- Tests in `test/worker-report-transport.test.js`, `test/merge-run-machine.test.js`, `test/merge-goal-driven.test.js`, and `test/direct-build-goal-driven.test.js` cover the new contract wording and the `report-dir` record.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `routed-commit-command`: the commit worker reports through the shared transport and its questions arrive as validated `needs_input` reports.
- `routed-archive-command`: the archive worker reports through the shared transport on the standalone route, and its failed reports carry the failure fields on every route.
- `routed-backfill-command`: the backfill worker reports through the shared transport on the standalone route, with its draft references as a report field and a report directory separate from the transfer directory.
- `merge-worker-discipline`: the merge worker saves its reports through the transport, reports a blocker as `failed` instead of `blocked`, and escalates through a non-empty `escalations` list.
- `merge-run-state`: `merge-run@1` records the run's report directory, which a replacement worker and a resumed run reuse.
- `merge-resolution-transport`: the merge coordinator opens a report directory and validates each report with `--command merge` before handing its path on.
- `sai-merge-command`: the coordinator loads the transport policy, and an invalid or `failed` worker report is an obstacle of its step.
- `backfill-draft-transport`: the report directory precedes the transfer directory on every route, and the header-fix content travels in a `corrected_specs` report field.
- `archive-content-recovery`: the header-fix worker returns its corrected specs in a validated report.
- `direct-build-report-transport`: the shared policy covers the standalone commit, archive, backfill, and merge workers, and the failure fields apply to archive and backfill on every route.

## Impact

- Modified: `AGENTS.md`, `sai-state/machines/merge-run.js`, `sai/commands/archive/coordinator.md`, `sai/commands/archive/worker.md`, `sai/commands/backfill/coordinator.md`, `sai/commands/backfill/worker.md`, `sai/commands/commit/coordinator.md`, `sai/commands/commit/worker.md`, `sai/commands/merge/coordinator.md`, `sai/commands/merge/worker.md`, `sai/commands/merge/steps/apply.md`, `sai/commands/merge/steps/common.md`, `sai/commands/merge/steps/renumbering-plan.md`, `sai/commands/merge/steps/strategy.md`, `sai/commands/merge/steps/test-correction.md`, `sai/policies/worker-report-transport.md`, `test/direct-build-goal-driven.test.js`, `test/merge-goal-driven.test.js`, `test/merge-run-machine.test.js`, `test/worker-report-transport.test.js`.
- Unchanged by design: task messages stay inline; the `ready` handshake, dispose, and cache warming; the commit and archive authorization gates, stop texts, and closing literals; the no-commit guard windows; the Direct Build routes of archive and backfill; every capability profile in `sai/install-manifest.json`; the outcome table of `sai/tools/worker-report-validator.js`; and the `validateText(..., 'terminal')` check of `resolutionFromSource` in `sai/tools/merge.js`.
- Known limitation: each report costs one extra file write and one validation call; the cost is not yet measured.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

This slice completes issue https://github.com/mmadariaga/shared-ai/issues/389; it is independent of worker-report-protocol-audits.
