# ADR 0080: Design-to-implementation lifecycle boundary

<!-- adr-index: refs 0075; refs 0076 -->

## Status

Accepted

## Context

When the user selects "Continue now" after the design phase completes, the `/sai-2-design` coordinator must hand off to implementation planning within the same chat. The existing implementation coordinator-worker contract (ADR 0075, ADR 0076) expects a fresh invocation envelope containing only a resolved change name. The design coordinator accumulates lifecycle state (opaque input history, pending feedback, changed-file union, fast-track banners, resolved decisions) that is design-specific and must not leak into the implementation phase.

The handoff must be forward-compatible with the implementation coordinator's existing dispatch, continuation, and recovery behavior without requiring the implementation coordinator to be aware of design-phase state.

## Decision

Continue-now copies only `resolved_change_name` from the design lifecycle into a fresh implementation lifecycle namespace. The implementation worker binding receives a new invocation envelope with `wrapper_echo_value: ""` and `arguments_value: resolved_change_name`. Every design-specific field — opaque input history, pending feedback, fast-track banner flag, changed-file union — is dropped at the boundary.

The implementation coordinator starts with a fresh result-loop namespace: its own opaque input history, its own pending feedback, its own changed-file union, and its own iteration counter. Design-phase state is inaccessible to any implementation lifecycle step.

## Alternatives Considered

- **Forward the full design lifecycle state** - would couple the two lifecycle implementations and risk unintended carry-over (e.g., a design-time feedback being treated as implementation-time feedback).
- **Re-read design artifacts instead of copying the name** - more state at the boundary without benefit; the implementation worker independently reads durable artifacts.
- **Make Continue-now load the implementation invocation core inline** - works but adds the same routing complexity as the wrapper-level path selection.

## Consequences

- The design-to-implementation handoff is a pure copy of a single string, keeping the boundary transparent and testable.
- Any design-phase state the implementation worker needs (decisions, open questions) must be encoded in durable artifacts (`design.md`, `tasks.md`, `interfaces.md`) that the implementation worker independently reads.
- The implementation coordinator's recovery and continuation behavior is unchanged by this ADR — it never encounters design-phase state.

## Related

- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
- `openspec/changes/introduce-design-coordinator-worker/specs/design-to-implementation-boundary/spec.md`
