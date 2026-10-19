> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

After crystallization, `/sai-explore` needed up to six separate interactions before implementation could start (backlog, publication, branch, base, route, assignment), plus a continuation question for a multi-slice Direct Build. `sai/commands/explore/steps/route-selector.md` asked one question at a time. The change groups these questions into three conditional question rounds while each question keeps its own answer and authorization scope.

## What Changes

- `sai/commands/explore/steps/route-selector.md` replaces the one-question-at-a-time optional actions with three conditional rounds coordinated by Explore: round 1 (backlog, branch, conditional assignment), round 2 (publication approval, branch base), round 3 (route, conditional Direct Build continuation). After round 2, Explore executes in dependency order: publication, branch name resolution with the created issue identifier, branch creation; assignment waits for implementation start.
- The assignment question is asked in round 1 only when a linked issue already exists, after a read-only `inspect-assignment` / `propose-assignment` resolution of the concrete assignee and current assignees. With no linked issue, the question is left out and implementation start asks it.
- The Direct Build continuation question joins round 3 beside the route question for a multi-slice set; its answer takes effect only when the route answer is Direct Build, and is otherwise ignored and asked again in a later Direct Build round.
- New shared policy `sai/policies/question-rounds.md` defines a round, conditional questions, per-harness presentation (one `AskUserQuestion` call on Claude Code; one `question` call or consecutive calls in the same order on opencode), and answer rules. `sai/commands/meta-review/findings-selection.md` now references it instead of restating the presentation rule.
- `skills/universal/to-backlog/SKILL.md` gains a caller-agnostic "Prepare for a caller and act on a supplied answer" section; `skills/universal/to-backlog/slice-set.md` accepts a bound supplied answer and drops its Explore reference.
- `skills/universal/new-change-branch/SKILL.md` generalizes the supplied-base exception, adds a "Prepare for a caller" section, accepts a supplied type, name and identifier, and drops its `sai-explore` reference.
- `sai/policies/backlog-implementation-start.md` accepts an advance assignment approval and, at implementation start, runs only the checks, asking again only on conflict, lapse or changed context.
- `README.md` and `docs/commands/sai-explore.md` describe the three rounds.
- Tests: `test/explore-question-rounds.test.js` (new) covers round order, answer combinations, conditional questions, partial cancellation, stale context, recovery, round 3 continuation, harness parity, caller-agnostic skills and advance assignment approval; `test/explore-pipeline-selector.test.js` and `test/review-coordinator-worker.test.js` update their pins.

## Capabilities

### New Capabilities

- `explore-route-close`: Explore coordinates three conditional question rounds after the Ready to Propose block and executes their actions in dependency order.
- `backlog-publication`: `to-backlog` prepares a publication proposal without publishing and acts on a supplied answer bound to that exact proposal, staying caller-agnostic.
- `change-branch-creation`: `new-change-branch` prepares suggested bases for a caller and accepts a supplied base and resolved name, staying caller-agnostic.
- `backlog-implementation-assignment`: implementation start verifies an assignment approval collected in advance and asks again only on conflict.

### Modified Capabilities

- `explore-pre-route-actions`: optional actions are asked in rounds 1 and 2 instead of one question at a time; accepted actions are prepared and executed through supplied answers; the route picker waits for the backlog, branch and assignment answers.
- `explore-route-choice`: the native picker is presented as round 3 after rounds 1 and 2, not necessarily in the inventory-recording turn.
- `explore-pipeline-selector`: the Direct Build continuation question is asked in round 3 and takes effect only for a Direct Build route answer.
- `new-change-branch`: the base-question exception becomes a generic supplied base bound to a collected answer or an advance authorization, with no named caller.
- `backlog-slice-lifecycle`: assignment authorization may come from a valid advance approval verified at implementation start.

## Impact

- New files: `sai/policies/question-rounds.md`, `test/explore-question-rounds.test.js`.
- Modified files: `sai/commands/explore/steps/route-selector.md`, `sai/commands/meta-review/findings-selection.md`, `sai/policies/backlog-implementation-start.md`, `skills/universal/to-backlog/SKILL.md`, `skills/universal/to-backlog/slice-set.md`, `skills/universal/new-change-branch/SKILL.md`, `README.md`, `docs/commands/sai-explore.md`, `test/explore-pipeline-selector.test.js`, `test/review-coordinator-worker.test.js`.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Assumptions made during exploration: the change ships as a single change (the slicing assessment found one user task with one integration point in `route-selector.md`); the `Ready to Propose` block and the `sai-backlog-slices@1` marker remain input formats of `to-backlog`, because they are data formats rather than `sai-explore` bindings. Not yet reviewed: ADR 0146a and ADR 0158a on the route close.
