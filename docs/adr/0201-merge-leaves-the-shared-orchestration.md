# ADR 0201: `/sai-merge` leaves the shared orchestration, and the presentation seam of ADR 0175a retires

<!-- adr-index: supersedes 0175a; refs 0173c; refs 0194; refs 0199; refs 0200 -->

## Status

Accepted

Supersedes [ADR 0175a](./0175a-merge-renders-through-a-coordinator-owned-presentation-seam.md).

## Context

ADR 0194, ADR 0199, and ADR 0200 moved the implement, review, build, plan, spec, design, audit, and deep-review commands outside the shared orchestration, because a trimmed copy of the Result Loop keeps the enumerations and stop literals that stall unattended runs. `/sai-merge` was the last mutating command of the build side still in the old style: eight cards in `sai/commands/merge/` (2,109 lines), five kinds of user question (dirty tree, method, branch, working language, and a strategy gate on every conflict stop), a lifecycle table and a presentation seam only that command used, and a finalization that went ahead after three verification rounds even when tests still failed.

Everything the command does is local and reversible: it pushes nothing and each commit can be undone with the recorded pre-launch `HEAD`. The questions guarded decisions that are inputs, not judgments.

## Decision

1. **`/sai-merge` is rewritten as a goal-driven, always-unattended coordinator in the shape of `/sai-3-implement`.** The single card `sai/commands/merge/coordinator.md` states the goal, the start, the cycle per conflict stop, the obstacles, the run state, resuming, and the close. It loads only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, and `incremental-review`, and no budget binding, because it runs `merge.js` and git itself. It loads none of `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, or `no-commit-guard`. The wrappers load the harness fetch skill and the coordinator directly. `--fast-track` is accepted and ignored.
2. **The branch and the method are arguments, and the report uses the chat language.** `/sai-merge [<branch>] [--rebase|--squash]`; `--squash` wins when both are given. The branch is asked only when it is missing. The method, language, dirty-tree, and strategy questions retire. With unstaged changes the run goes on when git allows it, as a manual `git merge` does; staged content unrelated to the merge stops the run.
3. **The strategy gate gives way to review and a baseline.** The worker decides by commit intent. The coordinator reviews each stop's resolution for up to three rounds, and the suite runs once on the final tree against a baseline taken at `HEAD` before the launch. Only a new failure blocks: a test that passes in the baseline and fails on two consecutive runs after the resolution. Flaky and pre-existing failures are reported. The run escalates through the picker only when commit intent cannot decide, or when an obstacle outlives its budget of 3 attempts.
4. **`merge.js` stays the deterministic engine and loses its stage entry points.** `enter --stage` and `instructions --stage` retire, because instructions travel by pointer (`sai/commands/merge/steps/`) and the hand-over travels by file. `verify` gains the baseline mode and the comparison against it, and `provenance` records the upstream facts that the closing report needs for the force-push notice. ADR/DDR renumbering stays worker-planned and coordinator-applied instead of becoming a `merge.js` operation.
5. **One standalone worker serves the run.** `sai-merge-worker` keeps its name and matrix key, renders its binding from the standalone template, writes its report to the run directory, and returns the path. A replacement receives a hand-over file written by the coordinator, in place of the 22 `replacement_reconstruction_fields`.
6. **The run state is `merge-run@1`** on the shared run core, with the session key `merge-{branch}` and a run directory from `temp-root.js mkdtemp --prefix merge-`.
7. **The presentation seam retires.** `presentation.md`, `lifecycle.md`, `coordinator-stages.md`, `instructions.md`, `command-bootstrap.md`, and the adaptive merge TODO of `todo-structure.md` are removed, each with a retirement entry in the install manifest. The pinned texts become a closing report defined by goals. `no-commit-guard`, `worker-core`, the routed worker binding, and `transfer.js` stay for the commands that still use them.

## Alternatives Considered

- **A `merge.js renumber` operation that applies the worker's plan.** It widens the write surface of the tool for no behavioral gain: the debt was in the prose.
- **Running the full suite at every rebase stop against the initial baseline.** It costs more and flags failures on intermediate commits that a later commit of the same rebase fixes.
- **An interactive strategy-approval mode beside the unattended one.** Two modes in one command, and the gate is the interaction the rewrite removes.

## Consequences

- A new failure found on the final tree of a rebase is corrected in one additional local commit, not inside the commit that introduced it.
- Confirming a new failure reruns the whole suite once, because the tool cannot filter individual tests across every ecosystem.
- The run rewrites history without asking, so the closing report names the pre-launch `HEAD` and the command that restores it, and warns when the next push needs a force push.
- ADR 0173c stays in force: collision suffixes are still ordered by ascending commit date. ADR 0175a keeps its history; the seam it describes no longer exists.
