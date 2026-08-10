# DDR 0125: Overview generation preserves its lifecycle and result envelope

## Status

Accepted

## Context

Change Overview generation already uses the design worker's materialization, stale-state, reconciliation, and exactly-once regeneration lifecycle. Its budget-routed generator also returns a closed five-field result envelope consumed by both harnesses.

## Decision

Overview language is added as invocation-scoped generator input without changing lifecycle ownership, state transitions, single-file write scope, or the generator result fields `status`, `changed_files`, `validation`, `contradiction_details`, and `failure_kind`. The design worker remains the only owner of overview state transitions, and the generator remains the only writer of `change-overview.md`.

## Alternatives Considered

- **Add language to the generator result envelope** — rejected: the parent does not need to persist or route the rendering choice after the transaction, and the change would break the existing closed contract.
- **Move overview ownership to the coordinator** — rejected: it would split lifecycle authority and create cross-harness compatibility risk.

## Consequences

The new language value travels through the existing worker-owned generation continuation, while all failure, retry, stale-state, and write-scope behavior remains unchanged. This is a DDR because a generated projection must retain one authoritative lifecycle and closed result contract at all times.

## Provenance

Codebase-forced — the existing overview lifecycle and five-field generator contract are authoritative compatibility constraints.
