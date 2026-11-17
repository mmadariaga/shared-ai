> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

A 49-commit rebase stopped 13 times, 11 of them on the same fingerprint test, where a squash would have stopped once. Before this change `/sai-merge` learned about conflicts only after the launch, and Start asked the branch and the method in one picker call before anything ran, so the method question could not warn that a rebase would stop again and again on the same file.

## What Changes

- `sai/tools/merge.js` gains a `simulate --source-ref <full-ref> --method merge|rebase|squash [--harness <claude|opencode>]` action. It predicts the stops of the integration before the launch with `git merge-tree --write-tree`: one step per commit `git rebase` would replay (oldest first, merges and commits whose patch the source already holds left out), one step for a squash (none when there is nothing to squash), and one step for a merge. It writes objects only and changes no working tree, index, or ref.
- After a predicted stop, the next simulated step starts from the merged tree with the current tip's version (`ours`, the upstream side) of each conflicted file, built in a temporary index, which is how the whole-side shortcut resolves a stop. One conflict does not end the prediction: it runs to the end of the range, and later commits that change the same lines of that file are predicted to stop again.
- `simulate` writes its detail (`simulation.json`, every predicted stop with its position, commit, subject, and conflicted files) to a private `merge-simulation-` directory under the SAI temp root, because the run directory does not exist yet when Start runs it. Stdout carries the summary: `status`, `method`, the target, source, and merge-base shas, `replayed`, `predicted_stops`, `repeated_files` (files with 3 or more predicted stops, most stops first), `repeated_threshold`, and the `record` path and `record_hash`. A simulation that cannot run (git without `merge-tree --write-tree`, an unreadable ref, a commit it cannot replay, any git failure) is `not-applicable` with `data.status: unavailable` and a `reason`, and writes no file. `--record` does not apply.
- `sai/commands/merge/coordinator.md` Start now settles the open questions in order: the branch (asked alone when missing), then the simulation for the method of the arguments or `rebase` while it is missing, then the method question, which marks squash as recommended and names the file and its predicted stops when `repeated_files` is non-empty. An explicit method flag adds no question. An unavailable simulation only drops the recommendation and adds a note to the report. A run that ends before the run state opens removes the simulation directory with `temp-root.js remove`.
- The `merge-run@1` machine accepts a new `record` reference kind, `simulation`, and the coordinator records the simulation file once the run state opens. A completed run removes the simulation directory at close; a stopped, escalated, or unanswered run keeps it.
- The closing report shows the prediction (the method simulated, its predicted stops and repeated files) beside the stops that happened, or says that the prediction was unavailable.
- `sai/commands/merge/mechanics.md` documents the `simulate` call and a new `## Simulation` section; `docs/commands/sai-merge.md` and `AGENTS.md` describe the prediction and the new question order.
- Tests: new `test/merge-pre-launch-simulation.test.js`; `test/merge-goal-driven.test.js` and `test/merge-run-machine.test.js` updated.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `sai-merge-command`: pre-launch stop simulation, the start question order (branch, simulation, method), the squash recommendation in the method question, the simulation file in the run state, and the prediction in the closing report.
- `merge-run-state`: the `merge-run@1` machine accepts `simulation` as a `record` reference and lists it as `simulations`.

## Impact

- New files: `test/merge-pre-launch-simulation.test.js`.
- Modified files: `sai/tools/merge.js`, `sai-state/machines/merge-run.js`, `sai/commands/merge/coordinator.md`, `sai/commands/merge/mechanics.md`, `docs/commands/sai-merge.md`, `AGENTS.md`, `test/merge-goal-driven.test.js`, `test/merge-run-machine.test.js`.
- Applies equally to Claude Code and opencode. Nothing is pushed and the command's list of authorized local operations is unchanged.
- Known limitations: the prediction is advisory, because hooks, autostash, and rerere can change what git does, and the real stops govern. The recommendation counts every predicted stop on the same file, including stops the whole-side shortcut may later resolve, because the simulation does not evaluate containment. When the branch is missing, the start asks two consecutive questions instead of one. After a predicted stop the simulation continues from the current tip's (`ours`) version of each conflicted file, not from the replayed commit's version, so repeated stops on one file are predicted.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

This slice and merge-single-step-worker both add to the action table of `sai/tools/merge.js`; build them one after the other rather than in parallel.
