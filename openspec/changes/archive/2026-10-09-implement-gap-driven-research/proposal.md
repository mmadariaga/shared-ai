> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `/sai-3-implement` planner had to read every document listed in `tasks.md` under `## Required Documentation` and treated that list as a closed boundary. A targeted lookup beyond it cost a typed request, a per-area approval by the coordinator, and a lookup history carried through worker replacement, even though `/sai-2-design` had already researched the project. That approval was already automatic under fast-track and in `/sai-build`, so it added hand-offs without controlling cost.

Research cost is now controlled by using design's prior work first and limiting new research to a concrete planning gap. The existing explorer ceiling and the length-capped output contract of every explorer dispatch already bound that research, so the numeric lookup quotas duplicated an existing control.

Known limitations accepted with this change:

- The research boundary depends on the planner's judgment, and each user chooses the worker's model, so a weak model may research more or less than intended.
- The user no longer sees a lookup before it runs, only its trace afterwards.
- A replacement worker carries no lookup history and may repeat research the first worker already did.
- Design's Required Documentation list stays exhaustive for now, so the planner judges relevance among context-only entries itself.

## What Changes

- `sai/commands/implement/steps/common.md` gains a `## Planning Evidence` section that replaces the closed-scope sentence. It defines the supplied material, defines a gap, sends every gap through one `budget-explorer` dispatch that names the Step and the gap, turns an unresolved gap into a `needs_input` question, routes a design contradiction to the existing defective-`sai-2` route, and requires one `Researched gap: Step N — <gap>` line per researched gap in the terminal `summary`.
- `sai/commands/implement/steps/documentation-review.md` reads the documentation the Steps need instead of every listed entry, defers to the Planning Evidence rule, and no longer carries the re-run `budget-subagent` research exception. The step keeps its id.
- `sai/commands/implement/steps/plan-generation.md` loses the whole bounded batch permission section. Codebase Verification defers to the Planning Evidence rule, and Domain Language is renumbered from 3 to 2.
- `sai/commands/implement/coordinator.md` loses the `## Bounded lookup authorization` section, the `lookup_request_history` reconstruction field, and the lookup branch of the result loop. Every `needs_input` is presented through the ordinary picker route.
- `sai/orchestration/worker-core.md` loses the implement-only `lookup_request` grant paragraph.
- `sai/tools/worker-report-validator.js` loses `validateLookupRequest` and its call in `validateTerminal`.
- `sai/commands/implement/worker.md` and `sai/commands/meta-build/coordinator.md` no longer mention bounded lookup authorization in their fast-track text.
- Tests: the assertions that pinned the retired protocol are removed from `test/coordinator-owned-fast-track-gates.test.js` and `test/worker-report-validator.test.js`. New assertions pin the Planning Evidence rule and its references, and a validator test checks that an unresolved-gap question validates as an ordinary input.

## Capabilities

### New Capabilities

- `implement-planning-evidence`: the implementation planner starts from the supplied material, researches a concrete planning gap through `budget-explorer` on its own judgment, asks the user about an unresolved gap, and names each researched gap in its terminal summary.

### Modified Capabilities

- `implement-lookup-authorization`: every requirement removed; the coordinator approval protocol for bounded lookups is retired.
- `bounded-search-permission`: every requirement removed; the bounded batch permission and its numeric limits are retired.
- `rerun-research-exception`: its requirement removed; re-run research follows the single gap-driven rule.
- `sai-build-command`: the requirement on the coordinator deciding bounded lookup authorization is removed, and the injected fast-track requirement no longer names a lookup grant.
- `fast-track-state-delivery`: the worker-state requirement no longer refers to bounded lookup authorization.
- `tasks-required-documentation`: the reader-side scenario changes from a closed read of the list to a starting point for reading.
- `sai-learnings-consumption`: the rationale of the no-direct-read requirement no longer cites the closed documentation contract.

## Impact

Modified files:

- `sai/commands/implement/coordinator.md`
- `sai/commands/implement/steps/common.md`
- `sai/commands/implement/steps/documentation-review.md`
- `sai/commands/implement/steps/plan-generation.md`
- `sai/commands/implement/worker.md`
- `sai/commands/meta-build/coordinator.md`
- `sai/orchestration/worker-core.md`
- `sai/tools/worker-report-validator.js`
- `test/change-overview-contract.test.js`
- `test/coordinator-owned-fast-track-gates.test.js`
- `test/design-coordinator-worker.test.js`
- `test/worker-report-validator.test.js`

New files: none.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Originating issue: https://github.com/mmadariaga/shared-ai/issues/50 (open). It is a focused follow-up to https://github.com/mmadariaga/shared-ai/issues/30, the audit of SAI instructions for over-instruction. Issue https://github.com/mmadariaga/shared-ai/issues/49 is closed and its commit `1c1bcf2a` touched no implement-side file; its item about turning design's Required Documentation into a curated handoff was not delivered, and curating that list is future work outside this change that becomes safe once this change ships. No ADR or DDR governs the lookup protocol. Undecided: whether `/sai-build` shows the user the final summary of its implement segment, which affects how visible the I10 trace line is in that route. Undecided: the exact shape of the `needs_input` question for an unresolved gap (open input or a closed option set), which affects I9.
