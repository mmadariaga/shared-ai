> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

A measured `/sai-merge` rebase with one conflict stop and four conflicted files spent eight worker continuations. Five of them were stages where the worker only relayed the output of `sai/tools/merge.js`, and the coordinator made 40 shell calls where its contract implied 10 to 14. Each relayed stage cost a second model session and its context for work that needs no judgment.

## What Changes

- The merge coordinator runs the mechanical stages itself (`preflight`, `conflicts`, `verify`, `collision`, `final`) through `sai/tools/merge.js`. The worker's stages are `strategy` and `apply`, plus the conditional `test-correction` and `renumbering-plan`.
- The worker is dispatched at the first judgment point: a conflict, or a collision receipt that needs judgment. A run with neither dispatches no worker and opens no no-commit guard window. The same worker is continued at every later judgment point, and the language is asked once per run.
- The first dispatch and a mid-run replacement use the same hand-over: the `--reconstruct` form of the `Active stage:` pointer plus the complete reconstruction state the coordinator holds. Incomplete state stops the run before writing.
- New `merge.js enter --stage <stage>` composite call returns a coordinator stage's instructions, its fixed presentation texts, and its mechanical facts in one call. The coordinator no longer loads `presentation.md` at start; the new `sai/commands/merge/coordinator-stages.md` and `presentation.md` are served per stage and never fetched whole.
- The coordinator detects the first conflict from the conflict snapshot and asks the working language itself. The worker returns `conflict_detected` only with `continuation_state: strategy-analysis`.
- The coordinator runs the test suite. A failed first or second round continues the worker with `test-correction`, which returns correction ranges; the coordinator captures them and continues `apply`.
- The preflight guard texts, the Batch 1 items, the integration proposal, and the final summary template move from `instructions.md` to `presentation.md`, wording unchanged, and the coordinator authors them.
- `merge.js provenance` also verifies that the exact source ref exists before capturing. A new `status` action returns the closing repository facts. The conflict snapshot view carries category counts and the operation state.
- A failed launch with an empty conflict inventory closes the run as a launch failure; `lifecycle.md` lists it among the early closures and maps every state to its stage and owner.
- The worker no longer reports a `## Mechanical evidence` block; receipts are coordinator-collected and handed to the worker as exact reference and hash.
- `docs/merge-efficiency-measurements.md` compares the same scenario before and after the role split in model turns, tool calls, and tokens, and labels the after column as contract-derived and its token counts as unmeasured.
- Unchanged boundaries, restated by the new stage texts: strategy approval in normal mode, application after presentation under `--fast-track`, both three-round budgets, independent coordinator review before staging, coordinator ownership of every Git mutation, and a clean integration skipping verification. Claude Code and opencode use the same engine and stage texts.

Known limitations left behind:

- The rule that the merge coordinator performs no technical work is relaxed to read-only tool calls and light-judgment authoring (the Batch 1 questions and the final summary).
- The worker starts without having seen the early stages, so every dispatch depends on the coordinator handing over complete state.
- The after-run figures are derived from the contract; no after-run has been traced, so whether the run total falls is an open question.
- Test-command detection, the not-runnable verification result, the conflict-bundle command, and tool-owned writes are not part of this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sai-merge-command`: the coordinator runs the mechanical stages through one composite tool call per stage, receives its instructions per stage, dispatches the worker only at a judgment point, authors the preflight questions and the final summary, and runs the test suite; provenance capture validates ref existence; the efficiency documentation gains a before/after role-split comparison.
- `merge-worker-discipline`: the worker's stages become `strategy`, `apply`, `test-correction`, and `renumbering-plan`; its first task uses reconstruction delivery; it runs neither the suite nor branch validation.
- `merge-lifecycle-validation-seam`: every state belongs to one stage with a named owner; early closures no longer depend on a worker closing result and include a launch failure.
- `merge-presentation-seam`: the seam holds the coordinator's fixed texts per stage; the language question follows the coordinator's own conflict detection; receipts are coordinator-collected; the closing summary is coordinator-authored.
- `merge-batched-questions`: Batch 2 is the coordinator's language item, asked after the coordinator detects the first conflict, with no worker classification before it.
- `merge-collision-metadata`: the worker returns rename metadata in its renumbering plan, only after the coordinator's collision check needs judgment.
- `merge-branch-scope-presentation`: the coordinator builds the branch options from the preflight receipt, and an empty list leaves text entry available.
- `method-selection`: the coordinator presents the method question.
- `rebase-paths`: the coordinator presents the rebase finalization summary.

## Impact

New files:

- `sai/commands/merge/coordinator-stages.md`

Modified files:

- `sai/commands/merge/coordinator.md`
- `sai/commands/merge/instructions.md`
- `sai/commands/merge/lifecycle.md`
- `sai/commands/merge/mechanics.md`
- `sai/commands/merge/presentation.md`
- `sai/commands/merge/worker.md`
- `sai/orchestration/worker-core.md`
- `sai/policies/todo-structure.md`
- `sai/tools/merge.js`
- `AGENTS.md`
- `README.md`
- `docs/commands/sai-merge.md`
- `docs/merge-efficiency-measurements.md`
- `test/merge-contextual-conflict.test.js`
- `test/merge-efficiency-tool.test.js`
- `test/merge-incremental-collision.test.js`
- `test/portable-command-execution.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Source retrospective, one opencode run of `/sai-merge`: rebase onto `origin/main`, one conflict stop, four conflicted files (three OpenSpec documents, one C# file). Total 132 min 51 s: worker 110 min 43 s across eight continuations (startup 5 min, preflight 7, detection 2, strategy 66, apply 15, verification 7, collision 5, closure 4), main agent outside tools 10 min, main shell 7 min, user answers 5 min. Tokens: main session 246,779 input, 7,162,891 cache read, 48,341 output; worker 3,233,311 input, 1,731,712 cache read, 26,450 output. The provider was unusually slow that day, so the minutes are context and the turn, call, and token counts are the comparable figures.
