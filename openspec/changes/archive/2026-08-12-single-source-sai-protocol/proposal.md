**Complexity**: medium

## Why

The seven routed phase coordinators duplicate the shared result-loop, lifecycle outcome, reconstruction, changed-file, and progress-event protocol, which makes equivalent behavior harder to maintain consistently. Single-sourcing that machinery now removes the lowest-risk duplication while preserving each phase's adapter-specific gates, progress plan, and terminal navigation.

## What Changes

- Replace repeated coordinator protocol prose with references to the shared Orchestration Core contracts.
- Preserve each phase coordinator's adapter fields, including its progress plan, artifact-gate parameters, phase-specific options, and terminal navigation.
- Preserve the existing Isolation Mode and MANDATORY STOP literals exactly.
- Keep Claude Code and opencode behavior aligned through the same shared coordinator bodies; do not change manifest projections.

## Capabilities

### New Capabilities

- `coordinator-protocol-single-source`: routed coordinators reference one shared lifecycle and result-loop protocol instead of restating closed outcomes, changed-file union, reconstruction fields, and progress-event handling.

### Modified Capabilities

- None.

## Impact

- `sai/commands/spec/coordinator.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/security/coordinator.md`
- `sai/commands/performance/coordinator.md`
- `sai/commands/accessibility/coordinator.md`
- No new dependencies, manifest projection changes, or artifact-path changes.

## Proposal Research Documentation

**Local files**:

- `sai/orchestration/coordinator-contract.md` — shared result-loop and coordinator protocol.
- `sai/orchestration/worker-lifecycle.md` — closed payload shapes, reconstruction journal rules, and progress-event semantics.
- `sai/orchestration/workers/sai-1-spec-proposal-worker.md` — spec-worker lifecycle and spec-only artifact scope.
- `sai/commands/spec/coordinator.md` — current per-phase protocol restatement.
- `sai/commands/design/coordinator.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/security/coordinator.md`
- `sai/commands/performance/coordinator.md`
- `sai/commands/accessibility/coordinator.md` — routed adapter comparisons.
- `openspec/specs/worker-lifecycle-protocol/spec.md` — canonical lifecycle ownership and progress mechanics.
- `test/spec-coordinator-worker.test.js` and install tests — routed worker, harness parity, and projection constraints.

**External URLs**: None.

## Additional Notes

- The shared contracts already define the lifecycle machinery; this change relocates coordinator wording rather than changing its semantics.
- Phase adapters remain responsible for their own progress-plan declarations, artifact-feedback gates, phase-specific options, and terminal navigation.
- The spec phase creates only `proposal.md` and `specs/**`; design and implementation planning remain separate phases.
