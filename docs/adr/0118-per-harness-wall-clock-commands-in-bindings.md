# ADR 0118: Per-harness wall-clock commands live in the harness bindings, never in the neutral policy

<!-- adr-index: refs 0077 -->

## Status

Superseded by [DDR 0141](../ddr/0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on.md)

## Context

The milestone stamp is a wall-clock HH:mm value acquired with at most one shell call per render act, and the two supported harnesses expose different native shells — bash on Claude Code, PowerShell on opencode. The stamp semantics are single-sourced in `sai/policies/todo-structure.md` (DDR 0112), so a reader of the policy needs to know where the command that acquires the time is defined.

## Decision

Each of the six worker bindings names its own wall-clock command — `date +%H:%M` in the three Claude Code bindings (bash), `Get-Date -Format "HH:mm"` in the three opencode bindings (PowerShell) — while `sai/policies/todo-structure.md` defines the stamp semantics without naming any per-harness command. This mirrors the neutral-installed-binding doctrine of `progress-harness-bindings` and the harness-mechanics-in-harness-surface precedent of ADR 0077: harness tool mechanics stay in the harness surface.

## Alternatives Considered

- **Name both commands in the neutral policy** — rejected: it would make the neutral policy harness-aware and break its harness-neutrality contract.
- **Name a single portable command** — rejected: there is none that is native to both bash and PowerShell on both harnesses.

## Consequences

The bindings remain the only surface naming a wall-clock command, so a new harness must add its own command in its binding while the policy stays untouched; the policy's harness-neutrality contract is preserved across the install surface. The decision encodes a mechanism of the install surface, not a domain invariant, which is why this record is an ADR.

## Provenance

Derived — the neutral-policy/binding split follows the existing harness-neutrality and neutral-installed-binding doctrines. Recorded as Decision 4 in `design.md` with the `adr` family marker.

## Related

- `docs/adr/0077-harness-specific-worker-bindings.md` — harness mechanics (model and continuation, here wall-clock commands) stay in the harness-specific bindings.
