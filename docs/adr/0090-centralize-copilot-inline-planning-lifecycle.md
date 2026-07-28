# ADR 0090: Centralize Copilot inline planning lifecycle in one adapter

<!-- adr-index: refs 0089; refs 0083; refs 0078; refs 0074 -->

## Status

Accepted

## Context

The Copilot entrypoints for `/sai-2-design` and `/sai-3-implement` execute inline because no portable routed continuation contract spans the supported VS Code surfaces. Their separate inline command bodies repeat caller-side phase dispatch, prerequisite, feedback, and completion behavior around caller-neutral technical cores. That duplication can drift while Claude Code and opencode continue to use the routed Orchestration Core and harness-specific worker bindings.

## Decision

Use one Copilot-only Inline Coordinator Adapter at `sai/orchestration/inline-invocation.md`. It accepts the exact `phase:` and `arguments:` envelope, rejects unsupported phases before phase processing, owns each inline phase's caller lifecycle, and invokes the existing `sai-2-design-core` or `sai-3-implementation-core` for technical planning.

Keep the visible Copilot prompts and retained inline command files as thin phase-selecting entrypoints. Install the adapter through one managed, non-recursive Copilot projection. Do not project it into Claude Code or opencode, and do not introduce routed worker identifiers, continuation state, or `subagent_depth` into the inline path.

## Alternatives Considered

- **Keep separate inline lifecycle bodies** - preserves the current file boundaries but leaves shared behavior duplicated and vulnerable to drift.
- **Merge caller lifecycle into the technical phase cores** - removes the inline duplication but makes caller-neutral cores own harness navigation and phase boundaries.
- **Centralize caller lifecycle in one Copilot-only adapter** (chosen) - shares the inline boundary while preserving separate technical cores and routed harness behavior.

## Consequences

- Copilot design and implementation planning share one strict inline envelope and lifecycle owner.
- The phase cores remain technical invocation shells reusable by inline and routed workers.
- Copilot installation gains one orchestration-path file without receiving routed coordinator, worker, or binding contracts.
- Structural and manifest tests must pin phase dispatch, mandatory stops, and projection isolation.

## Related

- `openspec/changes/share-vscode-inline-coordinator/design.md` - Decision D2
- `docs/adr/0089-shared-sai-coordinator-profile.md`
- `docs/adr/0083-shared-coordinator-mechanics-through-phase-adapters.md`
- `docs/adr/0078-design-workflow-selects-routed-or-inline-entry.md`
- `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`
