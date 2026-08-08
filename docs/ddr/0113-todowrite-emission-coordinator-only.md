# DDR 0113: The task-list tool call originates exclusively from the coordinator session, never from a worker subagent

## Status

Accepted

## Context

opencode disables `todowrite` for subagents by default, and the worker runs as a subagent. The "natural" optimization — the worker knows which steps it completed, so let the worker publish them — would silently kill opencode support at birth.

## Decision

The task-list tool call originates exclusively from the coordinator session, never from a worker subagent. The invariant is recorded in the neutral policy `sai/policies/todo-structure.md` — the surface every binding references, so no maintainer can miss it by opening only one harness's file — and the opencode binding additionally carries the harness-specific reason (tool disabled for subagents by default). Routed opencode phases run under the active primary agent, so default availability holds for the coordinator; if a coordinator ever runs as a subagent, the binding must enable the tool.

## Alternatives Considered

- **Worker-side emission** — rejected: the worker runs as a subagent where `todowrite` is disabled by default, so moving emission to the worker breaks opencode support.

## Consequences

Moving emission to the worker later breaks opencode support, so reversing this decision is costly; the restriction validates the ownership inversion rather than threatening it. The decision states a constraint the domain imposes on the pipeline's behavior that must hold at all times for both harnesses, which is why this record is a DDR.

## Provenance

User — the decision and its alternatives were settled in the design discussion recorded in `design.md` D5.
