> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Direct Build was the last `/sai-explore` route on the legacy orchestration: `sai/commands/explore/steps/pipeline-direct-build.md` held the whole supervision contract and loaded `unattended-runtime-recovery.md`, `bounded-recovery.md`, and `stop-options.md`, and its three workers loaded `sai/orchestration/worker-core.md`. The Plan route and the route selector also still stopped through `stop-options.md`. The Direct Build route now runs on a goal-driven card that the explore session follows, as it already follows `sai/commands/plan/coordinator.md` for Plan, and every explore stop point uses the shared obstacle and escalation policy. The user-visible Direct Build contract stays the same, and `retire-legacy-orchestration` is left with deletion and cleanup only.

## What Changes

- New card `sai/commands/explore/direct-build-coordinator.md` (Goal, Start, Run state, The run, Resume, Obstacles, Close). It owns the eight steps, the Step 2b suite gate, the three no-commit guard windows, the run state, the Execute orders rule, resumption, and the terminal report. It loads `sai/policies/obstacle-escalation.md` with one budget of 3 attempts per step (`step-1`, `step-2`, `step-2b`, `step-3` through `step-8`) and names its own force-majeure cases. It loads none of `command-runner.md`, `worker-core.md`, `bounded-recovery.md`, `stop-options.md`, or `unattended-runtime-recovery.md`. It fetches the direct-build, backfill, and archive worker bindings at their dispatch points.
- `sai/commands/explore/steps/pipeline-direct-build.md` keeps only what is explore's own: the write-scope exception, ordered slice selection, dispatchable-blocks rule, the stored-block export with its `BLOCK_NOT_FOUND` / `BLOCK_EXPORT_FAILED` escalation, the fetch of the card with its `--block-file` / `--block-hash` arguments, the `--no-specs` POC profile, slice-machine emits, the route projection, and the successful slice completion transition. The POC profile spends no recovery attempt.
- `sai/commands/explore/steps/pipeline-plan-unattended.md` and `sai/commands/explore/steps/route-selector.md` escalate through `sai/policies/obstacle-escalation.md` instead of `stop-options.md` and the unattended recovery procedure; the route selector's pending-execution branch points to the card's Run state and Resume.
- `sai/commands/explore/direct-build-worker.md`, `sai/commands/backfill/worker.md`, and `sai/commands/archive/worker.md` no longer load `sai/orchestration/worker-core.md`. Each loads `sai/policies/public-chat.md` and states its own ready return, terminal result shapes, `needs_input` question rule, and non-normative treatment of process statements. The backfill and archive workers cite the card's Execute orders rule instead of `unattended-runtime-recovery.md`.
- `sai/policies/direct-build-report-transport.md` gains a `Failed reports` section that carries `failure_class` and `unrecoverable` for a full-route `failed` report with `resolved_change_name`, and its report recovery follows the obstacle policy.
- `bin/worker-matrix.js` adds the `direct-build` phase to `STANDALONE_PHASES`, so `sai-direct-build-worker` renders from `standalone-worker-template.md` on both harnesses.
- References to the Direct Build Step 2 criteria, the ADR/DDR pass, the functional fix loop, and the failed-execute owner now name the card: `sai/commands/implement/coordinator.md`, `sai/policies/adr-ddr-criteria.md`, `sai/policies/incremental-review.md`, `sai/commands/archive/coordinator.md`, `sai/commands/backfill/coordinator.md`, `sai/commands/explore/instructions.md`, `sai/commands/explore/steps/pipeline-selector.md`, and `sai/commands/explore/steps/slice.md`.
- `AGENTS.md` describes the Direct Build route outside the shared orchestration and states that no command card or worker contract loads `worker-core.md` any more.
- Tests follow the new card and binding shapes, and `test/direct-build-goal-driven.test.js` covers the migration (E8, E9, E12, I4, I8, I9, and the `needs_input` question rule).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-pipeline-supervision`: the Direct Build route follows the goal-driven card; run state, guard windows, failure routing, replacement, and rejected responses move to the card and the obstacle policy.
- `obstacle-escalation`: the Direct Build card and the explore Plan and route-selector stop points also use the shared policy.
- `worker-matrix-collapse`: the direct-build binding renders from the standalone worker template.
- `auto-fast-implement-worker`: the Direct Build worker defines its own lifecycle shapes and reports failure with a concrete cause.
- `routed-archive-command`: a failed Direct Build execute result stays with the card; the archive worker defines its own lifecycle shapes.
- `routed-backfill-command`: the backfill worker defines its own lifecycle shapes.
- `direct-build-report-transport`: full-route failed reports carry the failure fields.
- `direct-build-suite-gate`: the terminal suite gate is defined in the card and escalates under the obstacle policy.
- `direct-build-terminal-format`: the decision after the report comes from the obstacle policy.
- `unplanned-stop-options`: Direct Build's closing decision prompt uses the obstacle policy's options.
- `incremental-review`: the Direct Build functional fix loop is Step 2 of the card.
- `implement-new-adversarial-review`: the step review applies the card's Step 2 criteria.
- `slice-path-scope`: the card is the Direct Build route card that references the policy.
- `cosmetic-doc-consistency`: the ADR/DDR criteria list the card as their Direct Build consumer.
- `unattended-resilience-rule`: the Direct Build lane no longer applies the resilience rule; its stop-notice and budget statements for Direct Build are removed.
- `bounded-worker-recovery`: the Direct Build route is no longer a consumer of Bounded Recovery or runtime repair, and its step allowance is removed.
- `command-runner-layout`: worker contracts state their own lifecycle shapes and no longer fetch `sai/orchestration/worker-core.md`.

## Impact

- New files: `sai/commands/explore/direct-build-coordinator.md`, `test/direct-build-goal-driven.test.js`.
- Modified files: `AGENTS.md`, `bin/worker-matrix.js`, `sai/commands/archive/coordinator.md`, `sai/commands/archive/worker.md`, `sai/commands/backfill/coordinator.md`, `sai/commands/backfill/worker.md`, `sai/commands/explore/direct-build-worker.md`, `sai/commands/explore/instructions.md`, `sai/commands/explore/steps/pipeline-direct-build.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `sai/commands/explore/steps/pipeline-selector.md`, `sai/commands/explore/steps/route-selector.md`, `sai/commands/explore/steps/slice.md`, `sai/commands/implement/coordinator.md`, `sai/policies/adr-ddr-criteria.md`, `sai/policies/direct-build-report-transport.md`, `sai/policies/incremental-review.md`, and the affected tests under `test/`.
- No legacy file is deleted: `sai/orchestration/worker-core.md`, `sai/orchestration/command-runner.md`, `stop-options.md`, `bounded-recovery.md`, `unattended-runtime-recovery.md`, and the routed `worker-template.md` bindings stay on disk for their remaining consumers. Their capability specs keep the statements for their remaining consumers; only the Direct Build and worker-card statements change here.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Follow-up in `retire-legacy-orchestration`: once this slice lands, `sai/orchestration/worker-core.md` and the routed `worker-template.md` bindings have no Direct Build consumer left, so I2 can delete them without touching the Direct Build pipeline again.
