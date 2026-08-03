**Complexity**: high (5 capabilities, no breaking change)

## Why

The `/sai-1-spec` command currently combines lifecycle control, argument handling, spec authoring, summary generation, and feedback handling in one inline body, leaving no dispatch seam for supervised pipeline execution. Splitting it along the established `sai-2-design` boundary now provides a reusable shared invocation core while preserving the existing spec-phase behavior across Claude Code, opencode, and GitHub Copilot.

## What Changes

- Extract the spec-phase technical work into a shared invocation core consumed by the inline caller and the routed spec worker.
- Add a lifecycle-only spec coordinator for Claude Code and opencode that dispatches and supervises one routed spec worker.
- Add a spec-proposal worker contract and Claude Code/opencode worker bindings based on the existing orchestration lifecycle and design-worker patterns.
- Repoint the Claude Code and opencode `/sai-1-spec` wrappers to the coordinator while leaving the Copilot wrapper unchanged.
- Preserve the existing proposal/spec artifacts, decision-summary rules, artifact feedback gate, and exact mandatory stop message.

## Capabilities

### New Capabilities

- `spec-coordinator`: Lifecycle-only coordinator for routed `/sai-1-spec` execution.
- `spec-proposal-worker`: Routed worker that owns spec authoring and returns closed lifecycle payloads.
- `spec-harness-bindings`: Claude Code and opencode bindings for dispatching and continuing the spec worker.
- `spec-behavioral-parity`: Observable behavior preservation between routed and inline callers, verified through same-harness parity.

### Modified Capabilities

- `command-wrappers`: Preserve the existing wrapper loading, model-routing, and single-wrapper requirements while routing Claude Code and opencode `/sai-1-spec` through the coordinator.

## Impact

- `sai/commands/sai-1-spec.md`
- `sai/commands/spec/invocation.md`
- `sai/commands/spec/coordinator.md`
- `sai/orchestration/workers/sai-1-spec-proposal-worker.md`
- `sai/orchestration/workers/bindings/claude/spec-worker.md`
- `sai/orchestration/workers/bindings/opencode/spec-worker.md`
- `skills/claude/sai-1-spec-proposal-worker/SKILL.md`
- `skills/opencode/sai-1-spec-proposal-worker/SKILL.md`
- `agents/claude/sai-1-spec-proposal-worker.md`
- `commands/claude/sai-1-spec.md`
- `commands/opencode/sai-1-spec.md`
- `sai/install-manifest.json`
- `README.md`
- `AGENTS.md`

The change introduces no external dependency, changes no public artifact schema, and does not modify the Copilot wrapper or add a routed Copilot worker path.

## Proposal Research Documentation

**Local files**:

- `sai/commands/sai-1-spec.md`
- `sai/commands/design/invocation.md`
- `sai/commands/design/coordinator.md`
- `sai/orchestration/coordinator-contract.md`
- `sai/orchestration/worker-lifecycle.md`
- `sai/orchestration/workers/sai-2-design-worker.md`
- `sai/orchestration/workers/bindings/claude/design-worker.md`
- `sai/orchestration/workers/bindings/opencode/design-worker.md`
- `skills/claude/sai-2-design-worker/SKILL.md`
- `skills/opencode/sai-2-design-worker/SKILL.md`
- `agents/claude/sai-2-design-worker.md`
- `sai/install-manifest.json`
- `commands/claude/sai-1-spec.md`
- `commands/opencode/sai-1-spec.md`
- `commands/copilot/sai-1-spec.prompt.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/schemas/sai-workflow/templates/proposal.md`
- `openspec/schemas/sai-workflow/templates/specs.md`
- `openspec/specs/spec-quality/spec.md`
- `README.md`
- `AGENTS.md`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The existing phase-neutral coordinator contract and worker lifecycle contract remain the source of truth; this change adds only the spec-phase adapter and projections needed to use them.
- The shared invocation core remains caller-neutral and is fetched by the unchanged Copilot wrapper through `sai/commands/sai-1-spec.md`.
- Routed coordinators must not read or edit technical artifacts. The worker owns proposal/spec authoring, glossary updates permitted by the spec phase, artifact verification, feedback edits, and worker-authored summaries.
- `/sai-1-spec` remains spec-only: `proposal.md` and `specs/**/*.md` are written, followed by the feedback gate; `design.md`, `tasks.md`, and implementation artifacts remain out of scope.
