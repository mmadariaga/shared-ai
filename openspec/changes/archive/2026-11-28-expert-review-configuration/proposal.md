> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The adversarial expert review answer was decided per run: `/sai-plan` and `/sai-build` resolved a flag or a recorded answer and then asked at Start, `/sai-explore` asked a yes/no question once per crystallized set, and Direct Build ran no post-implementation checkpoint. A project that always or never wanted the review had to repeat the choice on every run, and the post-setup menu could not persist it. The model customization table also showed `Unknown` for CONTEXT and DIFFICULTY on `sai-adversarial-expert-review-worker`, so the user could not judge the cost of the reviewer.

## What Changes

- `.sai/settings.jsonc` gains `expertReview.explore`, `expertReview.plan`, and `expertReview.build`; each accepts `no`, `auto`, or `ask`, `ask` is a real value rather than the absence marker, `.sai/settings.local.jsonc` overrides each key, and an invalid value is dropped with a warning naming the key. An absent key keeps the command's previous behavior.
- The post-setup menu gains an `Expert review` section between `Backlog and PR settings` and `Telemetry`, with the rows `Explore`, `Plan`, and `Build`; each row shows the stored mode, a local override, `(invalid)`, or its unset text (`ask each set` for Explore and `ask at start` for Plan and Build), and each choice saves at once.
- `/sai-plan` and `/sai-build` resolve the answer from the `--expert-review` argument, the recorded run answer, the new project setting, and then the Start question, printing the setting's warnings and one answering line.
- `/sai-explore` reads `expertReview.explore` before its per-set question: `auto` and `ask` run the checkpoint without the question and `auto` decides the corrections, `no` skips it, and an absent key keeps the question.
- The Plan - Unattended route passes `--expert-review auto` only when `expertReview.plan` is `auto`; `ask`, `no`, and absence pass `no`.
- Direct Build adds `step-2c`, an expert review checkpoint after the Step 2b suite gate and before the Step 3 backfill, when the resolved answer is `auto`; it reviews the production files of the run's first-seen changed-path union, reruns the selected tests for corrected paths, and leaves kept corrections for the archive step's commit.
- `/sai-direct-build` accepts `--expert-review [no|auto|ask]`, where a bare flag is `auto` and the argument wins over the setting.
- `direct-build-run@1` records `step-2c`, the closed `expert_review` and `expert_review_checkpoint` fields, and requires the handled checkpoint before the backfill checkpoint.
- `sai-adversarial-expert-review-worker` shows `Medium` context and `↑↑↑` difficulty in the model customization table, `docs/models.md` matches, and a test asserts that every routed worker of the matrix has a profile row.
- The `direct-build-command` capability profile adds the reviewer to its delegates, and the Direct Build guard window is verified after `step-2c` instead of after the suite gate.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `expert-review-answer`: the answer gains the project setting and `/sai-direct-build`, the run-state fields extend to `direct-build-run@1`, and the explore and Plan-route rules change.
- `adversarial-expert-review`: a fourth checkpoint at Direct Build `step-2c`, with its product, verification, and no-commit rule.
- `project-settings`: three `expertReview.*` keys, an `ask`-as-value exception, and their labels and absence texts.
- `project-settings-screen`: value choices for the three keys and an `Expert review` section submenu.
- `project-settings-writer`: `ask` is validated as a value for keys whose catalogue entry declares `askIsValue`.
- `model-customization-menu`: the reviewer's profile row and the rule that every routed matrix worker has a profile row.
- `direct-build-command`: the `--expert-review` argument and the reviewer delegate.
- `direct-build-run-state`: `step-2c`, the two closed fields, and the backfill checkpoint precondition.
- `direct-build-suite-gate`: a green or skipped gate continues to `step-2c` before backfill.
- `explore-pipeline-supervision`: the Direct Build flow includes `step-2c`, its reviewer worker, and its attempt budget.
- `explore-pipeline-selector`: the preserved Direct Build flow includes the expert review checkpoint.
- `obstacle-escalation`: the Direct Build step-budget enumeration includes `step-2c`.
- `auto-fast-implement-worker`: the implementer guard window is verified after `step-2c` when it runs.
- `mode-specific-explore-todo`: `Build/Implement` completes only after `step-2c` is handled.

## Impact

- Modified: `sai/policies/adversarial-expert-review.md`, `sai/commands/build/coordinator.md`, `sai/commands/plan/coordinator.md`, `sai/commands/direct-build/coordinator.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/explore/steps/pipeline-direct-build.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `sai/commands/explore/steps/route-selector.md`, `sai-state/machines/direct-build-run.js`, `sai/install-manifest.json`, `sai/tools/project-settings.js`, `bin/project-settings-screen.js`, `bin/project-settings-writer.js`, `bin/model-customization.js`
- Modified: `AGENTS.md`, `README.md`, `docs/commands/sai-build.md`, `docs/commands/sai-direct-build.md`, `docs/commands/sai-explore.md`, `docs/commands/sai-plan.md`, `docs/models.md`, `docs/project-settings.md`
- Modified tests: `test/adversarial-expert-review.test.js`, `test/direct-build-command.test.js`, `test/direct-build-run-machine.test.js`, `test/model-customization-menu.test.js`, `test/model-customization-taxonomy.test.js`, `test/project-settings-screen.test.js`, `test/project-settings.test.js`
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
