> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Workers reported in several dialects and only Direct Build and the merge tool validated reports, so other coordinators guessed from malformed reports by reading them. This change introduces one closed worker report schema and one file-plus-hash transport, validated by `worker-report-validator.js` before the coordinator acts, and moves the `/sai-3-implement` RED and GREEN workers and the Direct Build workers onto it.

## What Changes

- `sai/policies/worker-report-transport.md` (new) generalizes the retired `sai/policies/direct-build-report-transport.md` into the single worker report policy: the closed report schema (`completed | needs_input | failed | cancelled`, an optional command-admitted `outcome` on `completed`, role fields per worker contract), the author side (save each response as a new file with `transfer.js put` in the run's report directory and return only `{path, sha256}` with the `warming:` line), the receiver side (`worker-report-validator.js validate --kind terminal --command <command> --json --report-dir --report-file --report-hash`, then act on the accepted `payload` without another read), the invalid-report recovery (first invalid report back to the same worker with the validator's errors, a second consecutive one replaces the worker, each one obstacle attempt), and the Direct Build role fields `failure_class` and `unrecoverable`. Messages outside the schema (ready reply, wake `ok`, the `warming:` line, `budget-*` helper results) keep their form, and worker families whose contract does not fetch the policy keep their present dialect.
- `sai/tools/worker-report-validator.js` admits two kinds, `terminal` and `progress`; the `notice` and `conflict_detected` kinds and their validators are removed. A new `--command <name>` option selects the `outcome` values a `completed` report may carry from the `COMMAND_OUTCOMES` table, the single source (`review: no-changes`; every other command admits none). An `outcome` on a non-`completed` report, without `--command`, or outside the command's values is invalid; an unknown `--command` value is a usage error.
- `/sai-3-implement`: the coordinator opens one report directory per run with `transfer.js open`, records it in `implement-run@1` (new `record` kind `report-dir`), sends it as the first task-disclosure line `--report-dir` to each RED and GREEN worker (replacements included), validates every report with `--command implement` before reading any field, stops on the obstacle when the validator cannot be resolved, answers `needs_input` from the change's artifacts or the repository and records it as a deviation (force majeure escalation only when nothing answers and the answer would change the code), reuses the report directory on resume, and closes it with the run directory. RED and GREEN replace `done | blocked` with the unified statuses and report contradictions as `needs_input`.
- The Direct Build coordinator and its implementation, backfill, and archive worker contracts point at `worker-report-transport.md`, and the coordinator validates each report with the `--command` of the worker that wrote it (`direct-build`, `backfill`, or `archive`).
- `sai/install-manifest.json` grants `transfer.js put` to the `worker-write` capability profile and declares `sai/policies/direct-build-report-transport.md` a retired path for Claude Code and opencode.
- `sai/policies/tool-resolution.md`, `AGENTS.md`, and `docs/commands/sai-3-implement.md` point at the new policy, describe the two validator kinds, and document the report flow.
- Tests are updated: the transport test is renamed to `test/worker-report-transport.test.js` and extended, and the validator, progress-emit, implement-family, Direct Build, and preset-alignment tests drop the retired kinds and vocabularies.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `direct-build-report-transport`: generalized into the shared worker report transport, with the closed report schema, invalid-report recovery under the obstacle budget, the validator gate before any field is read, `--command` on the receiver call, and the Direct Build failure fields moved to `worker-report-transport.md` § Direct Build role fields.
- `payload-validation-fidelity`: the validator admits exactly the `terminal` and `progress` kinds and restricts a `completed` report's `outcome` to the values the named command admits.
- `implement-new-workers`: RED and GREEN report through the shared transport with the unified statuses, can report `needs_input`, and the implement coordinator validates every report before acting on it.
- `implement-new-loop`: the step brief names the report the worker saves in the run's report directory, and a report that does not validate is an obstacle.
- `implement-new-resilience`: the run state records the report directory (`record` kind `report-dir`), an invalid report goes back to the same worker with the validator's errors before replacement, and a completed close also closes the report directory.
- `validator-stamping`: the timeless verdict and the `received_at` response cover the two remaining kinds, `terminal` and `progress`.
- `orchestration-core`: stateless validation covers the two kinds and the optional `--command`, reference-based reports cover RED and GREEN as well as full Direct Build, and the retired kinds are usage errors.
- `validator-tool-paths`: report-reference validation passes `--kind terminal --command <command>` for every worker that follows the shared transport.
- `step-machine-progress-emit`: terminal payloads keep validating through `--kind terminal`; the retired kinds are no longer validated separately.
- `auto-fast-implement-worker`, `routed-archive-command`, `routed-backfill-command`, `tool-input-file-delivery`: their citations move from `direct-build-report-transport.md` to `worker-report-transport.md`.
- `nonterminal-result-transport`: the `conflict_detected` closed extension is removed together with its validator kind.

## Impact

New files:
- `sai/policies/worker-report-transport.md`
- `test/worker-report-transport.test.js` (renamed from `test/direct-build-report-transport.test.js`)

Removed files:
- `sai/policies/direct-build-report-transport.md`

Modified files:
- `AGENTS.md`
- `docs/commands/sai-3-implement.md`
- `sai-state/machines/implement-run.js`
- `sai/commands/archive/worker.md`
- `sai/commands/backfill/worker.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/explore/direct-build-worker.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/implement/green-worker.md`
- `sai/commands/implement/red-worker.md`
- `sai/commands/implement/steps/green-step.md`
- `sai/commands/implement/steps/red-step.md`
- `sai/commands/implement/worker-common.md`
- `sai/install-manifest.json`
- `sai/policies/tool-resolution.md`
- `sai/tools/worker-report-validator.js`
- `test/claude-default-preset-alignment.test.js`
- `test/direct-build-goal-driven.test.js`
- `test/implement-family.test.js`
- `test/sai-state-progress-emit.test.js`
- `test/worker-report-validator.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Part of issue https://github.com/mmadariaga/shared-ai/issues/389, whose other slices are https://github.com/mmadariaga/shared-ai/issues/394, https://github.com/mmadariaga/shared-ai/issues/395, and https://github.com/mmadariaga/shared-ai/issues/396. In this slice, I4 and I5 apply to the RED, GREEN, and Direct Build workers and their coordinators only.

Future scope, outside this change: the merge step files also use `done | escalate | blocked` (sai/commands/merge/steps/strategy.md:18, test-correction.md:16, renumbering-plan.md:36), which the merge slice (https://github.com/mmadariaga/shared-ai/issues/396) should fold into the unified schema. The design overview's `success | failed` status (sai/commands/design/change-overview.md:67) is a `budget-*` helper result and stays outside the schema per E6.
