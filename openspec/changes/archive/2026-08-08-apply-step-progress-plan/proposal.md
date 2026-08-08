**Complexity**: medium (1 new capability, 5 requirements, 4 affected files, no breaking change, no new dependency)

## Why

`/sai-4-apply` coordinates long multi-step runs entirely in the main session — the coordinator dispatches Step-execution subagents directly, with no coordinator-worker boundary — yet it renders no live task list, so run progress is visible only by reading `implementation.md`'s checkboxes. The list already exists on disk as `#### Step N:` headings, so apply needs no protocol — only a projection of those headings into the harness task list, marked as each Step is verified complete.

## What Changes

- `/sai-4-apply` renders a task list at run start, projected from the `#### Step N:` headings of `openspec/changes/{change-name}/implementation.md`, in plan order — one entry per Step, no protocol involved.
- Each list entry is marked `completed` in the same batched update where the coordinator marks that Step's checkboxes `[x]` in `implementation.md` (after coordinator verification passes and, when applicable, the human verification gate confirms) — the two representations of the same progress stay in step within a run.
- The list mirrors the on-disk checkboxes rather than replacing them: `implementation.md` remains the durable progress record where `sai-archive` and `sai-status` already read it.
- The neutral task-list policy `sai/policies/todo-structure.md` gains the apply step projection as a governed surface; its minimum-threshold rule applies unchanged, so a very small implementation plan renders no list at all.
- The projection introduces no progress events, no `progress_plan` declaration, and no change to the worker lifecycle or coordinator contract — apply has no coordinator-worker boundary to carry an event.
- New domain term appended to `GLOSSARY.md` (**Step Projection**).
- No **BREAKING** changes; no new dependency.

## Capabilities

### New Capabilities

- `apply-step-projection`: build the apply task list from the implementation plan's `#### Step N:` headings and mark each entry `completed` on verified completion, mirroring the on-disk checkboxes and following the neutral task-list policy.

### Modified Capabilities

## Impact

Affected files:

- `sai/instructions/apply.md` — new projection behavior: render the full list at run start before the first Step dispatch; mark each entry in the same batched update as the Step's checkbox marking.
- `sai/policies/todo-structure.md` — scope extended to name the apply step projection as a governed surface (list structure, state vocabulary, deterministic derivation, minimum-threshold rule, emission-ownership invariant stay single-sourced here).
- `GLOSSARY.md` — new domain term appended.
- `openspec/specs/apply-step-projection/spec.md` — new delta spec (synced when the change is applied).

Systems: Claude Code task-list tool and opencode `todowrite` — the same per-harness mechanisms the routed progress list uses, emitted from the coordinator session only.

## Proposal Research Documentation

**Local files**:

- sai/instructions/apply.md
- sai/instructions/implement.md
- sai/instructions/_templates/implementation-plan.md
- sai/commands/sai-4-apply.md
- sai/policies/todo-structure.md
- sai/policies/remember.md
- sai/orchestration/worker-lifecycle.md
- sai/orchestration/workers/bindings/claude/design-worker.md
- sai/orchestration/workers/bindings/opencode/design-worker.md
- openspec/specs/progress-minimum-threshold/spec.md
- openspec/specs/progress-harness-bindings/spec.md
- openspec/specs/implementation-progress-tracking/spec.md
- openspec/specs/coordinator-progress-ownership/spec.md
- openspec/specs/worker-lifecycle-protocol/spec.md
- openspec/changes/archive/2026-08-08-command-progress-plan-protocol/proposal.md
- openspec/schemas/sai-workflow/templates/implementation.md
- GLOSSARY.md

**External URLs**: none.

## Additional Notes

- The projection source is the artifact convention `#### Step N:` (H4 with colon), per `sai/instructions/_templates/implementation-plan.md:29` and every archived `implementation.md` — not the schema scaffold's `## Step N —` (H2) form at `openspec/schemas/sai-workflow/templates/implementation.md:9`.
- The existing "Plan cross-check" prose at `sai/instructions/apply.md:399` still names the older `## Step N — <title>` notation for implementation.md headings; the projection keys on the real `#### Step N:` artifact convention, matching `implement.md`'s own re-run classification ("every `#### Step N:` section").
- Marking hooks at the existing checkbox-marking step of the post-dispatch processing order (`sai/instructions/apply.md:66`): per-Step batched `[x]` update after verification passes and (if applicable) human confirmation. Under fast-track, marking follows the same batched moment after automated checks pass.
- Initial render state derives from the on-disk checkbox state at run start: Steps already fully marked `[x]` (e.g. a re-run) render `completed`, the first not-fully-marked Step in plan order renders `in_progress`, the rest `pending` — the same deterministic derivation the routed progress list uses, applied to the on-disk marked set.
- The threshold constant is single-sourced in `sai/policies/todo-structure.md`; this change references it and never restates the value, per `progress-minimum-threshold/spec.md`'s `threshold-single-sourced`.
- Emission-ownership holds as in the routed list: the task-list tool call originates from the coordinator session (the apply main agent), never from a Step-execution subagent — opencode disables `todowrite` for subagents by default.
