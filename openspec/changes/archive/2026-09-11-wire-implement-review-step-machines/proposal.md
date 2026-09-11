> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Both `implement-standalone@1` and `review-standalone@1` step machines are already implemented, registered, and tested in `sai-state/registry.js`. The specification `openspec/specs/review-standalone-loading/spec.md` explicitly requires the coordinator to consult the machine. However, `sai/commands/implement/coordinator.md` and `sai/commands/review/coordinator.md` never reference these machines; instead, they rely on static `step_pointer_map` tables to derive step pointers via static logic. This change wires the coordinators to use their declared step machines for every activation, both direct and chained, eliminating the gap between specification and implementation.

## What Changes

- **sai/commands/implement/coordinator.md**: Adds `Fetch @sai/policies/stage-machine.md` directive and declares `step_machine: implement-standalone@1`. Removes the static `step_pointer_map` table (six rows mapping step ids to their file paths) and the associated explanation of two-line continuation pointers. The `progress_plan` ids and labels remain unchanged for panel rendering.

- **sai/commands/review/coordinator.md**: Adds `Fetch @sai/policies/stage-machine.md` directive and declares `step_machine: review-standalone@1`. Removes the static `step_pointer_map` table (five rows mapping step ids to their file paths) and the associated continuation-pointer explanation. The `progress_plan` ids and labels remain unchanged. The `replacement_reconstruction_fields` description is updated to reference "the step machine" instead of "the step-pointer map."

- **Test files**: Updated to verify that discovered coordinators declare `step_machine` and load `stage-machine.md`; tests no longer verify static `step_pointer_map` table contents.

## Capabilities

### New Capabilities

None — both machines were already declared as new capabilities in prior changes (implement-standalone-loading, review-standalone-loading).

### Modified Capabilities

- **implement-standalone-loading**: The requirement "Standalone-only scope with parked machine lifecycle" is REMOVED and replaced with a new requirement covering every-activation scope. The machine now governs every activation of the implement adapter, both direct (/sai-3-implement) and chained (as part of /sai-build).

- **review-standalone-loading**: The requirement "Standalone-only scope with byte-identical composed path" is REMOVED and replaced with a new requirement covering every-activation scope. The machine now governs every activation of the review adapter, both direct (/sai-5-review) and chained (as position 0 in /sai-review).

- **implement-coordinator-step-pointers**: The static `step_pointer_map` is no longer declared. The requirement "Static step_pointer_map covers every declared step id" is REMOVED; pointer derivation is now exclusively owned by the step machine via stage-machine.md. Requirements for progress-event continuations, non-progress continuations, and replacement reconstruction remain and now apply via the step_machine declaration.

- **coordinator-step-pointers**: The static `step_pointer_map` for review is no longer declared. The requirement "Review coordinator declares a static step_pointer_map" is REMOVED; the coordinator instead declares `step_machine: review-standalone@1` and relies on stage-machine.md for the same pointer convention. The step-pointer convention now covers coordinators using either static maps or step machines.

- **step-machine-wiring-verification**: Validation scope is extended to discover and validate implement and review coordinators alongside spec and design, verifying that they declare their respective step machines and that the machines are registered.

## Impact

### Files Modified
- `sai/commands/implement/coordinator.md` — Fetch directive added; static step_pointer_map removed; step_machine declared
- `sai/commands/review/coordinator.md` — Fetch directive added; static step_pointer_map removed; step_machine declared
- `test/implement-coordinator-worker.test.js` — Test assertions updated to verify step_machine wiring
- `test/review-coordinator-worker.test.js` — Test assertions updated to verify step_machine wiring
- `test/step-machine-wiring.test.js` — Test coverage extended to discover and validate implement and review machines

### Files Not Modified
- `sai/commands/meta-build/coordinator.md` — No changes (inherits implement step_machine via same card)
- `sai/commands/meta-review/coordinator.md` — No changes (inherits review and security step_machine via same card)

### Scope and Constraints
- No edits to meta-build or meta-review coordinators; they inherit the change
- The `progress_plan` ids and labels stay in coordinator cards for panel rendering
- The continuation format and literals stay byte-identical (no change to serialized pointers)
- Continuation behavior from stage-machine.md applies to all activations: /sai-build implement segment and /sai-review review segment get the same pointer sequence as their direct counterparts
- New failure mode: /sai-build and /sai-review now stop if the store fails during implement or review segment (inherited from step_machine behavior)

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
