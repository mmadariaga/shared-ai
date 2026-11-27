> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

A harness shows a tool call as its raw command line. In opencode v2 there is no separate description field to read: the shell schema exposes only the command, workdir, timeout, and background, and `/sai-retrospective` indexes the command rather than a description. A `transfer.js` or `sai-state` call is dominated by transfer directories, report paths, hashes, machine ids, and event identifiers, so a person reviewing a run cannot tell what the call does without reconstructing its arguments. Review gets slower, mistakes stay hidden, and the same gap appears in a copied command, a shell log, and the transcript.

## What Changes

- `sai/tools/transfer.js` accepts an optional, display-only `--note <text>` on all eleven subcommands (`open`, `put`, `verify`, `materialize`, `accept`, `receive`, `status`, `watch`, `retire-handle`, `live`, `close`). Each subcommand's usage entry lists it, the shared flag map parses it, and the subcommand dispatch ignores it.
- `bin/sai-state.js` accepts the same note on every verb (`spawn`, `emit`, `reset`, `block`, `close`) and on every live `emit` form: the flag form (`--set`, `--add`, `--set-path`), `--input-file`, `--progress`, and `--document-file` with `--amend`. The parser gains an explicit flag-error path, and `spawn`, `reset`, `block`, and `close` reject extra positionals, as `emit` already did.
- Both tools keep the note out of every JSON response, ledger line, retired-handle record, event, report reference, machine state, and session state, and both tolerate a call that omits the note with no error, warning, or retry.
- A malformed note is a usage error: a missing value, a value that starts with `--`, a repeated flag, or an unquoted value that the shell splits into extra positionals. The retired `--ready-to-propose` and `--block-file` forms stay usage errors.
- New `sai/policies/tool-call-notes.md` is the single source for the convention: form, position, text rules, tolerance, malformed use, and the rule that prose-described calls carry the note too. `sai/policies/worker-report-transport.md`, `sai/policies/stage-machine.md`, and `sai/policies/tool-resolution.md` fetch it, so every surface that loads one of them, workers and budget skills included, sees the rule.
- Every instruction that shows an executable `transfer.js` or `sai-state` command in `sai/commands/**`, `sai/policies/**`, `skills/**`, `sai/orchestration/**`, and `agents/**` now spells it as `node <transfer-path> <subcommand>` or `node <sai-state-path> <verb>`, with a quoted note immediately after the subcommand or verb. Prose mentions and abbreviated code spans stay prose.
- New `test/tool-call-notes.test.js` fails when a spelled invocation lacks the note, accepts a placeholder, and ignores prose mentions, abbreviated code spans, `--help` examples, `docs/`, `README.md`, manifests, and fixtures. Existing tests that pin instruction text and usage strings were updated for the new spelling.

## Capabilities

### New Capabilities

- `transfer-call-notes`: `transfer.js` accepts a short human-readable note on every subcommand and keeps it out of its output and state.
- `sai-state-call-notes`: every `sai-state` verb and every live `emit` form accepts the same note and keeps it out of the event, the report reference, and the state.

### Modified Capabilities

None.

## Impact

New files:

- `sai/policies/tool-call-notes.md`
- `test/tool-call-notes.test.js`

Modified files:

- `bin/sai-state.js`
- `sai/tools/transfer.js`
- `sai/policies/`: `backlog-origin-transport.md`, `block-hygiene-judgment.md`, `command-execution.md`, `issue-format.md`, `issue-origin-preservation.md`, `opencode-dispatch.md`, `stage-machine.md`, `tool-resolution.md`, `worker-lifecycle.md`, `worker-report-transport.md`
- `sai/commands/`: `archive/coordinator.md`, `archive/worker.md`, `audit/coordinator.md`, `audit/worker-common.md`, `backfill/coordinator.md`, `backfill/worker.md`, `build/coordinator.md`, `commit/coordinator.md`, `commit/worker.md`, `deep-review/coordinator.md`, `explore/body.md`, `explore/direct-build-coordinator.md`, `explore/instructions.md`, `explore/steps/crystallization-protocol.md`, `explore/steps/pipeline-direct-build.md`, `explore/steps/pipeline-plan-unattended.md`, `explore/steps/pipeline-selector.md`, `explore/steps/route-selector.md`, `implement/coordinator.md`, `implement/worker-common.md`, `merge/coordinator.md`, `merge/worker.md`, `plan/cycle.md`, `plan/worker-common.md`, `review/coordinator.md`, `review/worker.md`, `spec/worker.md`
- `skills/universal/`: `from-backlog/SKILL.md`, `from-next-backlog-item/SKILL.md`, `new-change-branch/SKILL.md`, `sai-cache-warmer/SKILL.md`, `to-backlog/create.md`, `to-pr/SKILL.md`
- `test/`: `archive-backfill-goal-driven.test.js`, `budget-report-delivery.test.js`, `direct-build-command.test.js`, `direct-build-goal-driven.test.js`, `explore-agent-tools.test.js`, `explore-contract-preservation.test.js`, `explore-leave-confirmation.test.js`, `explore-pipeline-selector.test.js`, `explore-question-rounds.test.js`, `explore-stage-machine-consumption.test.js`, `merge-goal-driven.test.js`, `plan-family.test.js`, `project-settings.test.js`, `transfer-tool.test.js`, `undelivered-report-recovery.test.js`, `worker-report-transport.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
