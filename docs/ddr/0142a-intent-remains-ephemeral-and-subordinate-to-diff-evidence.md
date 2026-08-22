# DDR 0142a: Backfill intent remains ephemeral and subordinate to verified diff evidence

## Status

Accepted

## Context

`/sai-backfill` now accepts an optional user statement of intent so it can
reconcile the user's explanation with an already-selected implementation diff.
The statement may contain capabilities, constraints, boundaries, or rejected
alternatives, but it is supplied after implementation and cannot independently
prove what the code does. Persisting the statement or treating it as equivalent
to the diff would make a post-hoc explanation look like implementation evidence.

## Decision

The backfill flow SHALL keep the raw statement and its worker-authored
reconciliation context only in the current conversation and worker state. The
selected diff remains the verified source of implementation evidence. Intent
may explain matched behavior or a deliberately confirmed boundary, but
unconfirmed claims, omissions, rejected alternatives, and unsupported gaps
remain non-normative and are never copied into the change directory.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Persist the raw statement | Improves traceability | Adds a persistence format and exposes conversational text as durable evidence |
| Merge every stated capability into the generated spec | Captures more of the user's explanation | Invents normative requirements that the diff does not substantiate |
| Keep intent ephemeral and subordinate to the diff (chosen) | Preserves evidence-grounded artifacts while enabling reconciliation | Loses raw-statement traceability after the invocation |

## Consequences

- Backfilled proposal and capability specs remain grounded in verified code evidence.
- Conflict scanning can use the statement during the invocation without creating a second durable source of truth.
- Confirmed preservation can qualify an evidence-backed boundary, while unsupported intent remains visible only through the conversational flow.
- No migration is required because raw or parsed intent is never persisted.
