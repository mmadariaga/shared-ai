**Complexity**: high (four audit phases, two harnesses, shared lifecycle changes)

## Why

The audit commands perform long, multi-stage workflows without exposing stable intermediate progress, while the earlier routed phases already provide execution visibility. Adding phase-specific progress plans gives users consistent visibility without changing audit analysis, authorization gates, severity vocabularies, artifacts, or terminal outcomes.

## What Changes

- Declare a canonical five-step `Progress Plan` for `sai-5-review`, `sai-6-security`, `sai-7-performance`, and `sai-8-accessibility`, with labels grounded in each command's existing workflow.
- Extend the routed worker lifecycle so each audit worker reports completed milestones through additive `Progress Event`s using canonical step ids.
- Render the same progress semantics through Claude Code task updates and opencode `todowrite`, with coordinator-only ownership, unchanged minimum-threshold behavior, and no `Milestone Stamp` annotations because the shared policy limits stamps to sai-1 through sai-3.
- Treat optional mutation analysis, SCA, diagnostics, and runtime accessibility checks as completed once their applicability gates are resolved, whether the optional work runs or is legitimately skipped.
- Reconcile successful terminal runs to a fully completed plan while preserving the existing empty-diff, no-UI, failed, cancelled, and successful terminal behavior.
- Add focused parity coverage for plan declarations, event handling, optional-step completion, terminal reconciliation, and both harness bindings.

## Capabilities

### New Capabilities

- `audit-command-progress-plans`: Provide five phase-specific progress milestones, worker reporting, optional-step reconciliation, terminal reconciliation, and native task-list rendering for the four audit commands.

### Modified Capabilities

- `progress-plan-declaration`: Extend canonical adapter and worker plan declarations to the four audit phases without changing the closed dispatch envelope or coordinator ownership.
- `progress-event-lifecycle`: Allow audit workers to emit additive progress events and define their protocol-only continuation and terminal interaction while preserving existing planning-worker behavior.
- `progress-harness-bindings`: Extend mirrored Claude Code and opencode bindings to render audit progress plans with the shared neutral policy and coordinator-only emission.

## Impact

- Audit adapters: `sai/commands/review/coordinator.md`, `sai/commands/security/coordinator.md`, `sai/commands/performance/coordinator.md`, and `sai/commands/accessibility/coordinator.md`.
- Audit worker contracts: `sai/orchestration/workers/sai-5-review-worker.md`, `sai/orchestration/workers/sai-6-security-worker.md`, `sai/orchestration/workers/sai-7-performance-worker.md`, and `sai/orchestration/workers/sai-8-accessibility-worker.md`.
- Shared lifecycle and task-list policy: `sai/orchestration/coordinator-contract.md`, `sai/orchestration/worker-lifecycle.md`, and `sai/policies/todo-structure.md`.
- Claude Code and opencode audit bindings, their projection parity tests, and new or extended coordinator-worker tests for the four phases.
- No new runtime dependency, API, artifact type, severity vocabulary, authorization rule, or Explore Idea Progress List behavior.

## Proposal Research Documentation

**Local files**: `sai/policies/todo-structure.md`; `sai/orchestration/coordinator-contract.md`; `sai/orchestration/worker-lifecycle.md`; `sai/commands/review/coordinator.md`; `sai/commands/security/coordinator.md`; `sai/commands/performance/coordinator.md`; `sai/commands/accessibility/coordinator.md`; `sai/instructions/review.md`; `sai/instructions/security.md`; `sai/instructions/performance.md`; `sai/instructions/accessibility.md`; `sai/orchestration/workers/sai-5-review-worker.md`; `sai/orchestration/workers/sai-6-security-worker.md`; `sai/orchestration/workers/sai-7-performance-worker.md`; `sai/orchestration/workers/sai-8-accessibility-worker.md`; `sai/orchestration/workers/bindings/claude/`; `sai/orchestration/workers/bindings/opencode/`; `openspec/specs/progress-plan-declaration/spec.md`; `openspec/specs/progress-event-lifecycle/spec.md`; `openspec/specs/progress-harness-bindings/spec.md`; `openspec/specs/progress-minimum-threshold/spec.md`; `test/design-coordinator-worker.test.js`; `test/implement-coordinator-worker.test.js`; `test/performance-coordinator-worker.test.js`; `test/accessibility-coordinator-worker.test.js`.

**External URLs**: None.

## Additional Notes

- The five milestones are deliberately user-facing projections: resolution, discovery/scope, primary analysis, gated analysis, and report validation/delivery, with phase-specific labels.
- Optional work remains visible as a stable milestone. A gate-resolved skip completes that milestone and does not imply that the optional tool ran.
- Audit progress plans do not receive `Milestone Stamp` annotations; both harnesses follow the shared policy's existing stamp scope for the three routed planning phases only.
- The progress plan is distinct from `sai-explore`'s `Idea Progress List`, which remains unchanged.
- This sai-1 proposal intentionally creates only `proposal.md` and `specs/**/*.md`; design and implementation planning are separate phases.
