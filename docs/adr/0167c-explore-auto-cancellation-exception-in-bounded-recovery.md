# ADR 0167c: Named Explore Auto cancellation exception in Bounded Recovery

<!-- adr-index: amends 0158b; refs 0159a -->

## Status

Accepted

## Context

Bounded Recovery in `sai/orchestration/command-runner.md` treats `cancelled` as a clean zero-attempt stop that never enters diagnosis or recovery. That default correctly protects standalone adapters, Build, the manual review loop, and outer user cancellation. Explore Auto item 10 already has user authorization for delegated supervision via the crystallization-close selector, so a supervised phase-worker `cancelled` inside that active route is pipeline incompletion rather than a fresh user stop decision. Without a named exception, Explore cannot run one diagnosis after cancel without forking a second recovery contract or widening generic cancellation recovery.

## Decision

Extend the existing Bounded Recovery cancellation branch with a narrowly scoped exception only:

- Predicate: selector-dispatched Explore Auto item 10 ∧ post-resolution supervised phase-worker `status: cancelled` ∧ phase conversation-only `diagnosis_rounds.<phase> === 0`.
- Effect: permit exactly one Explore Diagnosis Round and at most one same-worker re-dispatch; never a replacement worker; never a shared three-slot ledger spend for this exception.
- Default preserved: `cancelled` outside that predicate remains a clean stop with zero recovery or diagnosis attempts.

Do not restate the full failed/disproved-completed/STOP trigger set, five-section hand-back, or ledger accounting inside Explore — reference Bounded Recovery as the single source.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Named Explore exception in Bounded Recovery (chosen) | One source; preserves clean-cancel elsewhere | Exception wording must stay narrow |
| Fork Explore-only recovery document | Localizes Explore prose | Duplicates trigger/hand-back; drifts from adapters |
| Make cancellation recoverable generically | Simpler single rule | Breaks clean-stop for standalone, Build, manual |

## Consequences

- Structural tests must pin both ordinary clean-cancel and the named Explore exception.
- Explore item-10 activation prose references this section rather than inventing a second generic contract.
- Undeliverable same-worker continuation after Explore diagnosis records `continuation/transport loss` without replacement dispatch.

## Related

- `openspec/changes/diagnosis-driven-recovery-supervised-explore/design.md` — Decision D1
- ADR 0158b — Shared non-clean-closure diagnosis lives in the command runner
- ADR 0159a — Recovery budget is a three-slot distinct-diagnosis ledger
