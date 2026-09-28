# ADR 0173a: Dual-canonical instruction sources with no synchronization mechanism

<!-- adr-index: refs 0172c -->

## Status

Superseded — `sai/commands/implement/instructions.md` is retired; `sai/commands/implement/steps/` is the sole implement instruction source.

## Context

The `/sai-3-implement` step-gated instruction delivery experiment carves the worker's instruction mass into per-progress-plan-step files under `sai/commands/implement/steps/`, making that library the worker-canonical rule home for the step-gated flow. `sai/commands/implement/instructions.md` remains as a cited reference (for example `sai/commands/review/` and `sai/commands/implement/steps/plan-generation.md`). Two canonical sources therefore describe the same phase policy — `steps/` for the step-gated worker, `instructions.md` as a cited reference — with no mechanism keeping them in sync.

## Decision

Keep both sources. `sai/commands/implement/steps/` is the worker-canonical rule home under the experiment; `sai/commands/implement/instructions.md` stays as a cited reference. No synchronization mechanism is built; divergence between the two sources is accepted as experiment scope.

## Alternatives Considered

- **Migrating `/sai-4-apply` off `instructions.md`** — rejected: touches a second consumer contract and is out of scope for a single-phase experiment.
- **Building a sync mechanism between `steps/` and `instructions.md`** — rejected for experiment scope; divergence is accepted while the experiment runs.

## Consequences

- Superseded outcome: the dual-source risk was resolved by retiring `instructions.md` (install manifest retirement `retired-sai-3-implement-instructions`) and repointing every citation to the step library.

- Dual-canonical source risk between `steps/` and `instructions.md` persists while the experiment runs.
- Rollback is removing the `step_pointer_map` declaration from the implement coordinator card; the step files simply stop being delivered and `instructions.md` remains as a cited reference, untouched.
- Refs ADR 0172c (the `/sai-1-spec` step-gated experiment this change replicates).

## Related

- ADR 0172c — Step-gated instruction delivery hands each spec step its instructions just-in-time
- `openspec/changes/implement-step-gated-instructions/` — the change that introduced the step library
