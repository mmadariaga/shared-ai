**Complexity**: medium (2 capabilities, no breaking artifact-schema change)

## Why

The routed design and implementation planning phases duplicate coordinator configuration even though they share the same primary model, reasoning level, and lifecycle role. Consolidating that control-plane profile while retaining phase-specific workers reduces configuration and installation maintenance without changing phase behavior or artifact contracts.

## What Changes

- Define one shared `sai-coordinator` primary profile for routed planning in opencode; Claude Code keeps its wrapper-session coordinator model/effort settings and only aligns managed worker names.
- Rename routed phase workers to `sai-2-design-worker` and `sai-3-implementation-worker` across opencode bindings and Claude Code managed worker definitions.
- Rename shared technical worker cores by phase, preserving separate design and implementation contracts.
- Rename the shared invocation cores and update every routed and Copilot inline caller that fetches them.
- Migrate old managed worker identities only after ownership-hash verification, preserving modified or user-owned definitions and sidecars.
- Update installer projections, manifest metadata, doctor/uninstall handling, documentation, and tests to assert the new identities.
- Preserve the shared coordinator lifecycle contract, `subagent_depth: 2`, Copilot's inline carve-out, artifact schemas, and phase behavior.

## Capabilities

### New Capabilities

### Modified Capabilities
- `design-coordinator`: use the shared routed coordinator profile and the phase-specific design worker identity while preserving the design lifecycle contract.
- `implementation-coordinator`: use the shared routed coordinator profile and the phase-specific implementation worker identity while preserving the implementation lifecycle contract.

## Impact

- Affected configuration and routing: `configs/opencode.jsonc`, `sai/orchestration/coordinator-contract.md`, `sai/orchestration/worker-lifecycle.md`.
- Affected phase cores and bindings: `sai/compat/`, `sai/orchestration/workers/`, `sai/orchestration/workers/bindings/`.
- Affected forwarding and inline callers: `sai/commands/sai-2-design-inline.md`, `sai/commands/sai-3-implement-inline.md`, `commands/copilot/`, and the Claude Code/opencode worker forwarding skill directories and fetch references.
- Affected managed projections: `agents/claude/`, `sai/install-manifest.json`, `bin/install-flow.js`, `bin/doctor.js`, `bin/uninstall-flow.js`.
- Affected verification and documentation: `test/design-coordinator-worker.test.js`, `test/implement-coordinator-worker.test.js`, `test/install-*.test.js`, `test/doctor-*.test.js`, `test/uninstall-*.test.js`, `README.md`, `INSTALL.opencode.md`, `INSTALL.claude.md`, `AGENTS.md`.
- No new external dependency is introduced and no artifact schema or generated-artifact location changes.

## Proposal Research Documentation

**Local files**: `configs/opencode.jsonc`; `sai/orchestration/coordinator-contract.md`; `sai/orchestration/worker-lifecycle.md`; `sai/orchestration/workers/design-worker.md`; `sai/orchestration/workers/implementation-worker.md`; `sai/orchestration/workers/bindings/claude/`; `sai/orchestration/workers/bindings/opencode/`; `agents/claude/`; `sai/install-manifest.json`; `bin/install-flow.js`; `bin/doctor.js`; `bin/uninstall-flow.js`; `test/design-coordinator-worker.test.js`; `test/implement-coordinator-worker.test.js`; `INSTALL.opencode.md`; `INSTALL.claude.md`; `README.md`; `AGENTS.md`; `GLOSSARY.md`; `openspec/specs/design-coordinator/spec.md`; `openspec/specs/implementation-coordinator/spec.md`.

**External URLs**: None.

## Additional Notes

- The shared coordinator is a primary control-plane profile, not a subagent; it receives the union of both routed phase workers' permissions.
- Design and implementation workers remain separate because their lifecycle events, permissions, artifacts, and phase policies differ.
- Shared technical cores are named by phase because Claude Code, opencode, and VS Code consume those reusable cores through different bindings; all three caller paths are updated in this change.
- Copilot remains inline and receives no routed coordinator or worker projection.
