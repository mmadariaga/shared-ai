> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

In a real Direct Build run a rejected archive stalled the route for over an hour through the only permitted correction path, and a fresh agent given a 30-line hand-off fixed it in 33 seconds. The open resilience rule of `sai/policies/unattended-runtime-recovery.md` was fenced by limits that forbade that outcome: a single correction per scope, a correction path written per failure class, and an execute order that could never be sent again, even when it had changed nothing.

## What Changes

- `sai/policies/unattended-runtime-recovery.md` is reshaped around its own resilience rule. A correction is steered by a goal (the failed step's check) and six invariants (agreed content, authorization, slice paths, available information, planned process, attempts).
- Recovery path: the coordinator continues the current subagent by default and hands off to the budget agent when one of four criteria holds, or when no subagent is left to continue.
- Hand-off: one fixed four-part prompt (state, failure evidence, goal, invariants) with no procedure, dispatched through the budget task binding of the active harness (`budget-subagent` on Claude Code, `budget` on opencode) with the two-phase startup.
- Attempts: three per failed step, shared by both recovery paths and counted on the counters the route already keeps. Direct Build keys `diagnosis_rounds.direct_build` by `direct-build`, `backfill`, and `archive`.
- Execute orders: the coordinator takes an `order_snapshot` before every execute order. A failed order is issued again only after the no-effect check verifies that it changed nothing; a completed, partial, or unknown state stops the route with the exact state.
- After an attempt: a foreign-change check on the slice paths, then the failed step runs again through its original owner, then the fresh result is validated. A correction's report is never the result.
- `sai/policies/budget-agent.md`: the "No self-correction" rule is replaced by a completion criterion. The task is done when its result is achieved or the call cap is reached, and the report states what was tried. Both `budget-subagent` skills summarize the new criterion. This changes every budget agent dispatch, not only recovery.
- `sai/policies/slice-path-scope.md` and `sai/tools/slice-path-scope.js`: `snapshot --targets` watches listed target paths from the file system whatever their git-ignore status; the policy gains the foreign-change check and the no-effect check.
- `sai/policies/no-commit-guard.md`: a recovery hand-off to the budget agent opens its own guard window and never carries `allow_commit`.
- The backfill and archive worker and coordinator cards and `pipeline-direct-build.md` drop their local one-shot and single-correction rules and reference the recovery policy.
- Known limitations: the budget agent keeps unrestricted write and shell access, so a push or a destructive action is prevented only by the hand-off's invariants; the evidence that a goal-and-invariants hand-off is enough is one session with an easy failure.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `unattended-resilience-rule`: invariants replace the six limits; recovery path, hand-off, three attempts, execute-order re-issue, and the step check through its owner.
- `bounded-worker-recovery`: runtime repair counts three attempts per failed step and no longer bans a new execute order after a verified no-effect failure.
- `budget-subagent-behavior`: completion criterion replaces no self-correction; report and call-cap semantics follow it.
- `canonical-opencode-agent-behavior`: the canonical budget contract carries the completion criterion.
- `auto-fast-backfill-execution`: a failed order ends at the worker; a new order is accepted only after a failure before the first write.
- `auto-fast-archive-execution`: a failed CLI archive returns the verbatim error and ends the order; recovery belongs to the coordinator.
- `explore-pipeline-supervision`: Direct Build run state, failure handling, guard windows, and order boundaries follow the recovery policy.
- `routed-archive-command`: the Direct Build execute failure follows the recovery policy instead of a local backfill-artifact route.
- `no-commit-guard`: recovery hand-off isolation.
- `slice-path-scope`: target watching, the foreign-change check, and the no-effect check.

## Impact

Modified files:

- `sai/policies/unattended-runtime-recovery.md`
- `sai/policies/budget-agent.md`
- `sai/policies/no-commit-guard.md`
- `sai/policies/slice-path-scope.md`
- `sai/tools/slice-path-scope.js`
- `sai/commands/archive/coordinator.md`
- `sai/commands/archive/worker.md`
- `sai/commands/backfill/coordinator.md`
- `sai/commands/backfill/worker.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `skills/claude/budget-subagent/SKILL.md`
- `skills/opencode/budget-subagent/SKILL.md`
- `test/canonical-opencode-agent-behavior.test.js`
- `test/slice-path-scope-tool.test.js`
- `test/unattended-runtime-recovery.test.js`

New files: none.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Source: a retrospective of one opencode session running Direct Build - Unattended on another project, plus an adversarial review of this plan against the repository.

Observed but excluded from this change, for possible follow-up:
- A suite-gate stop is parked at the `build-implement` stage, so resuming repeats implementation. A stage of its own needs the base commit and the changed-files union to survive a stop; today they live only in the conversation.
- The suite gate runs the base in a clean worktree and the change in the working tree, so it proves the base is healthy, not that the change is.
- `sai/tools/check-delta-headers.js` compares requirement headers only and never reads scenarios, so a MODIFIED block that drops a scenario passes it.
- `pipeline-direct-build.md` is one 32,000-character file that the slice machine names for all three stages; splitting it per stage is better done on the text this change leaves.
- Subagent calls on opencode block with no time limit, and provider token-refresh failures killed long-running subagents about once an hour.

Not verified: the full dispatch text of the three current budget agent consumers, and whether the opencode `budget` profile matches the Claude Code one.

The budget agent's model is user-owned per agent file. The agreed assumption is that no project runs it on a model weaker than the one that solved the observed failure.
