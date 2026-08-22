# ADR 0160a: Apply Known-False Report Recovery branches by locus with five-part recovery content

## Status

Accepted

## Context

Apply's Known-False Report Recovery continued only the same GREEN worker and had no cause-locus branch, no RED continuation, no duplicate-diagnosis stop, and no bounded owner repair for plan defects. RED false reports could not recover in-scope under the prior GREEN-only path.

## Decision

Keep Apply's five-part recovery payload (`Reported`, `Evidence`, `Cause`, `Correction`, `Verification`) and extend Known-False Report Recovery to:

- in-scope → same authorized RED or GREEN worker via `continue_after_recovery`, one attempt per new diagnosis key
- out-of-scope → zero worker attempts; optional single bounded plan-artifact repair or named hand-back
- unresolved → zero attempts; human hand-back with no locus claim

RED continuation retains blindness and test/stub scope. GREEN continuation retains the absolute test/interface prohibition. Multiple contradictions in one report aggregate into one continuation.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Locus-branched RED|GREEN recovery (chosen) | Matches E4/E5/E12/E13; preserves blindness | More coordinator branching |
| GREEN-only recovery forever | Smaller card diff | RED false reports cannot recover |
| Fresh recovery worker | Clean session | Retired Recovery Dispatch pattern |

## Consequences

- Same-worker is the only correction channel for in-scope Apply recovery.
- Plan defects may use the bounded repair route (ADR 0161a) instead of burning worker slots.
- Shared three-slot ledger remains undoubled across RED and GREEN.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D5
- ADR 0161a — Bounded plan-artifact repair
- ADR 0159a — Three-slot distinct-diagnosis ledger
