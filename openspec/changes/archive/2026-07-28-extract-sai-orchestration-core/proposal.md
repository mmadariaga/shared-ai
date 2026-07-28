**Complexity**: high

## Why

Coordinator and worker files currently mix reusable lifecycle mechanics with phase-specific policy, making either phase risky to migrate independently. This behavior-preserving refactor establishes a stable orchestration seam and canonical source layout before further orchestration changes.

## What Changes

- Establish `sai/orchestration/` as the canonical source for the shared coordinator contract and shared worker lifecycle contract.
- Establish canonical `workers/` and `workers/bindings/` locations under the orchestration source, while retaining separate design and implementation worker phase contracts.
- Keep task-only phase instructions in `sai/instructions/`, move policy-only reusable guidance to `sai/policies/`, and move compatibility loaders and path-sensitive compatibility assets to `sai/compat/` so each source category has one purpose.
- Relocate Claude and opencode worker bindings to canonical harness-specific binding sources while retaining their existing runtime skill surfaces.
- Keep `agents/claude/` as the Claude runtime agent surface and keep GitHub Copilot on its existing inline execution path.
- Update routed callers and installation/documentation surfaces to consume the canonical sources without changing effective instructions, lifecycle payloads, artifact schemas, gates, continuation behavior, or user-visible command behavior; source paths and forwarding composition MAY change.
- Do not merge the design and implementation workers or introduce orchestration abstractions beyond the coordinator and worker lifecycle seams.

## Capabilities

### New Capabilities

- `orchestration-core`: Defines the shared coordinator and worker-lifecycle contracts that routed planning phases reuse while leaving phase policy in separate worker contracts.
- `orchestration-source-layout`: Defines canonical orchestration, worker, binding, instruction, policy, and compatibility locations plus the manifest-driven runtime projections that consume them.

### Modified Capabilities

- `worker-lifecycle-protocol`: Makes the existing protocol explicitly phase-neutral and canonical at the shared lifecycle seam while preserving all current statuses, metadata, continuation, fallback, and reconstruction behavior.

## Impact

- Canonical sources: `sai/orchestration/`, `sai/orchestration/workers/`, `sai/orchestration/workers/bindings/`, `sai/instructions/`, `sai/policies/`, `sai/compat/`, and `sai/install-manifest.json`.
- Routed command callers: `sai/commands/sai-2-design.md` and `sai/commands/sai-3-implement.md`.
- Inline command callers: `sai/commands/sai-2-design-inline.md` and `sai/commands/sai-3-implement-inline.md` remain behaviorally unchanged while their task/policy imports move to canonical paths.
- Harness surfaces: `skills/claude/`, `skills/opencode/`, `agents/claude/`, `commands/claude/`, `commands/opencode/`, and `commands/copilot/`.
- Managed installation and validation surfaces may require path-manifest updates: `bin/install-flow.js`, `bin/uninstall-flow.js`, and `bin/doctor.js`.
- Documentation and contract references: `AGENTS.md`, `README.md`, and relevant tests that assert installed content or fetched paths.
- No dependency, artifact-schema, command-interface, or user-visible workflow change.

## Proposal Research Documentation

**Local files**: `GLOSSARY.md`; `AGENTS.md`; `sai/commands/sai-2-design.md`; `sai/commands/sai-3-implement.md`; `sai/commands/sai-2-design-inline.md`; `sai/commands/sai-3-implement-inline.md`; `sai/instructions/design-invocation-core.md`; `sai/instructions/implement-invocation-core.md`; `sai/instructions/design-worker.md`; `sai/instructions/implement-worker.md`; `skills/claude/sai-design-planning-worker/SKILL.md`; `skills/claude/sai-implementation-planning-worker/SKILL.md`; `skills/opencode/sai-design-planning-worker/SKILL.md`; `skills/opencode/sai-implementation-planning-worker/SKILL.md`; `agents/claude/sai-design-planning-worker.md`; `agents/claude/sai-implementation-planning-worker.md`; `openspec/specs/worker-lifecycle-protocol/spec.md`; `openspec/specs/implementation-coordinator/spec.md`; `openspec/specs/design-coordinator/spec.md`; `openspec/specs/implementation-planning-worker/spec.md`; `openspec/specs/design-planning-worker/spec.md`; `openspec/specs/implementation-harness-bindings/spec.md`; `openspec/specs/harness-universality/spec.md`; `openspec/specs/artifact-feedback-gate/spec.md`; `openspec/specs/opencode-change-arg-passthrough/spec.md`; `openspec/changes/archive/2026-07-27-introduce-implement-coordinator-worker/proposal.md`; `openspec/changes/archive/2026-07-27-introduce-design-coordinator-worker/proposal.md`; `openspec/changes/archive/2026-05-18-deduplicate-sai-2-design/specs/design-instruction/spec.md`.

**External URLs**: None.

## Additional Notes

- The workers are phase policies over a shared lifecycle, not conditional branches of one merged worker prompt.
- `skills/` and `agents/` remain harness runtime surfaces; `sai/orchestration/` becomes the canonical source from which those surfaces are installed or fetched.
- Compatibility loaders and assets move to `sai/compat/`; their callers SHALL migrate atomically so no compatibility shim remains in task-only `sai/instructions/`.
- Each harness receives its allowlisted canonical sources in its managed SAI root. Runtime skills and Claude agents remain thin forwarding manifests that resolve those installed sources rather than duplicate their contract prose.
- `sai/install-manifest.json` defines the per-harness source-to-runtime allowlists consumed by installer, doctor, and uninstall; doctor verifies missing, unexpected, and drifted projections, while uninstall retains locally modified managed files under the existing hash safeguards.
- Existing design-only notice, feedback, approval, and reconstruction extensions remain design policy. Existing implementation-only prerequisite, ADR/DDR, RED-to-GREEN planning, and artifact-verification rules remain implementation policy.
