**Complexity**: high (9 capabilities, no breaking change, no new dependency)

## Why

No SAI surface defines a task-list convention today — a search across `sai/` returns zero references to any harness task tool — so every routed agent improvises progress presentation. The coordinator is phase-blind by contract (`sai/orchestration/coordinator-contract.md:44-45`), while the worker that knows the phases runs in its own context, so neither side alone can produce a useful live task list. This change introduces a harness-neutral progress-plan protocol and proves it end-to-end on `/sai-2-design`.

## What Changes

- The phase adapter of a routed command MAY declare a static, ordered progress plan (`progress_plan`) alongside the closed phase-adapter field set at `sai/orchestration/coordinator-contract.md:34-42`. Step ids are canonical per phase — the phase's worker contract and the adapter declare identical ids — so the two-string invocation envelope stays closed; the coordinator renders the declared plan as a live task list at dispatch.
- An additive, non-terminal progress event (`event: progress`, `step_ids: string[]`, `changed_files`), structurally modelled on the design notice; the worker reports completed step ids in batches, the coordinator marks them, and resumes the same worker with the fixed protocol value `continue_after_progress`.
- The coordinator owns the plan in invocation-scoped state, marks steps only from event `step_ids`, never derives, infers, or extends the plan, and retains the plan and marked set across same-worker continuation and replacement-worker reconstruction. Progress-event `changed_files` feed the invocation-scoped changed-file union in first-seen order; rendered states derive deterministically from plan order plus the marked set; the list is rendered in full at dispatch and reconciled at terminal results.
- The `/sai-2-design` adapter SHALL declare a canonical four-step plan (`prereqs-resolution`, `specs-approval`, `research`, `artifacts`), mirrored by the design worker contract, making the end-to-end proof non-vacuous.
- Per-harness emission behind one shared semantic policy (`sai/policies/todo-structure.md`, new): Claude Code incremental task calls; opencode `todowrite` full-array replacement with `pending` / `in_progress` / `completed` states and a constant priority.
- A minimum threshold of three declared steps, fixed in the neutral policy, below which no list is rendered on either harness.
- New domain terms appended to `GLOSSARY.md` (Progress Plan, Progress Step, Progress Event).
- No **BREAKING** changes; no new dependency; the four audit workers' payload validation is untouched.

## Capabilities

### New Capabilities

- `progress-plan-declaration`: the static, ordered progress plan as a new phase-adapter field with canonical per-phase step ids (worker contract and adapter mirror them); the coordinator never derives or extends it.
- `progress-event-lifecycle`: the additive, non-terminal progress event carrying `step_ids: string[]`, modelled on the design notice, with its fixed continuation value.
- `coordinator-progress-ownership`: the coordinator holds the authoritative plan in invocation-scoped state, marks steps from events, unions progress-event changed files, derives rendered states deterministically, reconciles the list at terminal results, and survives replacement-worker reconstruction.
- `progress-harness-bindings`: per-harness emission — Claude Code incremental task calls, opencode `todowrite` full-array replacement — behind one shared semantic policy.
- `progress-minimum-threshold`: no list is rendered below three steps, fixed in the neutral policy so both harnesses behave identically.

### Modified Capabilities

- `orchestration-core`: the shared phase-adapter field enumeration gains the progress plan declaration; the shared contract loop gains progress-event handling.
- `worker-lifecycle-protocol`: gains the additive design-scoped progress event extension alongside the notice.
- `design-coordinator`: gains plan rendering and step marking; the coordinator body's "Notices are the only allowed nonterminal extension" admits progress events.
- `design-planning-worker`: the design worker gains progress-event emission after change resolution, using only declared step ids.

## Impact

Affected files:

- `sai/orchestration/coordinator-contract.md` — new `progress_plan` phase-adapter field, progress-event handling, marking and rendering rules, and the changed-file union's non-reset enumeration extended to progress events.
- `sai/orchestration/worker-lifecycle.md` — additive progress event shape (no closed payload reshaped).
- `sai/commands/design/coordinator.md` — design adapter SHALL declare the canonical four-step plan; coordinator renders/marks; the notices line admits progress.
- `sai/orchestration/workers/sai-2-design-worker.md` — progress-event emission contract.
- `sai/orchestration/workers/bindings/claude/design-worker.md` — incremental task-call emission.
- `sai/orchestration/workers/bindings/opencode/design-worker.md` — `todowrite` full-array emission.
- `sai/policies/todo-structure.md` — new single-source neutral task-list policy including the minimum threshold.
- `GLOSSARY.md` — new domain terms appended.
- `openspec/specs/orchestration-core/spec.md`, `openspec/specs/worker-lifecycle-protocol/spec.md`, `openspec/specs/design-coordinator/spec.md`, `openspec/specs/design-planning-worker/spec.md` — synced when the change is applied.

No install-manifest change: `sai-policies` and orchestration projections are recursive, and both design-worker bindings already project to the single harness-neutral installed path (`sai/orchestration/workers/bindings/design-worker.md`).

Systems: Claude Code task tool (incremental updates) and opencode `todowrite` (full-array replacement).

## Proposal Research Documentation

**Local files**:

- sai/orchestration/coordinator-contract.md
- sai/orchestration/worker-lifecycle.md
- sai/orchestration/workers/sai-2-design-worker.md
- sai/orchestration/workers/bindings/claude/design-worker.md
- sai/orchestration/workers/bindings/opencode/design-worker.md
- sai/commands/design/coordinator.md
- sai/commands/design/invocation.md
- sai/install-manifest.json
- sai/policies/remember.md
- sai/policies/question-context.md
- sai/policies/prereqs.md
- sai/policies/glossary-format.md
- sai/instructions/spec.propose.md
- GLOSSARY.md
- openspec/specs/orchestration-core/spec.md
- openspec/specs/worker-lifecycle-protocol/spec.md
- openspec/specs/design-coordinator/spec.md
- openspec/specs/design-planning-worker/spec.md
- openspec/specs/design-harness-bindings/spec.md
- openspec/specs/sai-status-progress-panel/spec.md
- openspec/specs/implementation-progress-tracking/spec.md

**External URLs**: none.

## Additional Notes

- opencode tool surface confirmed by proof of concept: `todowrite`, single `todos` array, full replacement, states `pending` / `in_progress` / `completed`. Panel rendering and exact call shape still warrant a spike before wiring — a candidate Open Question for `/sai-2-design` (resolved there: the design wires from the proof-of-concept contract — see `design.md` OQ1 resolution; no further spike required).
- The resume token follows the notice precedent: the notice's fixed protocol value `continue_after_notice` gets a progress sibling `continue_after_progress`; like the notice acknowledgement, it is protocol-only and excluded from opaque history, pending feedback, and user-answer handling.
- `worker-lifecycle.md` is shared by seven workers, so the change is strictly additive; payload validation for the review, security, performance, and accessibility workers remains unchanged.
- Steps skipped under fast-track are reported inside the completed batch (a separate `skipped` field is deferred until the simple form proves insufficient) and render as completed under their declared labels — the list cannot distinguish skipped from done, which is slightly imprecise and accepted.
- Terminal reconciliation on a `completed` result renders every unmarked step as completed, an inference of completion the worker never reported — the same class of accepted imprecision as the skip-fold note above: the list cannot distinguish worker-confirmed steps from steps reconciled on close. Accepted because a `completed` run closes successfully and the list's final state is all-completed by design.
- The worker never authors steps: it reports only the canonical step ids its phase contract declares, so the plan itself stays coordinator-owned and the two-string invocation envelope stays closed.
- Each progress batch costs one worker→coordinator→worker round trip; batching reduces the count but does not eliminate the cost.
