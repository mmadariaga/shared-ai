**Complexity**: high

## Why

The shared Orchestration Core now defines the lifecycle mechanics used by routed planning phases, but `/sai-3-implement` still needs an explicit, phase-owned integration contract that makes implementation the second consumer without inheriting design-only behavior. This change completes that boundary while preserving the durable implementation-planning and harness behavior on which downstream application depends.

## What Changes

- Route the Claude Code and opencode `/sai-3-implement` paths through the shared coordinator lifecycle and an implementation-specific phase adapter.
- Keep prerequisite checks, change selection, technical research, planning decisions, and authorized artifact writes inside the implementation-planning worker.
- Preserve `implementation.md` as the authoritative durable artifact, including task order, RED -> GREEN planning, verification, human-check encoding, STOP & COMMIT markers, rerun behavior, interface conformance, audit ingestion, and ADR/DDR handling.
- Require durable verification before the worker can report completion and keep lifecycle payloads limited to status metadata rather than artifact content.
- Project the implementation worker contract and the Claude Code/opencode bindings through the managed installation manifest while preserving all collision, drift, ownership, doctor, and uninstall safeguards.
- Keep GitHub Copilot on the existing inline implementation path with equivalent observable planning behavior and the exact mandatory completion message.
- Keep implementation completion semantics separate from design feedback, notice, and continue-now semantics; shared lifecycle mechanics do not merge phase policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `implementation-coordinator`: Require the routed implementation coordinator to consume the shared lifecycle contract through an implementation-only adapter, with no design-only extensions or duplicated lifecycle mechanics.
- `implementation-planning-worker`: Define implementation-specific policy ownership and the complete durable `implementation.md` verification gate required before completion.
- `implementation-behavioral-parity`: Pin the planning, verification, STOP & COMMIT, ADR/DDR, no-execution, completion-message, and mandatory-stop behavior preserved across routed and inline paths.
- `implementation-harness-bindings`: Require deterministic Claude Code and opencode worker-binding projections while retaining installer safeguards and the explicit inline Copilot boundary.

## Impact

- Coordinator and worker contracts: `sai/commands/sai-3-implement.md`, `sai/orchestration/workers/implementation-worker.md`.
- Routed bindings: `sai/orchestration/workers/bindings/claude/implementation-worker.md`, `sai/orchestration/workers/bindings/opencode/implementation-worker.md`.
- Runtime forwarding surfaces: `skills/claude/sai-implementation-planning-worker/SKILL.md`, `skills/opencode/sai-implementation-planning-worker/SKILL.md`.
- Managed projections: `sai/install-manifest.json` and the existing installer, doctor, and uninstall consumers.
- Verification coverage: `test/implement-coordinator-worker.test.js`, `test/install-manifest.test.js`, `test/install-claude.test.js`, and `test/install-opencode.test.js`.
- No application or production implementation is executed by this change phase, no OpenSpec artifact schema changes, and no new external dependency is introduced.

## Proposal Research Documentation

**Local files**: `GLOSSARY.md`; `sai/commands/sai-2-design.md`; `sai/commands/sai-3-implement.md`; `sai/commands/sai-3-implement-inline.md`; `sai/instructions/design.md`; `sai/instructions/implement.md`; `sai/compat/design-invocation-core.md`; `sai/compat/implement-invocation-core.md`; `sai/orchestration/coordinator-contract.md`; `sai/orchestration/worker-lifecycle.md`; `sai/orchestration/workers/design-worker.md`; `sai/orchestration/workers/implementation-worker.md`; `sai/orchestration/workers/bindings/claude/design-worker.md`; `sai/orchestration/workers/bindings/claude/implementation-worker.md`; `sai/orchestration/workers/bindings/opencode/design-worker.md`; `sai/orchestration/workers/bindings/opencode/implementation-worker.md`; `commands/claude/sai-3-implement.md`; `commands/opencode/sai-3-implement.md`; `commands/copilot/sai-3-implement.prompt.md`; `sai/install-manifest.json`; `bin/install-manifest.js`; `openspec/changes/archive/2026-07-28-extract-sai-orchestration-core/design.md`; `openspec/changes/archive/2026-07-28-extract-sai-orchestration-core/interfaces.md`; `openspec/specs/orchestration-core/spec.md`; `openspec/specs/orchestration-source-layout/spec.md`; `openspec/specs/implementation-coordinator/spec.md`; `openspec/specs/implementation-planning-worker/spec.md`; `openspec/specs/implementation-behavioral-parity/spec.md`; `openspec/specs/implementation-harness-bindings/spec.md`; `docs/adr/0079-design-worker-notices-and-reconstruction-metadata.md`; `docs/adr/0080-design-to-implementation-lifecycle-boundary.md`; `docs/adr/0083-shared-coordinator-mechanics-through-phase-adapters.md`; `test/implement-coordinator-worker.test.js`; `test/install-manifest.test.js`; `test/install-claude.test.js`; `test/install-opencode.test.js`.

**External URLs**: None.

## Additional Notes

- The dependency extraction already established the canonical Orchestration Core paths and some implementation-facing forwarding structure. This change specifies the implementation consumer boundary rather than reopening the core design.
- Implementation completion is terminal and does not reuse design feedback or notice semantics.
- `implementation.md` remains the cross-phase source of truth; lifecycle payloads report metadata and changed paths only.
- The existing inline Copilot path is an intentional harness adapter boundary, not evidence that Copilot lacks subagent support.
