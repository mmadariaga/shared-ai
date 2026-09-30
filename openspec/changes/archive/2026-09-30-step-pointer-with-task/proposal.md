> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Every step machine's first step is fileless (`follow: none`). Its progress event carried no real progress signal and only let the coordinator hand back the second step's pointer. That cost about two coordinator turns per phase in each of the seven step-machine phases (spec, design, implement, review, security, performance, accessibility). In supervised mode these are pure relay turns over Explore's long context. The pointer for the first filed step is fixed by the machine definition and is known before the worker returns anything, so it can travel with the task disclosure instead.

Known limitations accepted: the diff is larger (seven workers, seven coordinators, seven `steps/common.md` files, and the matching tests) in exchange for one uniform rule. The coordinator still owns machine state and the panel, and just-in-time step delivery stays: a worker never loads more than the active step file and steps are never merged.

## What Changes

- `sai-state reset <id> <machineId>` returns the additive fields `stage` and `next: {follow, hint}` for the machine's first filed step (the first step whose `follow` is a file) when the machine exposes `firstFiled()`. Other machines, or a `firstFiled()` that throws or returns a malformed pointer, keep the plain `{reset}` response.
- `sai-state/machines/linear-steps.js` machines and `sai-state/machines/design-standalone.js` export `firstFiled()`. For design it returns `research` in both the opted-in and the unopted variant.
- The coordinator retains the `reset` pointer and sends `Active step: <stage> — follow <next.follow>` as the first line of the post-ready task-disclosure continuation, before the task. The two-phase ready handshake is unchanged.
- The worker runs the fileless first step inline, follows the disclosed pointer, and reports both step ids in one progress event. If a first event reports only the first id, the machine returns the same pointer again with no error.
- A prerequisite, change-resolution, or scope-resolution failure in the first step returns its terminal status with no progress event. An early terminal outcome of the first step reports only the ids it completed and does not follow the pointer.
- Before the first progress event, replacement reconstruction uses the first filed step as `active_step_id`, never the fileless step's `none` pointer.
- Design: the combined first emit carries `--with-overview true|false`, and a design-phase retry reseeds the variant on its first emit after a new reset.
- Implement: on a first run, `collapse-implemented-steps` is reported in the first event without fetching its step file. The first pointer always names that step.
- The rule is stated once, phase-neutral, in `sai/orchestration/command-runner.md` § Step-gated pointer delivery, `sai/policies/stage-machine.md` § Step machines and § Reset, and the new `sai/orchestration/worker-core.md` § Step-machine task disclosure. The seven coordinators, workers, and `steps/common.md` files reference it; `review/steps/common.md` gains a Step delivery section.
- `/sai-build`'s chained implement segment and `/sai-explore`'s supervised spec and design dispatches deliver the pointer in their own post-ready task disclosure.
- Step ids and step files are unchanged. ADR 0189 amends ADR 0172c, and GLOSSARY.md defines **First Filed Step**.

## Capabilities

### New Capabilities

- `step-pointer-task-disclosure`: the first filed step's pointer travels with the post-ready task disclosure across all seven step-machine phases and their chained or supervised surfaces, including the single-id fallback, failure, replacement, and design-variant rules.

### Modified Capabilities

- `stage-machine-cli-interface`: the `reset` success response carries the first filed step pointer on step machines.
- `linear-step-machine-factory`: factory machines expose `firstFiled()`.
- `runner-pointer-extension`: the pointer also travels in the task disclosure; pre-progress reconstruction uses the first filed step.
- `coordinator-step-pointers`: every step-machine coordinator opens the task disclosure with the first filed pointer.
- `implement-coordinator-step-pointers`: pre-progress replacement resumes at `collapse-implemented-steps`.
- `accessibility-step-gated-delivery`, `security-step-gated-delivery`, `performance-step-gated-delivery`: coordinator disclosure pointer and combined first event.
- `worker-active-step-execution`: the spec and design first pointer arrives with the task disclosure.
- `implement-worker-active-step-execution`: the implement first pointer arrives with the task disclosure.
- `implement-progress-plan`: the first pointer always targets `collapse-implemented-steps`.
- `startup-handshake`: step-machine workers report the startup id together with the first filed step.
- `spec-proposal-worker`: the startup and research batches share the first progress event.
- `design-planning-worker`: the startup and research batches share the first progress event.

## Impact

New files:
- `docs/adr/0189-first-step-pointer-travels-with-the-task.md`

Modified files:
- `bin/sai-state.js`
- `sai-state/machines/linear-steps.js`
- `sai-state/machines/design-standalone.js`
- `sai/orchestration/command-runner.md`
- `sai/orchestration/worker-core.md`
- `sai/policies/stage-machine.md`
- `sai/commands/{spec,design,implement,review,security,performance,accessibility}/coordinator.md`
- `sai/commands/{spec,design,implement,review,security,performance,accessibility}/worker.md`
- `sai/commands/{spec,design,implement,review,security,performance,accessibility}/steps/common.md`
- `sai/commands/design/phase-contract.md`
- `sai/commands/meta-build/coordinator.md`
- `sai/commands/explore/steps/pipeline-plan-unattended.md`
- `AGENTS.md`, `GLOSSARY.md`, `docs/adr/0000-INDEX.md`
- `test/sai-state.test.js`, `test/step-machine-wiring.test.js`, `test/linear-step-machines.test.js`, `test/design-standalone-machine.test.js`, `test/implement-coordinator-worker.test.js`, `test/spec-coordinator-worker.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Source: `handoff-sai1-optimizations.md` item 1a, `handoff-sai2-optimizations.md` (design-standalone@1 and its `--with-overview` seed), `handoff-sai3-sai4-optimizations.md` (implement-standalone@1), and `handoff-sai5-sai-review-optimizations.md` R4. Expected effect: the spec phase has 4 progress events instead of 6 (together with `remove-dead-review-steps`), and each other phase has one fewer. The review machine still has `resolve-mutation-analysis`; its removal (sai-5 R1) is a separate change and does not touch the first two steps.
