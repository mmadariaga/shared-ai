> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-plan` and `/sai-build` already resolve a publication answer at their start, but Explore's Plan route still let the plan coordinator ask the publication question inside the route, and the Direct Build route authorized no push at all. Explore now asks the publication question once per crystallized set in round 3, records the answer in `explore-slice@1`, and applies it to every slice of the set, so chained slices ask nothing and a context compaction does not lose the answer.

## What Changes

- `sai/commands/explore/steps/route-selector.md` gains a `## Publication question` section. Round 3 carries the publication question as a conditional question beside the route question, asked once per crystallized set in the first round 3 of the set, whatever route that slice takes. A pre-check resolves the answer first from `explore-slice@1`, then from `pr.publishAfterRun` through `project-settings.js get` (printing `Project setting pr.publishAfterRun: <value>`), and only then asks. The question names the current branch and its remote, uses `AskUserQuestion` on Claude Code and `question` on opencode with the options **Publish** (`yes`) and **Do not publish** (`no`), and asks nothing on a detached HEAD. A declined or non-committal answer resolves `no`. The answer is recorded with `emit <id> explore-slice@1 --set intent=publication --set value=<yes|no>` before `{intent: route-choice}`. The round-3 overview and the Direct Build continuation texts now say that nothing is pushed except by the set's publication answer.
- `sai-state/machines/explore-slice.js` gains a set-wide `publication` field (`''`, `yes`, or `no`) and a `run` view that returns it. The `publication` intent records a value once per recorded inventory, rejects an event before the inventory (`INVENTORY_NOT_READY`), an invalid value (`INVALID_PUBLICATION`), and a second answer (`PUBLICATION_ALREADY_RECORDED`), and returns the view without recording when it carries no value. A new inventory clears the answer, and a stored state without the field reads as unanswered.
- `sai/commands/explore/steps/pipeline-plan-unattended.md` hands the recorded answer to the plan coordinator as a `--publish <yes|no>` line (omitted when a detached HEAD left the set without one); the note that the plan coordinator asks inside the route is removed.
- `sai/commands/explore/direct-build-coordinator.md` adds a **Publication** close step: after the telemetry commit and before the slice transition, a `yes` answer read from `explore-slice@1` makes the coordinator follow `sai/commands/build/publication.md` to push the branch without force and publish a ready-for-review request. A run that stopped before the archive worker's clean result publishes nothing, a block provider that supplies no answer means `no`, and a failed or skipped publication never stops the slice, its transition, or the chain. The route grant and the force-majeure push rule name that one publication; the archive worker keeps its no-push rule. The terminal report states the publication outcome in place of the fixed `Nothing was pushed.` line.
- `sai/commands/explore/steps/pipeline-direct-build.md` lets an automatically started slice push only by the set's publication answer.
- `AGENTS.md`, `docs/commands/sai-explore.md`, and `docs/project-settings.md` describe the round-3 question, its recorded answer, its effect on the Plan and Direct Build routes, and `pr.publishAfterRun` as the answer of the `/sai-explore` question too.
- Tests: `test/explore-question-rounds.test.js` pins round 3 with four questions and the publication question, `test/plan-publication.test.js` pins the `--publish` hand-over, and `test/explore-slice-machine.test.js` covers recording, reading, clearing, and legacy state of the `publication` field.

## Capabilities

### New Capabilities

- `explore-publication`: the round-3 publication question, its set-wide answer recorded in `explore-slice@1`, and its effect on the Plan and Direct Build routes.

### Modified Capabilities

- `explore-route-close`: round 3 also carries the conditional publication question.
- `explore-route-choice`: the round-3 native call also carries the publication question beside the route question.
- `explore-pipeline-selector`: an automatically continued Direct Build slice pushes only by the set's publication answer.
- `explore-pipeline-supervision`: the Plan route hands the answer over as `--publish`, and the Direct Build route publishes on a `yes` and reports the publication outcome.
- `plan-command`: in Explore's Plan route the coordinator receives the answer and asks no publication question.
- `project-settings`: `pr.publishAfterRun` also answers the `/sai-explore` publication question.

## Impact

- Modified: `sai/commands/explore/steps/route-selector.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `sai/commands/explore/steps/pipeline-direct-build.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai-state/machines/explore-slice.js`, `AGENTS.md`, `docs/commands/sai-explore.md`, `docs/project-settings.md`, `test/explore-question-rounds.test.js`, `test/explore-slice-machine.test.js`, `test/plan-publication.test.js`.
- Unchanged by design: standalone `sai/commands/direct-build/coordinator.md` keeps its one-commit, no-push grant; `sai/commands/plan/coordinator.md` and `sai/commands/build/publication.md` are reused as they are.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The dependency `pr-publication-answer-at-plan-start` (and `pr-publication-answer-at-build-start`) is already archived (`openspec/changes/archive/2026-11-17-pr-publication-answer-at-plan-start`, `openspec/changes/archive/2026-11-17-pr-publication-answer-at-build-start`), so this block declares no pending dependency. The `to-pr.js --unattended` mode, the `pr.publishAfterRun` setting, the run-state `publication` field, and `sai/commands/build/publication.md` delivered by those changes are reused unchanged.
