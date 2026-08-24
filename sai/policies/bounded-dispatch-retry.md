# Bounded Dispatch Retry

Shared policy for retrying failed harness-native subagent/task dispatches.
It is fetched by every surface that dispatches tier subagents
(`budget-explorer`, `budget-subagent`, `budget-executor`, or a
generator/audit subagent dispatched through the harness-native mechanism).
This policy closes a real gap: transport-class dispatch failures (for example
a harness-reported `network_error`) previously had no contracted handling.

## Scope

- **In scope** — the dispatch operation itself: the harness-native call that
  starts a delegated tier subagent fails before that subagent performs any
  work.
- **Out of scope** — anything returned by a subagent that actually started,
  and all phase-worker lifecycle recovery. A closed result of any kind is
  never retried under this policy; worker-result failure routing remains
  exclusively owned by `@sai/policies/bounded-recovery.md` and the shared
  command runner's replacement fallback, neither of which this policy alters.

## Eligible failure classes (transport-class only)

Retry ONLY when the evidence shows the dispatch never started or was lost at
the transport layer before any agent activity:

- a harness-native transport error class (for example `network_error`);
- an infrastructure-side rejection of the dispatch call that is transient
  (service unavailable, rate-limit shutdown of the transport);
- a dispatch timeout with zero observable agent activity.

Everything else is NOT retryable here: a returned `failed` / `cancelled`
envelope, any semantic verdict or partial report, a precondition halt relayed
by the subagent, and malformed-but-delivered output. Those follow the calling
surface's existing handling.

## Budget and mechanics

1. Each logical dispatch operation gets exactly one initial attempt plus at
   most TWO retries — three attempts total, a finite budget.
2. Every retry re-issues the IDENTICAL prompt through the identical binding
   and identical output contract. Never widen, "improve", or re-scope the
   prompt to work around the failure.
3. Announce each retry in conversation text in one line naming the failure
   class and the attempt ordinal (`retry 1 of 2`, `retry 2 of 2`).
4. On exhaustion, report the concrete failure (class, attempts made) and
   continue with the calling surface's existing failure handling. Never
   fabricate, synthesize, or assume a result.
5. Retry accounting is conversation-only invocation state; it is never
   persisted to artifacts, `.openspec.yaml`, configuration, or worker
   payloads, and it never enters a worker journal or changed-files union.
