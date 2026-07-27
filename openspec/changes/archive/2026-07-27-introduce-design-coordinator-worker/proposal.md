**Complexity**: high

## Why

The interactive `/sai-2-design` workflow currently combines conversational control, technical reasoning, codebase research, and artifact writes in one context. Splitting it into a thin coordinator and a dedicated design worker prepares the phase for future complexity-based effort selection while preserving its existing user-visible workflow and durable OpenSpec artifacts.

## What Changes

- Route Claude Code and opencode `/sai-2-design` invocations through a conversational coordinator that performs no OpenSpec, codebase, or artifact I/O and makes no technical design decisions, using a worker preflight notice to preserve prerequisite-before-fast-track-banner ordering.
- Add a design worker that owns prerequisites, change selection, specs approval checks and amendments, codebase research, technical decisions, generation and verification of `design.md`, `tasks.md`, and `interfaces.md`, and lifecycle payload authorship.
- Reuse the worker lifecycle protocol established by `introduce-implement-coordinator-worker`, including binding-owned continuation metadata, same-worker continuation, complete changed-file aggregation, collision handling, and phase outcome metadata. Extend only the design-worker fallback with coordinator-owned opaque input history and pending artifact feedback; the implemented sai-3 fallback contract remains unchanged.
- Bind Claude Code coordination to `claude-opus-4-8` at low effort and its design worker to `claude-opus-4-8` at high effort.
- Bind both opencode roles to GLM 5.2 with high reasoning through SAI-namespaced agent definitions.
- Preserve GitHub Copilot's inline design path and document that no portable cross-turn coordinator-worker continuation contract is available across its supported surfaces.
- Preserve specs approval, amendment handling, Open Questions, artifact feedback, `--fast-track`, Stop/Continue navigation, summaries, and continue-now implementation planning behavior through an explicit resolved-change envelope handed to the established implementation worker binding.
- Keep Proposal Complexity descriptive; this change does not use it to select a worker or effort level.

## Capabilities

### New Capabilities

- `design-coordinator`: Defines the conversational control plane, I/O prohibition, relay behavior, fast-track announcement and feedback-presentation state, lifecycle result handling, and navigation authority for routed design invocations.
- `design-planning-worker`: Defines the technical execution plane that owns design prerequisites, research, decisions, artifact writes, artifact verification, feedback application, and lifecycle payloads.
- `design-harness-bindings`: Defines Claude Code and opencode coordinator-worker bindings, SAI-namespaced definitions, collision-safe installation ownership, and the Copilot inline compatibility boundary.
- `design-behavioral-parity`: Preserves the current observable `/sai-2-design` artifact, approval, amendment, feedback, fast-track, summary, and continuation semantics across routed and inline paths.

### Modified Capabilities

- `worker-lifecycle-protocol`: Generalizes the lifecycle established by `introduce-implement-coordinator-worker` so design workers use the same statuses, phase outcome metadata, binding-owned continuation metadata, complete changed-file aggregation, and same-worker continuation, with a design-scoped opaque-input and pending-feedback fallback extension rather than a second protocol.
- `design-subagent-delegation`: Moves design-time technical I/O ownership from the interactive main agent and its single research subagent to the dedicated design worker while keeping the coordinator entirely outside codebase and artifact I/O.
- `deduplicate-sai-2-design`: Splits the shared design command into routed coordinator and preserved inline entry paths while retaining one caller-neutral design workflow contract.
- `artifact-feedback-gate`: Preserves the shared gate as the presentation source of truth while keeping `/sai-1-spec`'s inline proposal/spec feedback consumer unchanged.

## Impact

- Shared command and instruction surfaces: `sai/commands/sai-2-design.md`, `sai/commands/sai-2-design-inline.md`, `sai/instructions/design-invocation-core.md`, `sai/instructions/design-worker.md`, `sai/instructions/design.md`, and `sai/instructions/artifact-feedback-gate.md`.
- Harness wrappers and bindings: `commands/claude/sai-2-design.md`, `commands/opencode/sai-2-design.md`, `commands/copilot/sai-2-design.prompt.md`, `agents/claude/sai-design-planning-worker.md`, `skills/claude/sai-design-planning-worker/SKILL.md`, `skills/opencode/sai-design-planning-worker/SKILL.md`, and `configs/opencode.jsonc`.
- Installation, diagnostics, tests, and documentation: `bin/install-flow.js`, `bin/uninstall-flow.js`, `bin/doctor.js`, `test/`, `README.md`, `AGENTS.md`, `INSTALL.claude.md`, `INSTALL.opencode.md`, and coordinator-worker ADR documentation under `docs/adr/`.
- Existing OpenSpec design artifact schemas remain unchanged; no external dependency or API is introduced.
- This change depends architecturally on `introduce-implement-coordinator-worker` and must reuse its lifecycle vocabulary and continuation rules.

## Proposal Research Documentation

**Local files**: `GLOSSARY.md`; `sai/commands/sai-2-design.md`; `sai/instructions/design.md`; `sai/instructions/change-picker.md`; `sai/instructions/artifact-feedback-gate.md`; `sai/instructions/implement-invocation.md`; `commands/claude/sai-2-design.md`; `commands/opencode/sai-2-design.md`; `commands/copilot/sai-2-design.prompt.md`; `openspec/specs/design-subagent-delegation/spec.md`; `openspec/specs/deduplicate-sai-2-design/spec.md`; `openspec/specs/sai-fast-track-flag/spec.md`; `openspec/changes/introduce-implement-coordinator-worker/proposal.md`; `openspec/changes/introduce-implement-coordinator-worker/design.md`; `openspec/changes/introduce-implement-coordinator-worker/interfaces.md`; `openspec/changes/introduce-implement-coordinator-worker/implementation.md`; `openspec/changes/introduce-implement-coordinator-worker/specs/**/*.md`; `sai/commands/sai-3-implement.md`; `sai/commands/sai-3-implement-inline.md`; `sai/instructions/implement-invocation-core.md`; `sai/instructions/implement-worker.md`; `skills/claude/sai-implementation-planning-worker/SKILL.md`; `skills/opencode/sai-implementation-planning-worker/SKILL.md`; `agents/claude/sai-implementation-planning-worker.md`; `configs/opencode.jsonc`; `bin/install-flow.js`; `bin/uninstall-flow.js`; `bin/doctor.js`; `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`; `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`; `docs/adr/0076-resume-worker-before-durable-reconstruction.md`; `docs/adr/0077-harness-specific-worker-bindings.md`.

**External URLs**: None.

## Additional Notes

- The coordinator is a conversational control plane; durable design state remains in OpenSpec artifacts written by the worker.
- Worker identifiers are invocation-scoped coordinator state. Design-only opaque input history, pending feedback, and feedback-presentation counters are additionally scoped to the current design lifecycle and are never persisted as workflow state or carried into implementation planning.
- Feedback should continue the same worker when possible so technical ownership remains coherent; a replacement worker reconstructs from durable artifacts when continuation is unavailable.
- Proposal Complexity remains descriptive in this slice and must not influence coordinator or worker selection.
