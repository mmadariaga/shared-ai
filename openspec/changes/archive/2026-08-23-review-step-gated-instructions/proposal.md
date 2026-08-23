> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: medium (1 phase migration; 2 new + 4 modified requirements across 4 capabilities; 8 affected paths; no breaking change)

## Why

The review worker received its whole instruction mass up front — a ~219-line monolithic `instructions.md` fetched wholesale mid-run — so instruction salience decayed over the long analysis pass and produced adherence drift. The same symptom was cured for `/sai-1-spec` by step-gated delivery, and `sai-1`/`sai-2`/`sai-3` already deliver worker instructions just-in-time per progress-plan step via static `step_pointer_map` declarations backed by the shared command runner's default-off step-gated delivery. Review was the head of the audit family still on wholesale delivery; this change migrates it onto the same delivery mechanism while keeping every observable outcome byte-identical.

## What Changes

Implemented changes across eight staged files:

- `sai/commands/review/coordinator.md` declares a static optional `step_pointer_map` over exactly the five canonical plan ids (`resolve-change` → none; the other four → their files under `sai/commands/review/steps/`), never carried in the dispatch envelope or any reconstruction field. Progress-event continuations become exactly two lines: the protocol continuation line plus one deterministic pointer line `Active step: <id> — follow <path>` (first declared step still unmarked in plan order); with every step marked, `Active step: none — complete remaining work and return your terminal result.` Non-progress continuations (picker-answer forwarding) carry no pointer line. Replacement-reconstruction state now requires the departing worker's `active_step_id` when the map is in force, and the replacement's first continuation restores that step's pointer.
- New carved step library under `sai/commands/review/steps/`: `common.md` (always-active boundaries: step-delivery meta-rule, input paths, communication mode, prerequisites, collaboration style, hard rules, standing reminders) plus one file per delivered step — `establish-diff-scope.md`, `resolve-review-analysis.md`, `resolve-mutation-analysis.md`, `close-review-outcome.md` — each naming its active step id and ending at its progress event.
- `sai/commands/review/worker.md` loads `steps/common.md` at dispatch as part of the sealed initial surface and owns a new `## Active Step Execution` section: execute only the coordinator-named step, never prefetch other step files; the wholesale `@sai/commands/review/invocation.md` fetch is replaced by active-step execution; a gated stage resolved by legitimate skip still reports its milestone and advances the pointer past it without executing the step file.
- `sai/commands/review/instructions.md` and `invocation.md` remain untouched beside the new library — deliberate preservation per the sai-1 precedent until a future retirement decision. Replicating the pattern onto `sai-6-security`/`sai-7-performance`/`sai-8-accessibility` is deliberately deferred to a separate follow-up change (`audit-step-gated-instructions`). Step-gated delivery remains labeled an active experiment rather than a graduated convention.
- `test/review-coordinator-worker.test.js` adds six guard tests asserting the map declaration over the five plan ids, two-line pointer continuations, pointer-less picker forwarding, `active_step_id` reconstruction, common.md-at-dispatch active-step execution, and the carved library existing beside the untouched monolith. Guard suite green 13/13 on the implemented tree.

## Capabilities

### New Capabilities

None — all touched capabilities already existed.

### Modified Capabilities

- `coordinator-step-pointers` — the review coordinator joins the map-declaring coordinators; picker-answer forwarding joins the pointer-less continuation class.
- `worker-active-step-execution` — the review worker joins spec-proposal and design workers in execute-only-the-active-step delivery over a sealed initial surface.
- `review-phase-worker` — the wholesale invocation-core load is replaced by step-gated delivery (`steps/common.md` at dispatch + pointer-named step files).
- `review-phase-coordinator` — replacement reconstruction gains the departing worker's `active_step_id` when the map is in force.

## Impact

- New files: `sai/commands/review/steps/common.md`, `sai/commands/review/steps/establish-diff-scope.md`, `sai/commands/review/steps/resolve-review-analysis.md`, `sai/commands/review/steps/resolve-mutation-analysis.md`, `sai/commands/review/steps/close-review-outcome.md`.
- Modified files: `sai/commands/review/coordinator.md`, `sai/commands/review/worker.md`, `test/review-coordinator-worker.test.js`.
- Spec updates synced on archive: delta specs for `coordinator-step-pointers`, `worker-active-step-execution`, `review-phase-worker`, `review-phase-coordinator`.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

- `AGENTS.md`
- `sai/orchestration/command-runner.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/review/worker.md`
- `sai/commands/review/invocation.md`
- `sai/commands/review/instructions.md`
- `sai/commands/spec/steps/` (step-gating precedent)
- `test/review-coordinator-worker.test.js`
- `openspec/specs/coordinator-step-pointers/spec.md`
- `openspec/specs/worker-active-step-execution/spec.md`
- `openspec/specs/review-phase-worker/spec.md`
- `openspec/specs/review-phase-coordinator/spec.md`

External URLs: None

## Additional Notes

- This record is post-hoc backfilled from a user-supplied statement of intent (`prior_intent: true` in `.openspec.yaml`); all stated items reconciled as diff-matched, with one evidenced-but-unstated item (replacement-reconstruction `active_step_id`) reported as scope drift and specified from the diff.
- The guard suite ran green 13/13 on the implemented tree; full-suite failures observed during verification were confirmed pre-existing on a stashed clean tree.
- The original monolithic `instructions.md` and `invocation.md` remain in place beside the new `steps/` library as deliberate preserved duplication (accepted per the sai-1 precedent) pending a future retirement decision.
- Replicating the pattern onto `sai-6-security`, `sai-7-performance`, and `sai-8-accessibility` is deferred to a separate follow-up change (`audit-step-gated-instructions`).
- Step-gated delivery remains labeled an active experiment rather than a graduated convention.
