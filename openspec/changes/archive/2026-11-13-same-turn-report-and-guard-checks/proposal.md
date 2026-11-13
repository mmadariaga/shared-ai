> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

In a measured opencode Direct Build run, each coordinator turn re-read about 189k cached tokens (44.2M `cache_read` over 234 requests), so dependent tool calls that force a new model turn are the cost driver. Two receiver procedures forced such turns without need:

- The worker-report duplicate check (`transfer.js accept --check`) and the report validation (`worker-report-validator.js validate`) ran as two dependent turns per terminal report (5 reports, 5 extra turns).
- Every no-commit-guard `verify` was followed by a `snapshot` that returned the same HEAD (3 pairs; one cost its own turn, so about 1 turn and 3 calls).

Validation is read-only, so it can run speculatively beside the duplicate check, and a clean `verify` already returns the current HEAD, so it can open the next guard window when nothing since could have moved HEAD.

## What Changes

- `sai/policies/worker-report-transport.md` § Receiver boundary: every terminal report now runs a **paired check**, the `transfer.js accept --check` duplicate check and the `worker-report-validator.js validate` call issued as two independent calls in one same-turn batch. The coordinator reads no report field before it has both answers. When `--check` answers `already: true`, the validate result is discarded, no attempt is spent, and no continuation is sent; any other answer hands the validate result to the existing receiver rules, invalid-report recovery included. A call of the batch that comes back cancelled or without a result is re-issued alone in the next turn, is not an obstacle attempt, and a validate result is never acted on without the `--check` answer of the same reference. Progress reports keep `accept --check` and `sai-state emit … --progress` in sequence, because the emit advances the step machine.
- The same policy's § Undelivered reports: the **Duplicate** and **Found** rules now point to the paired check for terminal reports and keep the sequential check-then-emit order for progress reports, so § Receiver boundary and § Duplicate state one procedure.
- `sai/policies/no-commit-guard.md`: § The single rule allows a window to open from the head of a reusable clean verify, and § Window pairing gains **Reuse of a clean verify**. A window may open without a `snapshot`, with `guard_base` set to the `head` of the `clean` verify that closed the previous window, only when every operation since left HEAD in place: staging (`git add`, `git rm --cached`) and working-tree moves such as the `openspec archive` move. Any other coordinator git mutation (a commit, checkout, merge launch, reset, or rebase), a human turn, and a verify with verdict `violation`, `allowed`, or `n/a` require a fresh `snapshot`. The `allow_commit` and recovery-worker isolation rules keep their own fresh `snapshot`.
- `sai/commands/explore/direct-build-coordinator.md`: the backfill window (2) and the archive window (3) now open per § Window pairing instead of at a pinned fresh snapshot, so the card restates no snapshot condition of the policy. This fixes review finding M1 (Medium), where the card's pinned fresh snapshot overrode the new reuse rule.
- `AGENTS.md` § No-commit guard: states that a window may open from the `head` of a preceding clean verify instead of a snapshot, pointing to the policy's § Window pairing for the conditions.
- Tests: `test/worker-report-transport.test.js` asserts the paired check and the sequential progress-report order; `test/no-commit-guard-tool.test.js` asserts the HEAD-preserving reuse list of § Window pairing, the AGENTS.md sentence, and that the Direct Build card opens its backfill and archive windows per § Window pairing.

No tool changes: `sai/tools/no-commit-guard.js`, `sai/tools/worker-report-validator.js`, and `sai/tools/transfer.js` are unchanged, and `guard_base` stays conversation state only. The rules apply equally to Claude Code and opencode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `undelivered-report-recovery`: the duplicate check of a terminal report runs together with its validation as a paired same-turn check; progress reports keep the sequential check-then-emit order; a cancelled call of the pair is re-issued alone.
- `no-commit-guard`: a guard window may open from the `head` of a preceding clean verify when only HEAD-preserving operations happened since; a human turn, any other coordinator git mutation, or a non-clean verdict still requires a fresh snapshot.

## Impact

- Modified files:
  - `sai/policies/worker-report-transport.md`
  - `sai/policies/no-commit-guard.md`
  - `sai/commands/explore/direct-build-coordinator.md`
  - `AGENTS.md`
  - `test/worker-report-transport.test.js`
  - `test/no-commit-guard-tool.test.js`
- New files: none.
- Known limitations: the validate call still runs for a duplicate terminal report and its result is discarded; the cancelled-call re-issue rule is stated in this policy, beside the procedure it protects. Cache warming is out of scope.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The `fetch.js --content` improvement from the same retrospective is handled outside this set: its existing draft (stash `fetch --content`, with ADR 0220) is restored, backfilled with `/sai-backfill`, and reviewed with `/sai-4-review`.
