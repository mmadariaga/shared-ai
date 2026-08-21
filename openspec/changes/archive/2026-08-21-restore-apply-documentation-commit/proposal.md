**Complexity**: medium (2 modified capabilities, 10 delta requirements, no breaking change)

## Why

The routed `/sai-4-apply` card set no longer executes the coordinator-owned learnings promotion and terminal documentation commit that its active contracts still require. Restoring those operations in `runner.md` prevents ADRs, DDRs, indexes, learnings, and glossary changes from being left uncommitted after an otherwise completed apply run while preserving the existing authorization and halted-run boundaries.

## What Changes

- Restore the once-per-run learnings promotion pass in the routed apply runner, after the Final sweep and before terminal navigation.
- Restore the coordinator-owned terminal documentation commit using the exact eligible path set: changed `docs/**`, `SAI_LEARNINGS.md` written by the current promotion pass, and changed root `GLOSSARY.md`.
- Preserve terminal visibility disclosure, commit-message policy, session authorization, `--fast-track`, decline, no-op, and pre-Final-sweep halt semantics.
- Keep per-Step field-8 staging separate from the terminal documentation set and exclude OpenSpec artifacts and unrelated working-tree paths without a broad staging fallback.
- Add focused contract tests that protect the routed source, path boundaries, lifecycle ordering, and both harness projections.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sai-learnings-promotion`: restore its executable routed-runner lifecycle, terminal documentation path selection, visibility, authorization, and halted-run behavior.
- `apply-routed-card-set`: make `runner.md` the active source for promotion and terminal documentation operations and add parity-focused contract coverage.

## Impact

- `sai/commands/apply/runner.md` — restore coordinator-owned promotion and terminal documentation commit execution.
- `sai/commands/apply/coordinator.md` — preserve and expose the terminal lifecycle handoff and existing session authorization semantics.
- `sai/commands/apply/invocation.md` — retain the existing terminal gate and fast-track contract references.
- `openspec/specs/sai-learnings-promotion/spec.md` — maintain the normative promotion and terminal path contract against the routed implementation.
- `openspec/specs/apply-routed-card-set/spec.md` — define the routed runner authority and contract-test coverage.
- `test/apply-routed-architecture.test.js` — add structural coverage for lifecycle ordering, exclusions, and worker boundaries.
- `test/apply-coordinator-verification.test.js` — add focused terminal path-selection and authorization assertions where appropriate.
- Claude Code and opencode boot projections — verify both select the same routed apply coordinator and shared runner source.

## Proposal Research Documentation

**Local files**:

- `sai/commands/apply/runner.md` — current routed execution authority and missing terminal sections
- `sai/commands/apply/coordinator.md` — coordinator-owned lifecycle and terminal navigation
- `sai/commands/apply/invocation.md` — prerequisite, commit authorization, and fast-track contracts
- `sai/commands/apply/red-worker.md` — RED worker boundary and Git prohibition
- `sai/commands/apply/green-worker.md` — GREEN worker boundary and Git prohibition
- `openspec/specs/sai-learnings-promotion/spec.md` — normative promotion, terminal commit, visibility, and halt requirements
- `openspec/specs/apply-coordinator-ownership/spec.md` — coordinator ownership and commit boundaries
- `openspec/specs/apply-routed-card-set/spec.md` — routed card-set contract
- `openspec/specs/commit-auth-gate/spec.md` — session authorization semantics
- `openspec/specs/glossary-location/spec.md` — root glossary location
- `sai/policies/commit-rules.md` — terminal commit-message and staging policy
- `sai/policies/sai-learnings-format.md` — promotion file format and supersede behavior
- `openspec/changes/archive/2026-08-04-commit-docs-with-learnings-promotion/proposal.md` — prior terminal documentation-commit rationale
- `openspec/changes/archive/2026-08-15-sai-4-apply-routed-architecture/proposal.md` — routed apply ownership and migration boundaries
- `8892196^:sai/commands/apply/instructions.md` — historical promotion and terminal commit source
- `test/apply-routed-architecture.test.js` — routed architecture and worker-boundary contract tests
- `test/apply-coordinator-verification.test.js` — coordinator report and verification contract tests
- `GLOSSARY.md` — canonical repository terminology

**External URLs**: None.

## Additional Notes

- This is a routed-card migration restoration, not a new commit gate and not a return to the retired monolithic apply instruction card.
- The terminal set is evaluated from terminal working-tree state, so pre-existing eligible documentation remains visible and eligible.
- `openspec/changes/**`, `implementation.md`, and unrelated files remain outside the terminal set; the coordinator's changed-files union remains a separate report concern.
- RED and GREEN workers remain Git-prohibited; all promotion, visibility, authorization, staging, and commit actions stay in the coordinator.
