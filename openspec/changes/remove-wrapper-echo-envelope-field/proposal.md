**Complexity**: high

## Why

The invocation protocol currently carries the same user request twice: once as `wrapper_echo_value` and again as `arguments_value`. The picker already treats `arguments_value` as authoritative, so the wrapper field is inert transport that keeps boot adapters, coordinators, workers, bindings, tests, and documentation describing a larger protocol than the behavior requires. Removing it now eliminates stale-source ambiguity and gives both supported harnesses one canonical argument path.

## What Changes

- **BREAKING** Remove `wrapper_echo_value` from the standalone `InvocationEnvelope`; retain `command_name` for card selection and `arguments_value` for the complete opaque request.
- Update Claude Code and opencode wrappers, boot adapters, routed coordinators, utility cards, worker contracts, binding templates, continuations, and replacement reconstruction to pass only the remaining argument value.
- Preserve byte-for-byte argument forwarding, command-local flag parsing, `--supervised` marker grammar, change-picker fallback behavior, lifecycle payloads, and continuation ownership.
- Replace every wrapper-echo precedence, opaque-forwarding, and two-string-envelope assertion in active instructions, policies, specifications, tests, and installation projections with the single-argument contract.
- Keep the change spec-only: no production implementation, installer execution, or generated harness projection is performed by this phase.

## Capabilities

### New Capabilities

- `single-string-invocation-envelope`: Defines the canonical command and worker envelope after removal of `wrapper_echo_value`, including both harnesses, routed phases, utility cards, supervision, continuations, and reconstruction.

### Modified Capabilities

- `command-wrapper-body`: Change the wrapper envelope from three keys to `command_name` plus `arguments_value`, including the body-shape census.
- `opencode-change-arg-passthrough`: Remove the opencode wrapper echo field while preserving `$ARGUMENTS` forwarding and label-free wrappers.
- `thin-wrappers`: Remove wrapper-echo variance from the shared wrapper skeleton and examples.
- `worker-dispatch-prompt-template`: Pass the single argument envelope opaquely to worker bindings.
- `change-picker`, `status-picker`, and `envelope-only-card-resolution`: Treat the only supplied request as `arguments_value` and preserve their existing fallback and panel behavior.
- `planning-artifact-review-loop` and `supervised-pipeline-forwarding`: Carry supervision markers only inside `arguments_value`.
- `progress-plan-declaration`, `spec-progress-plan`, and `implement-progress-plan`: Keep progress plans out of the now-single-string worker envelope.
- `design-planning-worker`, `design-coordinator`, `implementation-coordinator`, `implementation-planning-worker`, `review-phase-coordinator`, `review-phase-worker`, and `review-worker-installation`: Align routed worker input, parsing, and reconstruction with the narrowed envelope.
- `apply-boot-rerouting`, `apply-routed-card-set`, `design-harness-bindings`, and `sai-fast-track-flag`: Preserve phase-specific dispatch and flag behavior while removing wrapper-echo forwarding.
- `sai-build-command` and `harness-universality`: Reconcile composition envelopes and the cross-harness mirror rule with the same transport migration.
- `glossary-location`: Make the canonical `Boot Request` vocabulary update a verifiable documentation consequence without modifying the glossary during this spec run.

## Impact

The downstream implementation will modify the two supported wrapper projections (`commands/claude/` and `commands/opencode/`), the neutral `sai/` adapters, command cards, orchestration and worker bindings, active specifications, installer projections, and structural tests. It will also reconcile the root glossary's `Boot Request` definition and the historical envelope decision through a new record, without editing historical records. No dependency, external API, runtime service, or user-facing argument syntax is introduced; the change is an internal protocol migration and is intentionally breaking for stale envelope consumers.

## Proposal Research Documentation

**Local files**:

- `AGENTS.md`
- `GLOSSARY.md`
- `sai/adapters/claude/boot.md`
- `sai/adapters/opencode/boot.md`
- `sai/orchestration/command-runner.md`
- `sai/commands/spec/worker.md`
- `sai/commands/spec/coordinator.md`
- `sai/commands/spec/launcher.md`
- `commands/claude/sai-1-spec.md`
- `.opencode/commands/sai-1-spec.md`
- `openspec/specs/command-wrapper-body/spec.md`
- `openspec/specs/opencode-change-arg-passthrough/spec.md`
- `openspec/specs/worker-dispatch-prompt-template/spec.md`
- `openspec/specs/change-picker/spec.md`
- `openspec/specs/envelope-only-card-resolution/spec.md`
- `openspec/specs/supervised-pipeline-forwarding/spec.md`
- `openspec/specs/progress-plan-declaration/spec.md`
- `openspec/specs/spec-proposal-worker/spec.md`
- `openspec/specs/design-coordinator/spec.md`
- `openspec/specs/implementation-coordinator/spec.md`
- `openspec/specs/review-phase-coordinator/spec.md`
- `openspec/specs/review-phase-worker/spec.md`
- `openspec/specs/review-worker-installation/spec.md`
- `openspec/specs/apply-boot-rerouting/spec.md`
- `openspec/specs/apply-routed-card-set/spec.md`
- `openspec/specs/design-harness-bindings/spec.md`
- `openspec/specs/sai-fast-track-flag/spec.md`
- `openspec/changes/archive/2026-08-21-envelope-only-change-name-resolution/proposal.md`
- `docs/adr/0166-envelope-only-change-name-resolution.md`
- `test/command-launcher-card.test.js`
- `test/build-coordinator.test.js`
- `test/design-coordinator-worker.test.js`

**External URLs**: None.

## Additional Notes

- `command_name` remains boot-adapter-owned card-selection metadata; it is not worker request content.
- `arguments_value` remains opaque to boot adapters and is interpreted only by the selected command card or phase worker according to its existing grammar.
- The prior envelope-only resolution change intentionally retained `wrapper_echo_value`; this change reverses that transport decision because the field is no longer consumed by any supported resolution path.
- The two-string worker-runner contract is addressed as instruction-level orchestration in `sai/orchestration/command-runner.md`, not as a delta to `openspec/specs/orchestration-core`; that capability does not own the field being removed.
- Historical ADRs and archived changes remain immutable. Any replacement ADR/DDR classification is a downstream design decision, not a spec-phase artifact.
