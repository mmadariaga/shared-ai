# DDR 0147: Structured spec research closes at the shared confidence boundary before proposal generation

## Status

Accepted

## Context

The spec worker performs structured research before it generates `proposal.md`, but the progress plan previously made that work invisible. Some requests arrive with a `Ready to Propose` handoff and Research Leads, while ordinary requests do not. Treating the handoff as sufficient would make the visible research milestone depend on request shape and would replace independent investigation with upstream guidance.

## Decision

Every resolved spec request completes the structured research act only after reaching the existing approximately 80% confidence boundary, whether or not a `Ready to Propose` handoff is present. Research Leads are additive starting points that the worker confirms and extends. The worker reports the canonical `research` progress step after the startup handshake and before proposal generation; because this act writes no file, its progress event may carry an empty `changed_files` list.

## Alternatives Considered

- **Report research only for ordinary requests** — rejected: progress would vary with the presence of a handoff instead of describing the phase's invariant work.
- **Treat Research Leads as completed research** — rejected: supplied leads do not establish the worker's independent confidence boundary.
- **Fold research into startup or proposal generation** — rejected: both choices hide the work the new milestone is intended to expose.

## Consequences

The spec plan has a predictable research milestone for every request and preserves the same evidence threshold across handoff and ordinary paths. The worker incurs an explicit progress round trip even when research produces no file, and coordinators must accept the empty changed-file delta. This is a durable property of the planning workflow, so it is recorded as a DDR.

## Provenance

User — the decision and its alternatives were settled in Decision 2 of `openspec/changes/progress-plan-step-legibility/design.md`.
