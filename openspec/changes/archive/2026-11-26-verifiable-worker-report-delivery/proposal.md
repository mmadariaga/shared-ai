> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

While a coordinator waits for a worker's report, the user cannot tell whether the worker is still working or its report was lost, and the safety net that recovers a lost report does not run reliably. In an opencode `/sai-explore` → Plan - Unattended run (issue #557), the coordinator ran `transfer.js accept --check` plus the validator for every spec and design report but never the recording `accept`, so the `.sai-accepted` ledger stayed empty; it launched no `transfer.js watch` during any worker wait; and the user, seeing no signal for 13 minutes and two workers sharing the `sai-2-` prefix, concluded that a report was lost while the plan RED worker was still working. The coordinator also sent a status request to an opencode worker whose turn was still running.

The receipt was three separate calls stated in different sections of `sai/policies/worker-report-transport.md`, every coordinator card delegated the watch and the record through one pointer sentence, `transfer.js watch` exposed no activity signal before it ended, and `opencode-dispatch.js continue` ran a turn with no in-flight check. The steps the model forgot are now tool calls or tool output instead of more prose.

## What Changes

- `sai/tools/transfer.js` gains `receive --dir <dir> --path <path> --sha256 <hex> --kind terminal|progress [--command <name>] [--paths-file <paths>] [--cwd <root>]`: one call that looks the reference up in the `.sai-accepted` ledger, validates a terminal report with `worker-report-validator.js` from bytes read once, and records the reference before the caller acts on it. It answers `already: true` with outcome `duplicate` for a reference already in the ledger, records a progress report after verifying it without validating it, records an invalid report and a report whose claimed hash differs from its bytes (under both hashes) so the watch never offers them again, records nothing for a reference that names no file inside the directory, and prints `outcome` (`duplicate`, `accepted`, `recorded`, `report-invalid`, `delivery-failed`), `validation` with the parsed `payload` of an accepted report, and `watch`, the exact `watch` command of that directory. It exits 1 when the report is not usable.
- `sai/tools/transfer.js` gains `status --dir <dir> --input-file <paths> [--cwd <root>] [--since <time>] [--handle <id>] [--role <name>]`: a one-shot query that reports the newest activity of the report directory and the writable paths (the measure `watch` uses, now also naming the path), the reports the ledger does not list, the worker's state (`live`, `retired`, or `gone`), and a printable activity `line` that names the worker role.
- `sai/tools/opencode-dispatch.js continue` holds a per-session turn lock (`<Claude Code SAI temp root>/opencode-turns/<sessionID>.lock`, holding the tool's PID) while its turn runs, released when the turn ends or the process exits. A `continue` whose lock belongs to a live process prints `status: busy` with `busy_pid`, sends nothing, and exits 3. A lock whose process is gone is replaced by exactly one contender, through an exclusive replacement claim that removes the lock only while it still holds the stale PID (the stale-lock replacement race found in the functional review is fixed). `start` takes no lock, and a temp root that cannot be resolved leaves the turn unguarded.
- `sai/policies/worker-report-transport.md` replaces the paired check and the separate recording `accept` with `receive` in § Receiver boundary, § Progress reports, § Record, § Duplicate, and § Found, and adds § Relaunch (relaunch the `watch` command from the `receive` answer while still waiting; launch nothing at the worker's last use), § Waiting messages (every wait message names the worker role), and § Status (the activity line on request and on each coordinator cache-warm wake during a worker wait; never ask the worker for its status). Budget agents keep `transfer.js accept`.
- `sai/policies/cache-warming.md` lets a coordinator wake during a worker wait print the activity lines of `status` in place of the `➡️ Warming context cache up.` literal.
- `sai/policies/opencode-dispatch.md` § Continue documents the `busy` refusal: wait for the completion notification of the earlier turn, resend the same message once, and treat a second `busy` as a failed turn.
- The ten coordinator pointers (`archive`, `audit`, `backfill`, `commit`, `deep-review`, `explore/direct-build-coordinator.md`, `implement`, `merge`, `plan/cycle.md`, `review`) name `receive`; the deep-review pointer was corrected to name it during the functional review.
- `sai/policies/tool-resolution.md` notes that `transfer.js receive` loads the validator module itself, relative to the resolved `transfer.js`, and exits 2 naming the tried paths when it is missing.
- `sai/install-manifest.json` grants the `coordinator` profile `node {sai}/tools/transfer.js receive *` and `node {sai}/tools/transfer.js status *`.
- `AGENTS.md` describes `receive`, `status`, and the turn lock.
- Tests: new `test/transfer-receive-status.test.js`; updated `test/opencode-dispatch.test.js`, `test/undelivered-report-recovery.test.js`, `test/worker-report-transport.test.js`, `test/budget-report-delivery.test.js`, `test/explore-pipeline-selector.test.js`, and `test/tool-usage.test.js`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `undelivered-report-recovery`: coordinators receive every worker report with one `transfer.js receive` call, relaunch the watch from its answer, name the worker role in wait messages, and print the activity line of `transfer.js status`; the paired check requirement is removed.
- `transfer-file-transport`: `transfer.js` gains the `receive` and `status` subcommands.
- `opencode-agent-dispatch`: `opencode-dispatch.js continue` holds a per-session turn lock and refuses a busy session with exit 3.
- `agent-self-warming`: a coordinator wake during a worker wait prints the activity lines instead of the main-session literal.
- `plan-segment-cycle`: the plan segment cycle receives each worker report with `transfer.js receive` instead of a separate validator call.
- `implement-new-workers`: the implement coordinator receives RED and GREEN reports with `transfer.js receive`.
- `merge-resolution-transport`: the merge coordinator receives each worker report with `transfer.js receive`.
- `routed-commit-command`: the commit coordinator receives each worker report with `transfer.js receive`.
- `routed-archive-command`: the archive coordinator receives each worker report with `transfer.js receive`.
- `routed-backfill-command`: the backfill coordinator receives each worker report with `transfer.js receive`.
- `direct-build-report-transport`: the receiver passes each reference to `transfer.js receive`, which validates and records it in one call.
- `claude-continuation-timing`: `sai/policies/opencode-dispatch.md` leaves the stay-unchanged list; agents routed through `opencode-dispatch.js` still continue only after their turn has ended, now enforced by the per-session turn lock.

## Impact

- New files: `test/transfer-receive-status.test.js`.
- Modified files: `sai/tools/transfer.js`, `sai/tools/opencode-dispatch.js`, `sai/policies/worker-report-transport.md`, `sai/policies/cache-warming.md`, `sai/policies/opencode-dispatch.md`, `sai/policies/tool-resolution.md`, `sai/install-manifest.json`, `AGENTS.md`, `sai/commands/archive/coordinator.md`, `sai/commands/audit/coordinator.md`, `sai/commands/backfill/coordinator.md`, `sai/commands/commit/coordinator.md`, `sai/commands/deep-review/coordinator.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/merge/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/review/coordinator.md`, `test/budget-report-delivery.test.js`, `test/explore-pipeline-selector.test.js`, `test/opencode-dispatch.test.js`, `test/tool-usage.test.js`, `test/undelivered-report-recovery.test.js`, `test/worker-report-transport.test.js`.
- Claude Code and opencode follow the same cards and policies; the turn lock guards only the Claude Code dispatch of an opencode-routed agent.
- Known limitations: a context compaction between `receive` and the coordinator's handling of the report leaves the report recorded but unprocessed, and the coordinator resumes from its run state and the artifacts on disk; each coordinator cache-warm wake during a worker wait costs one extra `status` call; when opencode is the main harness, a continuation sent to a running turn stays possible and is handled by the existing rejected-continuation recovery. Progress reports from the plan RED worker and a turn-state check for native opencode `subagent` continuations are out of scope.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
