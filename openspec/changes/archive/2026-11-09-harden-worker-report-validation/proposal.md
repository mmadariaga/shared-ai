> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The worker report validator checked no role fields and accepted unknown keys (`sai/tools/worker-report-validator.js`), and `sai-state emit --progress` re-read the progress report by path after the coordinator had validated it (`bin/sai-state.js`), with no hash or directory check. Coordinators could therefore act on reports that `sai/policies/worker-report-transport.md` calls invalid, and a saved report could be silently replaced by a later `transfer.js put` onto the same name.

## What Changes

- `sai/tools/worker-report-validator.js` closes each terminal report to its command's shape: a new `COMMAND_FIELDS` table, beside `COMMAND_OUTCOMES`, lists the role fields of every `--command` value (`spec`, `design`, `implement`, `review`, `security`, `performance`, `accessibility`, `commit`, `archive`, `backfill`, `merge`, `direct-build`) with their types and the statuses that must or may carry them. A key that is neither a base field nor a role field of the command is rejected, and so is a key of the other kind (`event` in a terminal report, `status` in a progress report). A role field of the wrong type, or a missing required one, is rejected.
- A terminal validation without `--command` is a usage error; a progress validation takes none. `sai/tools/merge.js` validates its resolution source with `--command merge`.
- The unused batch `questions` form of `needs_input` is deleted from the validator together with its tests; the integer `counts.questions` of a review report stays valid.
- `sai-state emit --progress` gains a reference mode (`--report-dir`, `--report-file`, `--report-hash`, all three together): it verifies the reference once (directory, containment, symbolic links, sha256), validates those same bytes, and advances the machine from them. A foreign directory, a wrong hash, or an altered file is refused and the machine does not advance. The `--input-file` and stdin forms keep their current behavior, with no hash check.
- The review and audit coordinators (`sai/commands/review/coordinator.md`, `sai/commands/audit/coordinator.md`, and the parallel cycles of `sai/commands/deep-review/coordinator.md`) pass a progress report to the machine in reference mode and no longer run a separate `validate --kind progress` call before it.
- `sai/tools/transfer.js put` gains an opt-in `--exclusive` that creates the file with one exclusive-create open, so an existing name fails atomically and the existing file and its sha256 stay unchanged; without the flag `put` still replaces. `sai/policies/worker-report-transport.md` § Author boundary and every worker card that spells the report `put` command add `--exclusive`; block export and backfill drafts keep the replacing default.
- `sai/policies/worker-report-transport.md` gains a § Role fields table that mirrors `COMMAND_FIELDS`, merge role fields included, and its invalid-report rule names unknown keys, cross-kind keys, and missing or mistyped role fields. `sai/policies/stage-machine.md` and `sai/policies/tool-resolution.md` document the reference mode and the mandatory `--command`.
- The `AGENTS.md` `sai/tools/` row no longer says the validator is used by the retired command runner (F26).
- Tests: `test/worker-report-validator.test.js`, `test/worker-report-transport.test.js` (including a parity test between `COMMAND_FIELDS` and the policy's role-field table), `test/sai-state-progress-emit.test.js`, `test/transfer-tool.test.js`, and `test/merge-efficiency-tool.test.js`.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `progress-event-lifecycle`: a progress report advances the step machine from a verified report reference.
- `transfer-file-transport`: `put --exclusive` creates worker report files exclusively.
- `direct-build-report-transport`: the closed per-command report shape, Direct Build role fields included.
- `review-phase-coordinator`: the review coordinator passes a progress report to the machine in reference mode, with no separate progress validation.
- `audit-command-progress-plans`: the audit coordinator passes a progress report to the machine in reference mode.
- `unattended-audit-coordinator`: the audit cycle passes progress references to the machine and validates only terminal reports separately.
- `stage-machine-emit-delivery`: the stage-machine policy documents the progress emit in its reference and input forms.
- `stage-machine-cli-interface`: `emit --progress` accepts the reference mode beside the input file and stdin.
- `step-machine-progress-emit`: the verdict parity requirement names `validateText(text, kind, options)` and the reference mode through `validateFile`.
- `payload-validation-fidelity`: a terminal validation without `--command` is a usage error.
- `merge-resolution-transport`: `merge.js` validates the apply report with the merge command.

## Impact

Modified files:

- `AGENTS.md`
- `bin/sai-state.js`
- `sai/commands/archive/worker.md`
- `sai/commands/audit/coordinator.md`
- `sai/commands/audit/worker-common.md`
- `sai/commands/backfill/worker.md`
- `sai/commands/commit/worker.md`
- `sai/commands/deep-review/coordinator.md`
- `sai/commands/implement/worker-common.md`
- `sai/commands/merge/steps/common.md`
- `sai/commands/merge/worker.md`
- `sai/commands/plan/worker-common.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/review/worker.md`
- `sai/policies/stage-machine.md`
- `sai/policies/tool-resolution.md`
- `sai/policies/worker-report-transport.md`
- `sai/tools/merge.js`
- `sai/tools/transfer.js`
- `sai/tools/worker-report-validator.js`
- `test/merge-efficiency-tool.test.js`
- `test/sai-state-progress-emit.test.js`
- `test/transfer-tool.test.js`
- `test/worker-report-transport.test.js`
- `test/worker-report-validator.test.js`

No new files. The change adds support for no harness other than Claude Code and opencode, which behave the same, and changes nothing in the scope of issue #390.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

This change is one of four themed changes from issue https://github.com/mmadariaga/shared-ai/issues/399. The block deliberately carries no Backlog origin: an archive of this change must not close #399, which keeps tracking the other changes and the follow-ups; the user closes #399 by hand. F26 is the AGENTS.md `sai/tools/` row that still says the validator is used by the retired command runner. Issue #390 changes `bin/sai-state.js` and `sai/policies/stage-machine.md` too, in different sections; whichever change lands second adapts to the first.
