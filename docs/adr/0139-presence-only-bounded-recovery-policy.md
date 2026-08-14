# ADR 0139: Use a presence-only policy for bounded worker recovery

## Status

Accepted

## Context

Routed phase adapters need a way to opt into same-worker recovery without allowing each phase to define its own retry count, eligible failures, acknowledgements, or stopping rules. A configurable policy object would make those lifecycle semantics phase-specific and could fragment the shared command runner.

## Decision

Add the optional phase-adapter declaration `recovery_policy: true`. Treat it only as an immutable invocation-level opt-in marker. Keep the attempt pool, eligible failure classes, continuation acknowledgement, and stopping behavior fixed in `sai/command-runner.md`.

## Alternatives Considered

- **A configurable policy object** — rejected because it would invite phase-specific budgets and routing semantics.
- **An empty policy object** — rejected because it adds structure without information.
- **A presence-only boolean marker** (chosen) — keeps adapter intent explicit while preserving one shared lifecycle contract.

## Consequences

- Adapters can opt in without redefining recovery behavior.
- Non-overview failures remain ineligible until the shared contract explicitly adds them.
- Changing the fixed recovery semantics remains a shared-runner decision rather than a phase-local edit.

## Provenance

User — `openspec/changes/bounded-worker-recovery/design.md`, Decision 1.
