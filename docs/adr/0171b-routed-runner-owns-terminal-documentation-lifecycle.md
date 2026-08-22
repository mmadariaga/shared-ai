# ADR 0171b: Routed runner owns the terminal documentation lifecycle

## Status

Accepted

## Context

The active `/sai-4-apply` implementation is a routed card set. The retired monolithic apply instruction still contains historical terminal behavior, while `sai/commands/apply/runner.md` is the executable source for Step execution, coordinator verification, gates, appendices, and terminal navigation. Restoring the lifecycle in more than one card would create competing authorities.

## Decision

Keep the complete coordinator-owned terminal lifecycle in `sai/commands/apply/runner.md`. After the Final sweep, that source performs the single learnings promotion pass, evaluates the terminal documentation set, discloses visibility, applies commit policy and session authorization, commits the exact eligible paths, and reaches MANDATORY STOP. `coordinator.md` and `invocation.md` retain handoff and standalone-shell references without becoming alternative executable authorities.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Restore the lifecycle only in the retired monolithic instruction | Reuses historical wording quickly | Bypasses the active routed source |
| Duplicate the lifecycle in every apply card | Makes each card appear self-contained | Creates competing terminal authorities and drift |
| Delegate terminal work to RED or GREEN workers | Reduces coordinator prose | Violates coordinator ownership and worker Git prohibitions |
| Keep one lifecycle in the routed runner (chosen) | Preserves one active, auditable source and the coordinator boundary | Requires explicit handoff wording in sibling cards |

## Consequences

- Both supported harnesses continue to select the same routed coordinator and shared runner contract.
- Terminal promotion, visibility, authorization, staging, and commit behavior can be contract-tested against one active source.
- The retired instruction remains historical and cannot silently become executable authority.
- Future terminal-lifecycle changes must update the runner and its focused contract tests together.

## Provenance

codebase-forced — `openspec/changes/restore-apply-documentation-commit/design.md`, Decision 1.
