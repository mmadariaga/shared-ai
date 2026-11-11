# ADR 0219: Coordinators recover undelivered worker reports with a background watch

<!-- adr-index: refs 0214; refs 0218 -->

## Status

Accepted. Builds on ADR 0214 (the file transport of worker reports) and ADR 0218 (the warming protocol and its wake): it adds the recovery of a report that reached the report directory but whose reference never reached the coordinator. Neither record is edited, because existing records are never edited in place; the protocol is stated in `sai/policies/worker-report-transport.md` § Undelivered reports and `sai/policies/cache-warming.md` § Wake.

## Context

On opencode a worker's `{path, sha256}` reference was replaced by a wake `ok` or by an intermediate message such as "Ending this turn", so the coordinator waited for a result that was already on disk until the user asked for status. One session lost between 8 minutes and 1 hour 35 minutes this way, and the reported `/sai-build` run stalled 22 to 23 minutes at a time (issue https://github.com/mmadariaga/shared-ai/issues/410). The stall was not a coordinator ending its turn with nothing pending: the coordinator was blind because the worker's result notification was lost or replaced. The report itself was saved and valid. Recovery therefore had to find saved reports without the worker's help, whether or not cache warming was on, without the coordinator reading or hashing a report itself.

## Decision

1. **`transfer.js accept` records each processed reference in a ledger.** After the coordinator has processed a reference (validated and handled, or returned to its author as invalid), it runs `accept --dir <report-dir> --path <path> --sha256 <hash>`, which verifies the reference like `verify` and appends it to the reserved file `.sai-accepted` in the report directory. `accept --check` only looks the reference up and answers `already`. The ledger lives in the report directory that the run state already keeps, so acceptance survives a context compaction and a resumed run without a second store. `put` and `verify` treat the ledger name as reserved, like the marker file.
2. **`transfer.js watch` finds undelivered reports.** `watch --dir <report-dir> [--settle <duration>] [--max <duration>]` polls the directory inside its own Node process every few seconds and exits as soon as it finds a report that is not in the ledger and has been on disk for at least the settle delay, printing the references in creation order with the hash computed by the tool; at `--max` it exits with an empty list. The defaults are `--settle 60s` and `--max 30m`. A file whose name contains `.draft.`, the marker, and the ledger are never reports. The coordinator never reads a report to find it.
3. **A coordinator keeps one watch armed while it waits for a worker's result, with warming on or off.** It launches `watch` in the background (Claude Code `Bash` with `run_in_background: true`, opencode shell with `background: true`), stops it when the result arrives by any path (Claude Code `TaskStop`, opencode removal of the shell), and launches it again when it exits with an empty list, sending nothing to the worker and writing nothing to the user. Reports the watch finds are processed in creation order exactly as if the worker had delivered them, with the same validator and the same invalid-report recovery, which counts as an obstacle attempt. Each audit cycle of `/sai-deep-review` watches its own report directory. When the watch cannot be launched the coordinator prints one notice and goes on.
4. **A reference already in the ledger is treated like `ok`.** The coordinator checks every incoming reference, from a message or from the watch, before it validates it. A match costs no validation, no event, no attempt, and no continuation. A worker message that is neither a reference nor `ok` is not a result: the coordinator keeps waiting.
5. **A worker's wake repeats its last unconfirmed result instead of `ok`.** A worker with warming on, whose last real message was a result and that has received no real message since, answers each `continue` wake with that message verbatim, reference and `warming:` line. Once the coordinator sends it a real message, its wakes reply `ok` again; a `finished` wake and every wake after a `dispose` also reply `ok`. A repeat is not a real message: the definition in the Terms of `cache-warming.md` excludes the wake `ok`, the `dispose` `ok`, and a wake's repeat of the last result, so a repeat restarts no `max` window and a worker that keeps repeating still stops warming when the window ends. The coordinator's own wake keeps performing no work; only the watch looks for reports.
6. **Every coordinator that receives reports through the transport policy adopts the watch.** These are the implement (RED and GREEN), review, audit and deep-review, plan (spec and design), commit, archive, backfill, merge, and Direct Build coordinators; each card points to the policy section and does not restate it. The `budget-*` helpers, which reply in text, and the `--no-specs` POC keep their own transport. The coordinator capability profile allows `transfer.js accept` and `watch` on Claude Code and opencode.

## Alternatives Considered

- **The coordinator names the expected report file and asks the worker for its reference when the file exists** — rejected: it changes the naming contract of every coordinator, costs a worker round trip per recovery, and fails when the worker no longer answers.
- **Reuse the coordinator's cache-warming wakes for the check** — rejected: detection would stop when warming is off, and its latency would equal the warming interval. A wake also performs no work by rule.
- **Forbid a worker from ending its turn while its own subagents run** — excluded from this change by the user.

## Consequences

- A second kind of background wait exists beside cache warming, with its own rules, and the two stay separate.
- A lost report is recovered in about one minute, and the watch relaunches every 30 minutes at no model cost while nothing happens.
- A normal report that takes longer than the settle delay to deliver costs one extra coordinator turn, which the duplicate rule absorbs.
- A worker may repeat a reference the coordinator already holds on every wake until it receives a real message; the duplicate rule makes each repeat a cheap no-op.
- Claude Code and opencode behave the same: the tool, the ledger, and the wake rule are shared.

## Provenance

Change `recover-undelivered-worker-reports`, decision "Coordinators recover undelivered worker reports with a background watch".
