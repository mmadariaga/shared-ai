> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

On opencode, a worker's report reference sometimes never reached its coordinator: the reference was replaced by a wake `ok` or by an intermediate message such as "Ending this turn", or the completion notification was lost. The report was already saved in the report directory, but the coordinator kept waiting for a result that was on disk until the user asked for the status. Session ses_e35dbe4beffe5WOzItuwgWcQKg lost between 8 minutes and 1 h 35 min this way, and a reported `/sai-build` run stalled for 22–23 minutes. The coordinator was not idle by mistake: it was blind, because the worker's result notification was lost or replaced.

## What Changes

- `sai/tools/transfer.js` gains two verbs. `accept --dir <report-dir> --path <path> --sha256 <hash> [--check]` verifies a reference and records it in the reserved ledger `.sai-accepted` inside the report directory; with `--check` it only answers whether the reference is already recorded. `watch --dir <report-dir> [--settle <duration>] [--max <duration>] [--poll <duration>]` polls the directory in its own Node process (defaults: settle 60s, max 30m, poll 5s) and exits with the `{path, sha256}` references of the settled reports that are not in the ledger, in creation order, or with an empty list at its maximum. Draft files (`*.draft.*`), the transfer marker, and the ledger are never reported; a directory that disappears ends the watch with an empty list. `put` and `verify` also refuse the ledger name as a reserved name.
- `sai/policies/worker-report-transport.md` gains the section `## Undelivered reports`, the single source of the reception rules: record each processed reference with `accept`, treat a reference already in the ledger like an `ok`, launch `watch` in the background whenever the coordinator waits for a worker result (whatever the warming setting), process found reports in creation order through the same validation and invalid-report recovery, relaunch an empty watch silently, stop the watch when the result arrives and before the worker is disposed, keep waiting on a message that is neither a reference nor `ok`, watch each report directory separately for parallel workers, and print one notice and continue when the watch cannot be launched. The coordinator's own cache-warming wake keeps performing no work.
- `sai/policies/cache-warming.md` changes the worker's wake reply: a worker whose last real message was a result and that has received no real message since replies to a `continue` wake with that message verbatim instead of `ok`; it replies `ok` again once the dispatcher sends it a real message, on a `finished` wake, and after a `dispose`. A repeat restarts no window, and the policy's definition of a real message excludes it, like the `ok` of a wake and of a `dispose`.
- The coordinators that receive reports through the transport policy point to the new section without restating it: implement, review, audit, deep-review (one watch per audit cycle directory, reports attributed to that cycle's worker), the plan cycle, commit, archive and backfill (ordinary route), merge, and Direct Build.
- The shared `coordinator` capability profile in `sai/install-manifest.json` allows `node {sai}/tools/transfer.js accept *` and `node {sai}/tools/transfer.js watch *`, so every coordinator profile that extends it can run both verbs on Claude Code and opencode.
- `AGENTS.md` and `docs/project-settings.md` describe the recovery of undelivered reports and the repeated wake reply.
- Tests: tool tests for `accept` and `watch` in `test/transfer-tool.test.js`, the new wake-reply assertions in `test/cache-warmer.test.js`, and `test/undelivered-report-recovery.test.js` for the policy section and the pointer of every coordinator.

## Capabilities

### New Capabilities

- `undelivered-report-recovery`: coordinators that receive worker reports through the report transport detect, validate, and process reports whose reference was not delivered, ignore references they already accepted, and keep a background watch over the report directory while they wait, independent of cache warming.

### Modified Capabilities

- `transfer-file-transport`: `transfer.js` gains the `accept` and `watch` verbs, and `put` and `verify` treat the `.sai-accepted` ledger as a reserved name.
- `agent-self-warming`: a worker's `continue` wake repeats its last unconfirmed result instead of `ok`; the wake still performs no work.
- `subagent-warming-declaration`: the definition of a real message also excludes a wake's repeat of the last result, beside the `ok` of a wake and the `ok` of a `dispose`.

## Impact

- Modified files: `AGENTS.md`, `docs/project-settings.md`, `sai/commands/archive/coordinator.md`, `sai/commands/audit/coordinator.md`, `sai/commands/backfill/coordinator.md`, `sai/commands/commit/coordinator.md`, `sai/commands/deep-review/coordinator.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/merge/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/review/coordinator.md`, `sai/install-manifest.json`, `sai/policies/cache-warming.md`, `sai/policies/worker-report-transport.md`, `sai/tools/transfer.js`, `test/cache-warmer.test.js`, `test/transfer-tool.test.js`.
- New files: `test/undelivered-report-recovery.test.js`.
- Known limitations: the watch is a second kind of background wait beside cache warming, with its own rules; a normal report whose reference takes longer than the settle delay to arrive costs one extra coordinator turn, which the duplicate rule absorbs.
- Not covered: the `budget-*` helpers (they reply in text) and the `--no-specs` POC (it keeps its own transport); enforcing one cache-warming wait per agent and forbidding workers from ending their turn while their own subagents run stay out of this change.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
