> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The no-commit guard contract required a `snapshot` before every same-worker continuation and a `verify` after every returned worker result, including progress events and notices. In real runs, 2 of every 4 coordinator tool calls per progress event were guard calls that returned an identical HEAD. Small models executed them obsessively, and they added cost without any detection value. After a clean verify with no human turn and no coordinator git mutation in between, the next snapshot always returns the same HEAD, so the extra guard calls were redundant.

## What Changes

- `sai/policies/no-commit-guard.md`: a guard window is now the stretch between a `snapshot` and its `verify`. Windows are bounded by control hand-offs, not by worker dispatches. The policy pins a closed list of three boundaries: a human turn, a coordinator git mutation, and run close. Nothing else is a boundary. A progress event, a `notice`, a ready return, a non-asking and non-mutating nonterminal extension, a terminal result followed directly by the next dispatch, and a composition segment transition all continue the running window with no guard call. Snapshot runs at window opening: after handle capture, after a human turn's answer, and after a coordinator git mutation. Verify runs immediately before each boundary. Other changes in the policy:
  - Batch semantics become a consequence of the rule.
  - A replacement worker inherits the running `guard_base`.
  - A dispatch carrying `allow_commit` always opens its own isolated window, preceded by a normal verify.
  - `n/a` is announced once per window, and the next boundary retries the snapshot.
  - A violation is detected at the window's closing boundary.
  - The incident line's `<worker label>` names every worker dispatched in the window, joined with ` + `.
- `sai/commands/apply/coordinator.md`: one guard window per Step, spanning RED, GREEN, green-exception, recovery, and replacement workers. The window is verified before any user question, before the Step's commit gate (asked or pre-authorized), and before a run-closing result. A fresh snapshot follows a human turn. The commit gate closes the window, and the next Step opens a fresh one.
- `sai/commands/meta-review/coordinator.md` and `sai/commands/meta-review/direct-build-close.md` now defer to the policy's boundaries. A segment transition is not a boundary, so one window can span the review segment and the audit batch. The fix rounds share one window, which is closed before the close's staging.
- `sai/commands/explore/steps/pipeline-direct-build.md`: the three Direct Build windows are kept. The backfill window now spans its findings and execute continuations with no guard call between them. The archive window is closed by a normal verify before the Step 8 execute continuation, which opens its own isolated `--allow-commit` window. An escalated question inside any window is a boundary.
- The spec, design, implement, review, security, performance, accessibility, commit, backfill, merge, and archive coordinator cards now snapshot at each window opening and verify immediately before each boundary. They act on progress events and notices with no guard call. The archive card also states the `allow_commit` isolation of the execute continuation.
- `sai/orchestration/command-runner.md`: the handshake takes the guard snapshot on handle capture, and the deferred snapshot on a relaunch, only when no guard window is running.
- `AGENTS.md` (§ No-commit guard) and `README.md` (§ No-commit guard) restate the cadence as a snapshot at each window opening and a verify before each boundary.
- `test/no-commit-guard-tool.test.js` pins, as positive text in the policy, the window definition, the closed boundary list, the non-boundary list, replacement inheritance, `allow_commit` isolation, and the joined worker label.
- `sai/tools/no-commit-guard.js` is unchanged: same `snapshot`/`verify` sub-commands, flags, verdicts, and exit codes. Worker prose prohibitions and remediation semantics are unchanged. The change is shared prose only, so Claude Code and opencode inherit it identically, with no binding, wrapper, or agent-file edits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `no-commit-guard`: windows are bounded by a closed boundary list (human turn, coordinator git mutation, run close). Replacement workers inherit `guard_base`. `allow_commit` dispatches are isolated. Batches sit inside a window. Violations are detected at the closing boundary, and the incident line names every worker in the window.
- `apply-coordinator-ownership`: one guard window per Step, closed before the commit gate.
- `concurrent-audit-dispatch`: the audit batch continues a running review-segment window.
- `explore-pipeline-supervision`: the backfill window spans its continuations, and the archive execute continuation opens an isolated window.
- `routed-archive-command`: boundary cadence and execute-continuation isolation.
- `routed-commit-command`: boundary cadence.
- `routed-backfill-command`: boundary cadence.
- `sai-merge-command`: boundary cadence.
- `accessibility-phase-coordinator`, `design-coordinator`, `implementation-coordinator`, `review-phase-coordinator`, `security-phase-coordinator`: the clean-route guard exception follows boundary cadence.
- `worker-fast-handshake`: the deferred snapshot and relaunch snapshot apply only when no guard window is running, and verify runs before each boundary.
- `two-phase-worker-handshake`: a relaunch after a missing ready takes a deferred snapshot only when no guard window is running.

## Impact

Modified files:
- `sai/policies/no-commit-guard.md`
- `sai/orchestration/command-runner.md`
- `sai/commands/apply/coordinator.md`
- `sai/commands/meta-review/coordinator.md`
- `sai/commands/meta-review/direct-build-close.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `sai/commands/spec/coordinator.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/security/coordinator.md`
- `sai/commands/performance/coordinator.md`
- `sai/commands/accessibility/coordinator.md`
- `sai/commands/commit/coordinator.md`
- `sai/commands/backfill/coordinator.md`
- `sai/commands/merge/coordinator.md`
- `sai/commands/archive/coordinator.md`
- `AGENTS.md`
- `README.md`
- `test/no-commit-guard-tool.test.js`

New files: none.

Limitations accepted: a violation is detected at the window's closing boundary instead of at the exact stretch where it happened, and the mixed reset to the window base still preserves all content unstaged. The evidence and the incident line may aggregate commits from several workers in one window. Non-goals: the validator and stage-machine emit cadence per progress event, worker prose prohibitions, and remediation semantics are unchanged.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
