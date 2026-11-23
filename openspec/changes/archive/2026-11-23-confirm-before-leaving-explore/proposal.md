> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

An exploration could be abandoned without the user deciding it: a user message, the agent's own suggestion, or a skill's output could take the session out of `/sai-explore`, and the current stage and agreed lists were left behind. `sai/commands/explore/body.md` § Deferred messages continued silently after a skill, and `explore-idea@1` had no pause or close intent, so nothing recorded that the user had chosen to leave, and a context compaction or the load receipt left in the chat could pull the session back into the explore contract.

## What Changes

- `sai/commands/explore/instructions.md` gains rule 4, **Leave confirmation**, beside the §3 direct-looking request rule. On every turn in which no route of the current slice is running (from invocation start through the wait for the route selector answer, and again whenever `explore-slice@1` is back in `waiting` with the route selector presented for a later or parked slice), the session leaves the explore flow only after the user picks `Stay`, `Pause`, or `Close` in a native leave selector (`AskUserQuestion` on Claude Code, `question` on opencode). The rule defines leaving (a dominant-intent user message, the agent's own proposal, or a skill whose close proposes or requires going elsewhere), excludes implementation requests, report-only skills, and explicit `/sai-*` invocations, replaces the `openspec-explore` "exit explore mode" reminder without editing that skill, and counts a cancelled, dismissed, or ambiguous answer as Stay.
- Pause emits `intent=pause`, keeps the stage, sections, agreed lists, blocks, and slice inventory, disposes the live explorers, stops an active hand-off wait, retires the cache-warming chain, and then handles the request that led out with the explore contract (read-only rule included) suspended.
- Close emits `intent=close-explore`, then resets `explore-slice@1` and `direct-build-run@1`, ends what the exploration holds as Pause does, clears its panel entries, and handles the request that led out.
- `sai/commands/explore/steps/common.md` gains **Resume (`resume-explore` recognition)**: a paused exploration resumes only on the `resume-explore` token or a clear request to go back, recognized like `next-step`; resume restores the full contract at the saved stage, re-presents the route selector when the pause happened with it pending, and answers in one line when no exploration is paused.
- `sai-state/machines/explore-idea.js` adds an `exploration` field (`active`, `paused`, `closed`), carried in every response as `run.exploration`, and the `pause`, `resume`, `close-explore`, and `status` intents. A paused exploration rejects every intent other than `resume` and `status` with `EXPLORATION_PAUSED`; a closed one rejects every intent other than `status` with `EXPLORATION_CLOSED`; `resume` on an active exploration answers `NOT_PAUSED`; close returns the stage and lists to their initial values and keeps the session file with the `closed` mark until `sai-state reset`. A state stored before the field existed reads as `active`.
- `sai/commands/explore/body.md` § Load receipt: the turn check reads the exploration's state first (from the latest `run.exploration`, or a `status` emit after a compaction), so a paused or closed exploration runs no recovery load and applies no explore contract; § Deferred messages points to rule 4 instead of always continuing at the current stage.
- `sai/policies/stage-machine.md` documents the pause, resume, close, and status intents; `docs/commands/sai-explore.md` describes the leave selector for users.
- `test/explore-leave-confirmation.test.js` covers the machine transitions, store persistence across spawn and reset, and the single-source placement of the leave rule.

## Capabilities

### New Capabilities

- `explore-leave-confirmation`: the Stay / Pause / Close leave selector, its window, the paused and closed explorations, and `resume-explore`.

### Modified Capabilities

- `explore-stage-machine`: `explore-idea@1` records the exploration's life (`active`, `paused`, `closed`) and accepts the `pause`, `resume`, `close-explore`, and `status` intents.
- `explore-load-receipt`: the turn check reads the exploration's state before the receipt, and deferred skill messages follow the leave rule.

## Impact

- New files: `test/explore-leave-confirmation.test.js`.
- Modified files: `sai-state/machines/explore-idea.js`, `sai/commands/explore/instructions.md`, `sai/commands/explore/body.md`, `sai/commands/explore/steps/common.md`, `sai/policies/stage-machine.md`, `docs/commands/sai-explore.md`.
- Running Plan and Direct Build routes keep their own park and abandon rules and show no leave selector; `openspec-explore` `SKILL.md` is unchanged.
- Claude Code and opencode follow the same rule and state.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
