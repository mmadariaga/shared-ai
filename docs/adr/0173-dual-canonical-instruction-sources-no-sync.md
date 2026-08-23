# ADR 0173: Dual-canonical instruction sources with no synchronization mechanism

<!-- adr-index: refs 0172 -->

## Status

Accepted

## Context

The `/sai-3-implement` step-gated instruction delivery experiment carves the worker's instruction mass into per-progress-plan-step files under `sai/commands/implement/steps/`, making that library the worker-canonical rule home for the step-gated flow. `sai/commands/implement/instructions.md` (and `invocation.md`) remain byte-for-byte untouched because `/sai-4-apply` still consumes them. Two canonical sources therefore describe the same phase policy — `steps/` for the step-gated worker, `instructions.md`/`invocation.md` for the apply consumer — with no mechanism keeping them in sync.

## Decision

Keep both sources. `sai/commands/implement/steps/` is the worker-canonical rule home under the experiment; `sai/commands/implement/instructions.md` and `invocation.md` stay byte-for-byte untouched for `/sai-4-apply`. No synchronization mechanism is built; divergence between the two sources is accepted as experiment scope.

## Alternatives Considered

- **Migrating `/sai-4-apply` off `instructions.md`** — rejected: touches a second consumer contract and is out of scope for a single-phase experiment.
- **Building a sync mechanism between `steps/` and `instructions.md`** — rejected for experiment scope; divergence is accepted while the experiment runs.

## Consequences

- Dual-canonical source risk between `steps/` and `instructions.md` persists while the experiment runs.
- Rollback is removing the `step_pointer_map` declaration from the implement coordinator card; the step files simply stop being delivered and `instructions.md`/`invocation.md` remain authoritative for apply, untouched.
- Refs ADR 0172 (the `/sai-1-spec` step-gated experiment this change replicates).

## Related

- ADR 0172 — Step-gated instruction delivery hands each spec step its instructions just-in-time
- `openspec/changes/implement-step-gated-instructions/` — the change that introduced the step library
