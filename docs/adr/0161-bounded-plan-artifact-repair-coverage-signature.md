# ADR 0161: Bounded coordinator-owned plan-artifact repair with Coverage Signature

## Status

Accepted

## Context

The triggering incident was an impossible current-Step verification assertion in `implementation.md` (Step 2 asserted a wrapper inventory only Step 3 creates). Always handing back is safe but slow; allowing coordinator edits of tests or verification scripts collapses verification authority.

## Decision

When the exact cause is an impossible current-Step verification assertion in `implementation.md`, the apply coordinator may perform at most one segment-local repair that:

- edits only that current-Step plan-artifact assertion
- preserves Step structure, checkbox semantics, plan-level file scope, worker prohibitions, and Coverage Signature
- does not execute verification as part of the write
- does not edit production, test, interface, verification-run, or other artifacts
- does not spend a worker-recovery attempt
- adds `implementation.md` once to the invocation changed-files union as a coordinator-owned repair

Coverage Signature is the ordered list of checklist entry tuples (`ordinal`, `command_tokens`, `repo_relative_paths`, `selector`, `assertion_operator`, `assertion_target`, `pass_observation`) plus a separate producer-reference list. Equivalence requires identical signature tuples and exactly one producer-reference change from a named impossible later-Step point to an existing current-Step point. A second plan defect in the same segment uses unresolved human hand-back.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| One bounded plan repair with Coverage Signature (chosen) | Fixes inventory-class defects without weakening verification | Mechanical signature comparison required |
| Always hand back plan defects | No silent plan mutation | Slow for safely auto-repairable cases |
| Allow coordinator to edit tests/verification scripts | Broader auto-fix | Collapses verification authority |
| Unlimited plan repairs per segment | Convenience | Unbounded silent plan mutation |

## Consequences

- Independent coordinator verification remains separate and authoritative after any repair write.
- Non-equivalent Coverage Signature → unresolved human hand-back, not a forced repair.
- One repair per segment cap is intentional; multi-repair policy is deferred.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D6
- ADR 0160 — Known-False Report Recovery branches by locus
