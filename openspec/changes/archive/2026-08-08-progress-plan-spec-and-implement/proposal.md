**Complexity**: high (9 capabilities, no breaking change, no new dependency)

## Why

Slice 1 (`command-progress-plan-protocol`) proved the progress-plan protocol end-to-end on `/sai-2-design` only. `/sai-1-spec` and `/sai-3-implement` share the coordinator-plus-routed-worker shape — their coordinators still set `allowed_nonterminal_extensions` to empty and their workers never report progress, so the two longest planning phases run without a task list. This change declares the spec and implementation progress plans and wires both phases' coordinators, workers, and bindings to the protocol slice 1 established.

## What Changes

- The spec phase adapter (`sai/commands/spec/coordinator.md`) SHALL declare a canonical three-step progress plan — `prereqs-resolution`, `proposal-and-specs`, `verification-summary` — mirrored by the spec-proposal worker contract. The spec worker emits progress events after resolution; the coordinator renders the plan at dispatch, marks steps only from progress events, acknowledges with the fixed protocol value `continue_after_progress`, and reconciles at run-closing results.
- The implementation phase adapter (`sai/commands/implement/coordinator.md`) SHALL declare a canonical five-step progress plan derived from the explicit Step 1–5 workflow of `sai/instructions/implement.md:35-127` — `prereqs-resolution`, `plan-simplification`, `artifact-analysis`, `documentation-review`, `plan-generation` — mirrored by the implementation-planning worker contract, with the same emission, rendering, marking, and reconciliation wiring.
- The per-harness spec and implementation worker bindings (four files) gain the task-list emission already specified for the design bindings, behind the same neutral policy `sai/policies/todo-structure.md`; the minimum-threshold rule applies unchanged (spec plan = 3 steps, implement plan = 5 steps, both render).
- The progress scope statement in `sai/orchestration/worker-lifecycle.md` widens from design-scoped to the three planning phases (design, spec-proposal, implementation-planning); audit workers never emit progress events and their payload validation is unchanged.
- No change to the protocol mechanics: the event shape, `continue_after_progress` acknowledgement, plan declaration field, coordinator ownership, deterministic rendering, changed-file unioning, and minimum threshold are all reused as-is. No **BREAKING** changes; no new dependency; no install-manifest change (orchestration and bindings projections are already recursive and harness-neutral).
- No `GLOSSARY.md` change: the Progress Plan, Progress Step, and Progress Event terms appended by slice 1 are already phase-neutral.

## Capabilities

### New Capabilities

- `spec-progress-plan`: the canonical ordered three-step progress plan for the spec-proposal phase, declared by the spec phase adapter and enumerated by the spec-proposal worker contract.
- `implement-progress-plan`: the canonical ordered five-step progress plan for the implementation-planning phase, declared by the implementation phase adapter and enumerated by the implementation-planning worker contract.

### Modified Capabilities

- `spec-coordinator`: the routed spec coordinator declares and renders the spec progress plan, marks steps from worker progress events, admits progress events as the sole nonterminal extension, and reconciles the list at run-closing results.
- `spec-proposal-worker`: the spec-proposal worker gains progress-event emission after prerequisite checks pass and change resolution completes, using only the canonical spec step ids.
- `implementation-coordinator`: the routed implementation coordinator declares and renders the implementation progress plan, marks steps from worker progress events, and admits progress events as the sole nonterminal extension.
- `implementation-planning-worker`: the implementation-planning worker gains progress-event emission after change resolution, using only the canonical implementation step ids.
- `progress-event-lifecycle`: the `design-worker-scope` requirement widens to the three planning phases; audit workers remain excluded.
- `worker-lifecycle-protocol`: the `progress-event-extension` requirement's design-scoped wording widens to the three planning phases.
- `progress-harness-bindings`: the `neutral-installed-binding` requirement's binding-source enumeration widens from the two design bindings to the six planning-phase bindings.

## Impact

Affected files:

- `sai/commands/spec/coordinator.md` — declare the canonical spec plan; render/mark/reconcile per `sai/policies/todo-structure.md`; admit progress events as the sole allowed nonterminal extension.
- `sai/commands/implement/coordinator.md` — declare the canonical implementation plan; render/mark/reconcile; admit progress events as the sole allowed nonterminal extension.
- `sai/orchestration/workers/sai-1-spec-proposal-worker.md` — new Progress Reporting contract enumerating the canonical spec step ids and emission rules.
- `sai/orchestration/workers/sai-3-implementation-worker.md` — new Progress Reporting contract enumerating the canonical implementation step ids and emission rules.
- `sai/orchestration/workers/bindings/claude/spec-worker.md`, `sai/orchestration/workers/bindings/opencode/spec-worker.md`, `sai/orchestration/workers/bindings/claude/implementation-worker.md`, `sai/orchestration/workers/bindings/opencode/implementation-worker.md` — task-list emission per the harness binding, coordinator-session-only.
- `sai/orchestration/worker-lifecycle.md` — progress scope statement widens from design-scoped to the three planning phases.
- `test/spec-coordinator-worker.test.js`, `test/implement-coordinator-worker.test.js` — progress-plan assertions mirroring the slice-1 `test/design-coordinator-worker.test.js` pattern.
- `openspec/specs/progress-event-lifecycle/spec.md`, `openspec/specs/worker-lifecycle-protocol/spec.md`, `openspec/specs/progress-harness-bindings/spec.md`, `openspec/specs/implementation-coordinator/spec.md`, `openspec/specs/implementation-planning-worker/spec.md` — synced when the change is applied.

Not touched: `sai/orchestration/coordinator-contract.md`, `sai/policies/todo-structure.md`, `sai/policies/progress-*` surfaces, the four audit workers and their bindings, the inline spec caller (`sai/commands/sai-1-spec.md`), and `sai/install-manifest.json`.

Systems: Claude Code task tool and opencode `todowrite` — the slice-1 harness mechanisms, reused without change.

## Proposal Research Documentation

**Local files**:

- sai/orchestration/coordinator-contract.md
- sai/orchestration/worker-lifecycle.md
- sai/orchestration/workers/sai-1-spec-proposal-worker.md
- sai/orchestration/workers/sai-2-design-worker.md
- sai/orchestration/workers/sai-3-implementation-worker.md
- sai/orchestration/workers/bindings/claude/design-worker.md
- sai/orchestration/workers/bindings/claude/spec-worker.md
- sai/orchestration/workers/bindings/claude/implementation-worker.md
- sai/orchestration/workers/bindings/opencode/design-worker.md
- sai/orchestration/workers/bindings/opencode/spec-worker.md
- sai/orchestration/workers/bindings/opencode/implementation-worker.md
- sai/commands/spec/coordinator.md
- sai/commands/spec/invocation.md
- sai/commands/design/coordinator.md
- sai/commands/implement/coordinator.md
- sai/commands/implement/invocation.md
- sai/instructions/implement.md
- sai/instructions/spec.propose.md
- sai/policies/todo-structure.md
- sai/policies/prereqs.md
- sai/policies/glossary-format.md
- sai/policies/remember.md
- commands/opencode/sai-1-spec.md
- commands/opencode/sai-2-design.md
- commands/opencode/sai-3-implement.md
- GLOSSARY.md
- openspec/specs/progress-plan-declaration/spec.md
- openspec/specs/progress-event-lifecycle/spec.md
- openspec/specs/coordinator-progress-ownership/spec.md
- openspec/specs/progress-harness-bindings/spec.md
- openspec/specs/progress-minimum-threshold/spec.md
- openspec/specs/design-coordinator/spec.md
- openspec/specs/design-planning-worker/spec.md
- openspec/specs/implementation-coordinator/spec.md
- openspec/specs/implementation-planning-worker/spec.md
- openspec/specs/implementation-harness-bindings/spec.md
- openspec/specs/worker-lifecycle-protocol/spec.md
- openspec/specs/update-active-specs/spec.md
- openspec/changes/archive/2026-08-08-command-progress-plan-protocol/proposal.md
- openspec/changes/archive/2026-08-03-route-sai-1-spec-through-coordinator-worker/specs/spec-coordinator/spec.md
- openspec/changes/archive/2026-08-03-route-sai-1-spec-through-coordinator-worker/specs/spec-proposal-worker/spec.md
- openspec/changes/archive/2026-08-03-route-sai-1-spec-through-coordinator-worker/specs/spec-harness-bindings/spec.md
- test/spec-coordinator-worker.test.js
- test/implement-coordinator-worker.test.js
- test/design-coordinator-worker.test.js

**External URLs**: none.

## Additional Notes

- The spec phase plan has exactly three steps — at the minimum-threshold boundary of `sai/policies/todo-structure.md`, so it renders as a task list on both harnesses. The implementation plan has five steps.
- First-run skip precedent: on a first run, `sai-3-implement` Step 1 ("Simplify existing implementation.md") is skipped entirely. Following the slice-1 fast-track skip-fold rule, the skipped `plan-simplification` id folds into the next completed batch with no separate `skipped` field.
- Feedback turns emit no progress events: after a `completed` result the spec worker is continued for artifact feedback, but no plan step completes during a feedback turn, so no progress event is emitted (same behavior as the design worker).
- `spec-coordinator` and `spec-proposal-worker` are delta-only capability specs (the `route-sai-1-spec-through-coordinator-worker` change never synced them to `openspec/specs/`). This change extends the deltas; the sync decision is unchanged and remains an apply/archive-time concern.
- The routed path gains a live task list that the inline path never had. The `spec-behavioral-parity` pinned categories (artifact sets, summary, feedback gate, completion message) are unaffected; the task list is a routed-surface presentation addition, matching the design path, which has no inline counterpart.
- Implementation plans differ from design/spec plans in that no approval gate exists: the specs approval gate lives in `/sai-2-design`, so neither the spec nor the implementation plan carries a `specs-approval` step.
