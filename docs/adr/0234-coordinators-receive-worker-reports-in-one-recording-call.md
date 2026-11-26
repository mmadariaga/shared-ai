# ADR 0234: Coordinators receive worker reports in one recording call

<!-- adr-index: amends 0219 -->

## Status

Accepted.

Amends [ADR 0219](./0219-coordinators-recover-undelivered-worker-reports-with-a-background-watch.md).

## Context

In an opencode `/sai-explore` Plan - Unattended run (issue https://github.com/mmadariaga/shared-ai/issues/557) the coordinator checked every spec and design report with `transfer.js accept --check` and the validator, and never ran the recording `accept`, so the `.sai-accepted` ledger stayed empty. It launched no `transfer.js watch` during any worker wait, and it sent a status request to an opencode worker whose turn was still running. The user saw no signal for 13 minutes, could not tell the design worker from the plan RED worker that shares its `sai-2-` prefix, and concluded that a report was lost when the worker was still working. ADR 0219 relies on a recorded ledger and an armed watch, but the receipt was three calls stated in different sections of `worker-report-transport.md`, each card delegated them through one pointer sentence, `watch` showed no activity before it ended, and `opencode-dispatch.js continue` ran a turn with no check that the previous turn had ended. The failure was a skipped call that the cards already required, not a missing rule.

## Decision

1. **One call receives a report.** `transfer.js receive --dir <report-dir> --path <path> --sha256 <sha256> --kind terminal --command <command>` (or `--kind progress`) looks the reference up in the ledger, validates a terminal report in process through `worker-report-validator.js` (reading the bytes once), and records the reference in the `.sai-accepted` ledger, then prints one JSON object with `already`, `recorded`, `outcome` (`duplicate`, `accepted`, `recorded`, `report-invalid`, or `delivery-failed`), the validator's `validation` with the parsed `payload`, and the `watch` command of that report directory. It exits 1 when the report is not usable. A reference already in the ledger answers `already: true` and validates and records nothing. A progress report is recorded without validation, and `sai-state emit --progress` validates it next. An invalid report, and a report whose claimed hash differs from its bytes, are recorded too (the bytes on disk and the claimed hash), so the watch never offers them again; a reference that names no file inside the directory records nothing, so a later correct delivery does not read as a duplicate. `accept` and `accept --check` stay for the budget agents, which have no validator.
2. **The ledger records on receipt.** The record is part of the receipt and happens before the coordinator acts on the report, so no second step remains to forget. `worker-report-transport.md` § Receiver boundary, § Record, § Duplicate, and § Found describe `receive` in place of the paired check and the separate recording `accept`, and the pointer sentence of the ten report-receiving coordinators (`commit`, `backfill`, `archive`, `audit`, `implement`, `review`, `merge`, `plan/cycle.md`, `deep-review`, and `explore/direct-build-coordinator.md`) names `receive`. A call that came back without a result is re-issued alone; when the re-issue answers `already: true` for a reference not yet processed, the coordinator validates it read-only and acts on that verdict.
3. **The watch launch stays a coordinator call that `receive` names.** A tool cannot start a harness background task whose completion wakes the coordinator, so the `watch` field of each `receive` answer is the exact command, with placeholders for the writable-paths file and the project root, and the coordinator launches it again while it still waits for a worker of that directory and not at the worker's last use.
4. **`transfer.js status` shows the activity of a worker.** `status --dir <report-dir> --input-file <paths-file> --cwd <project-root> [--role <role>] [--since <time>] [--handle <handle>]` runs one foreground pass over the measure `watch` uses (the report directory and the writable paths) and prints the time and path of the last activity (or `null`), the reports the ledger lacks, the worker's state (`live`, `retired`, or `gone`), and an activity line that names the worker's role. The coordinator prints that line when the user asks for the status of a wait and on each of its own cache-warm wakes during a worker wait, in place of the main-session literal `➡️ Warming context cache up.`; a wake with no worker being waited on keeps the literal, and with warming off the line appears only when the user asks. Every message about a wait names the role of the worker it waits on (`worker-report-transport.md` § Watch, stated once). A coordinator never asks a worker for its status.
5. **The turn lock is a PID lock in `opencode-dispatch.js`.** A `continue` creates the file `<SAI temp root>/opencode-turns/<sessionID>.lock` holding the PID of the tool process, removes it when the turn ends (a signal that stops the tool included), and is refused with `status: busy` (with `busy_pid`) and exit code 3, sending nothing to opencode, while the lock belongs to a live process. A lock whose process no longer exists is ignored. A stale lock is replaced under an exclusive claim file, and the lock is removed only while it still holds the stale PID the contender read, so two contenders over one stale lock never both acquire it. The coordinator waits for the completion notification of the earlier turn and resends the same message once (`opencode-dispatch.md` § Continue). The lock guards only the turns this tool runs, that is, the Claude Code dispatch of an opencode-routed agent.

## Alternatives Considered

- **Record after processing with a second `receive --done` call** — rejected because it keeps a separate step that can be forgotten, which is the observed failure.
- **A tool that launches the watch itself** — rejected because a tool cannot start a harness background task whose completion wakes the coordinator.
- **A `status --session` check before each native opencode `subagent` continuation, and a lock based on the opencode session API** — rejected because it would be one more call the model must remember, the status values of the session API are unverified, and the rejected-continuation recovery of `worker-lifecycle.md` already covers the native case.
- **Show the activity line only on request** — rejected because the user has to suspect a problem before asking, as in the observed run.
- **Progress reports from the plan RED worker** — rejected for this change because they cost turns on every run and the activity line covers most of their value.

## Consequences

- A context compaction between `receive` and the coordinator's handling of the report leaves the report recorded but unprocessed; the coordinator resumes from its run state and the artifacts on disk.
- Each coordinator cache-warm wake during a worker wait costs one extra tool call for `status`.
- When opencode is the main harness, a continuation sent to a running turn stays possible and is handled by the existing rejected-continuation recovery.
- A lock whose PID was reused by an unrelated live process reads as busy until that process ends.
- The coordinator profile grants `transfer.js receive` and `status` on Claude Code and opencode.

## Provenance

Change `verifiable-worker-report-delivery`, decision "Record a report in the ledger when it is received, not after it is processed".
