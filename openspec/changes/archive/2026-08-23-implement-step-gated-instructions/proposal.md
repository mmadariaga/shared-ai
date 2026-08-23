> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: medium (additive change; 3 new + 4 modified capabilities; 10 affected paths; no breaking change)

## Why

The `/sai-3-implement` worker previously received its whole ~300-line instruction mass up front (`worker.md` → `invocation.md` → `instructions.md`), so instruction salience decayed over long planning runs — the exact drift the `/sai-1-spec` step-gated experiment already fixed. Because the step-gated delivery mechanism was already generic and default-off in the shared command runner, replicating it for `/sai-3-implement` required no orchestration delta.

## What Changes

The change replicates the step-gated instruction delivery experiment onto `/sai-3-implement`:

- `sai/commands/implement/worker.md` now fetches `steps/common.md` at dispatch and keeps it in force for the entire run; the wholesale fetch of the invocation chain is replaced by execute-only-the-active-step delivery, and a new `Active Step Execution` section defines the sealed initial surface (worker contract + `common.md`).
- `sai/commands/implement/coordinator.md` declares a static six-row `step_pointer_map` mapping every declared progress-plan step id to its just-in-time instruction pointer, with `prereqs-resolution` mapping to `none`. While the map is in force, every progress-event continuation is exactly two lines — the protocol continuation line plus one `Active step: <id> — follow <path>` pointer line — and the terminal row reads `Active step: none — complete remaining work and return your terminal result.` Needs_input and recovery continuations carry no pointer line. Replacement reconstruction now includes the departing worker's `active_step_id`.
- A new step instruction library under `sai/commands/implement/steps/` holds `common.md` plus `collapse-implemented-steps.md`, `artifact-analysis.md`, `documentation-review.md`, `plan-generation.md`, and `validation.md`. ADR/DDR validation content (Workflow Step 3) lives inside `artifact-analysis.md` because it owns no milestone boundary of its own.
- `instructions.md` and `invocation.md` remain byte-for-byte untouched because `/sai-4-apply` still consumes them; `steps/` becomes the worker-canonical source with no sync mechanism between the two sources.
- `AGENTS.md` extends the step-gated experiment note to cover both `/sai-1-spec` and `/sai-3-implement`, and documents that `/sai-build`'s chained implement segment rebinds the implement adapter's declared `step_pointer_map` through per-segment adapter-field rebinding and therefore inherits pointer delivery, with no opt-out special case. The existing composition rebinding mechanics are deliberately left untouched (evidence-backed boundary).
- `test/implement-coordinator-worker.test.js` adds minimal parity tests covering the map shape, worker active-step execution, replacement reconstruction with `active_step_id`, the two-line continuation shape and terminal none row, no-pointer non-progress continuations, step-file existence, and the byte-for-byte untouched invariants.

## Capabilities

### New Capabilities

- **implement-steps-library** — step instruction files named by progress-plan id under `sai/commands/implement/steps/`: `common.md` plus `collapse-implemented-steps.md`, `artifact-analysis.md`, `documentation-review.md`, `plan-generation.md`, and `validation.md`; `prereqs-resolution` is fileless.
- **implement-coordinator-step-pointers** — a static six-row `step_pointer_map` on the implement coordinator, the two-line pointer continuation shape with the terminal none row, no-pointer non-progress continuations, and `active_step_id` replacement-reconstruction state.
- **implement-worker-active-step-execution** — the worker card replaces the wholesale invocation fetch with `steps/common.md` at dispatch plus execute-only-the-active-step, mirroring the spec worker card pattern.

### Modified Capabilities

- **implementation-coordinator** — replacement-reconstruction fields gain `active_step_id` as a fourth field, and the replacement's first continuation carries the correct pointer line for the active step.
- **implementation-planning-worker** — replacement-reconstruction inputs gain `active_step_id`, and the phase-policy rule home moves to the step instruction files under `sai/commands/implement/steps/` (worker contract + `common.md` sealed initial surface).
- **implement-progress-plan** — the execution surface becomes the `steps/*.md` files named by the coordinator's `Active step:` pointer line instead of `instructions.md` Step 1 through Step 5.
- **adr-creation-decision** — a third criteria-evaluation surface is added at `sai/commands/implement/steps/artifact-analysis.md` beside the two existing surfaces.

## Impact

- Modified: `AGENTS.md`, `sai/commands/implement/coordinator.md`, `sai/commands/implement/worker.md`, `test/implement-coordinator-worker.test.js`
- New: `sai/commands/implement/steps/common.md`, `sai/commands/implement/steps/collapse-implemented-steps.md`, `sai/commands/implement/steps/artifact-analysis.md`, `sai/commands/implement/steps/documentation-review.md`, `sai/commands/implement/steps/plan-generation.md`, `sai/commands/implement/steps/validation.md`
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

- `AGENTS.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/implement/worker.md`
- `sai/commands/implement/instructions.md`
- `sai/commands/implement/invocation.md`
- `sai/orchestration/command-runner.md`
- `sai/commands/spec/steps/` reference files (the spec step-gated experiment precedent)
- `test/implement-coordinator-worker.test.js`
- External URLs: None

## Additional Notes

- The step-gated instruction delivery remains an active experiment scoped to `/sai-1-spec` and `/sai-3-implement`; the other eight phases keep today's exact continuation behavior (no declared map).
- The `Active step:` pointer travels only in progress-event continuation payloads and in replacement-reconstruction `active_step_id`; it is never carried in the dispatch envelope, so no worker binding, `sai/install-manifest.json`, or wrapper change is required.
- Minimal parity tests in `test/implement-coordinator-worker.test.js` are part of the change and are green.
