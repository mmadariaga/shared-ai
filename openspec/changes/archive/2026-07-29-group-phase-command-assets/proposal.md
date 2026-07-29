**Complexity**: high (broad path, projection, test, and documentation alignment; no behavior change)

## Why

The active design and implementation invocation assets are phase-specific but currently split between `sai/commands/` and the historical `sai/compat/` bucket, making ownership and runtime fetch paths difficult to discover. Grouping each phase's coordinator and caller-neutral invocation loader under a phase-named package makes the source layout explicit while preserving workflow behavior and removing an unused legacy projection.

## What Changes

- Move the design coordinator body and invocation core to `sai/commands/design/coordinator.md` and `sai/commands/design/invocation.md`.
- Move the implementation coordinator body and invocation core to `sai/commands/implement/coordinator.md` and `sai/commands/implement/invocation.md`.
- Update Claude Code, opencode, and GitHub Copilot-compatible fetch paths, routed workers, inline orchestration, install projections, tests, and maintained documentation to use the phase packages.
- Retire the unreferenced `sai/compat/implement-invocation.md` asset and its projection after confirming that no supported runtime caller consumes it.
- Retire the superseded managed projections for the old design coordinator, implementation coordinator, and both old phase invocation cores with hash-safe cleanup that preserves locally modified installed files.
- Preserve `sai/compat/_templates/adr-index.md`, the technical phase instructions, generated artifact contracts, workflow ordering, and user-visible command behavior.

## Capabilities

### New Capabilities

- `phase-command-packages`: Organize design and implementation coordinator and invocation assets into phase-named source packages.
- `phase-caller-alignment`: Keep all supported harness callers, projections, tests, and documentation aligned with the phase package paths.
- `legacy-invocation-retirement`: Remove the unused implementation invocation asset and projection without adding a compatibility shim.

### Modified Capabilities

<!-- Existing capabilities whose requirements are changing. Leave empty if none. -->

## Impact

**Source layout and orchestration**:

- `sai/commands/sai-2-design.md`
- `sai/commands/sai-3-implement.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/design/invocation.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/implement/invocation.md`
- `sai/compat/sai-2-design-core.md`
- `sai/compat/sai-3-implementation-core.md`
- `sai/compat/implement-invocation.md`
- `sai/orchestration/inline-invocation.md`
- `sai/orchestration/workers/sai-2-design-worker.md`
- `sai/orchestration/workers/sai-3-implementation-worker.md`
- `sai/orchestration/workers/bindings/claude/design-worker.md`
- `sai/orchestration/workers/bindings/claude/implementation-worker.md`
- `sai/orchestration/workers/bindings/opencode/design-worker.md`
- `sai/orchestration/workers/bindings/opencode/implementation-worker.md`
- `sai/install-manifest.json`
- `bin/install-manifest.js`
- `bin/install-flow.js`
- `bin/uninstall-flow.js`
- `bin/doctor.js`

**Harness callers and fixtures**:

- `commands/claude/sai-2-design.md`
- `commands/claude/sai-3-implement.md`
- `commands/opencode/sai-2-design.md`
- `commands/opencode/sai-3-implement.md`
- `commands/copilot/sai-2-design.prompt.md`
- `commands/copilot/sai-3-implement.prompt.md`
- `skills/claude/sai-2-design-worker/SKILL.md`
- `skills/claude/sai-3-implementation-worker/SKILL.md`
- `skills/opencode/sai-2-design-worker/SKILL.md`
- `skills/opencode/sai-3-implementation-worker/SKILL.md`
- `agents/claude/sai-2-design-worker.md`
- `agents/claude/sai-3-implementation-worker.md`
- `fixtures/implementation-adapter.js`
- `fixtures/implementation-completion-step-4.js`

**Tests and maintained documentation**:

- `test/design-coordinator-worker.test.js`
- `test/implement-coordinator-worker.test.js`
- `test/implementation-adapter-step-1.test.js`
- `test/implementation-completion-step-4.test.js`
- `test/implementation-harness-bindings-step-2.test.js`
- `test/implementation-harness-bindings-step-3.test.js`
- `test/inline-coordinator-adapter-step-1.test.js`
- `test/install-manifest.test.js`
- `test/install-claude.test.js`
- `test/install-opencode.test.js`
- `test/orchestration-source-layout-step-2.test.js`
- `test/orchestration-source-layout-step-6.test.js`
- `test/doctor-retirement-step-5.test.js`
- `AGENTS.md`
- `README.md`
- `INSTALL.claude.md`
- `INSTALL.opencode.md`
- `INSTALL.copilot.md`
- `docs/adr/0088-implementation-harness-projection-boundaries.md`
- `docs/adr/0090-centralize-copilot-inline-planning-lifecycle.md`
- `openspec/specs/orchestration-source-layout/spec.md`
- `openspec/specs/implementation-coordinator/spec.md`
- `openspec/specs/implementation-harness-bindings/spec.md`
- `openspec/specs/inline-coordinator-adapter/spec.md`
- `openspec/specs/design-coordinator/spec.md`
- `openspec/specs/deduplicate-sai-2-design/spec.md`
- `openspec/specs/extract-bodies/spec.md`
- `openspec/specs/design-phase-navigation/spec.md`
- `openspec/specs/harness-coordination-parity/spec.md`

No new dependency, API, schema, generated artifact, or workflow phase is introduced. The existing `sai/compat/_templates/adr-index.md` asset is explicitly outside this change.

Managed installation must include nested files under `sai/commands/design/` and `sai/commands/implement/` for Claude Code, opencode, and GitHub Copilot, and retirement must not delete an installed legacy file whose contents no longer match the managed projection.

## Proposal Research Documentation

**Local files**: The repository source, caller, projection, fixture, test, documentation, ADR, and active specification paths listed under **Impact** were inspected for current ownership, fetch paths, supported harness boundaries, and legacy references.

**External URLs**: None.

## Additional Notes

- The current supported Copilot runtime uses `sai/orchestration/inline-invocation.md`; it does not consume `sai/compat/implement-invocation.md`.
- Claude Code and opencode retain routed worker bindings; GitHub Copilot remains inline without a routed worker binding.
- `sai/instructions/design.md` and `sai/instructions/implement.md` remain the technical phase instructions loaded by the new invocation files.
- Historical archived changes may retain old paths; stale references in supported current projections and runtime callers must not remain.
- The four superseded managed paths are `sai/commands/sai-2-design.md`, `sai/commands/sai-3-implement.md`, `sai/compat/sai-2-design-core.md`, and `sai/compat/sai-3-implementation-core.md`; their installed destinations require hash-safe retirement.
