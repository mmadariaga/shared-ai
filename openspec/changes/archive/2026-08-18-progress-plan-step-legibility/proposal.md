**Complexity**: high

## Why

The first progress-plan label exposes internal bookkeeping instead of the user-facing prerequisite action, and sai-1's substantial research work is invisible while the worker is busy before proposal generation. Relabeling the shared planning steps and making sai-1 research explicit will make the native progress panel describe the phase's actual deliverables without changing workflow behavior.

## What Changes

- Relabel the first progress-plan step to `Check prerequisites` in the sai-1, sai-2, and sai-3 planning phases while preserving their existing step ids and order.
- Add a `research` progress step labeled `Research the change request` between `prereqs-and-change` and `proposal` in the sai-1 plan.
- Require the sai-1 worker to report completion of structured research as the new `research` progress batch, before proposal generation.
- Preserve the existing sai-2 specs-approval gate rendering while relabeling its prerequisite step; approval mechanics and persisted approval metadata do not change.
- Update the coordinator/worker contract tests and the affected capability specifications to pin the new labels, plan shape, event ordering, and unchanged lifecycle behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `spec-progress-plan`: expand the spec plan to six steps and relabel its first step.
- `spec-proposal-worker`: report the new structured-research progress batch.
- `spec-research-consumption`: make the existing approximately 80% research-confidence boundary normative for the new research step for every spec request.
- `design-coordinator`: relabel the first design progress step.
- `design-planning-worker`: mirror the relabeled design step in the worker contract.
- `implement-progress-plan`: relabel the first implementation progress step.
- `implementation-coordinator`: mirror the relabeled implementation step in coordinator behavior.
- `implementation-planning-worker`: mirror the relabeled implementation step in worker behavior.
- `implement-coordinator-worker-tests`: assert the updated implementation plan label.

## Impact

- Progress-plan declarations and worker emission contracts under `sai/commands/spec/`, `sai/commands/design/`, and `sai/commands/implement/`.
- Structural contract tests under `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`, and `test/implement-coordinator-worker.test.js`.
- Existing delta specifications under `openspec/specs/spec-progress-plan/`, `spec-proposal-worker/`, `spec-research-consumption/`, `design-coordinator/`, `design-planning-worker/`, `implement-progress-plan/`, `implementation-coordinator/`, `implementation-planning-worker/`, and `implement-coordinator-worker-tests/`.
- **Non-goal — audit progress plans**: `sai-5-review`, `sai-6-security`, `sai-7-performance`, and `sai-8-accessibility` remain unchanged. Their labels intentionally encode audit-specific completion conditions and optional gates rather than the planning-phase setup convention changed here.
- No application runtime, OpenSpec approval metadata, schema, or external dependency changes.

## Proposal Research Documentation

**Local files**: `sai/commands/spec/coordinator.md`; `sai/commands/spec/worker.md`; `sai/commands/spec/instructions.md`; `sai/commands/design/coordinator.md`; `sai/commands/design/worker.md`; `sai/commands/implement/coordinator.md`; `sai/commands/implement/worker.md`; `sai/policies/todo-structure.md`; `sai/worker-core.md`; `test/spec-coordinator-worker.test.js`; `test/design-coordinator-worker.test.js`; `test/implement-coordinator-worker.test.js`; `GLOSSARY.md`; `openspec/specs/audit-command-progress-plans/spec.md`; `openspec/specs/spec-research-consumption/spec.md`; the capability specifications named in Impact; `openspec/schemas/sai-workflow/schema.yaml`.

**External URLs**: None.

## Additional Notes

- Step ids remain stable even where their names no longer describe the label literally; event compatibility is more valuable than renaming internal identifiers.
- sai-1 research is unconditional, occurs after the startup handshake and before proposal work, and may report an empty `changed_files` list because research writes no file.
- Structured research closes at the existing approximately 80% confidence threshold, regardless of whether the request includes a Ready to Propose handoff.
- The sai-2 specs approval gate remains folded into its prerequisite step, and sai-status behavior is out of scope.
