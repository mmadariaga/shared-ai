# DDR 0123a: Closure State is conversation-only and has exactly three lifecycle values

## Status

Accepted

## Context

The `enforce-explore-pre-crystallization-closure` change needs to distinguish an idea that is still being explored from one that has been crystallized or deliberately discarded. Readiness signaling is not crystallization, and the distinction must remain local to the `sai-explore` conversation rather than becoming durable project state.

## Decision

`sai-explore` maintains a conversation-only **Closure State** for the current idea. The state is exactly one of `active-uncrystallized`, `crystallized`, or `discarded`. A candidate idea starts as `active-uncrystallized`; an emitted `Ready to Propose` block transitions it to `crystallized`; explicit discard transitions it to `discarded`; and a materially changed idea starts a new `active-uncrystallized` lifecycle. Only `active-uncrystallized` requires the actionable question-or-reminder closure.

## Alternatives Considered

- **One boolean flag** — rejected because it cannot distinguish crystallization from discard, which have different conversational boundaries.
- **Persisted artifact state** — rejected because closure is a chat concern and persistence would introduce unnecessary artifact coordination.
- **Three conversation-only values** — chosen because it represents each required lifecycle boundary without adding a durable surface.

## Consequences

- Successful active exploration can enforce closure without affecting crystallized or discarded conversations.
- Readiness tracking remains separate from crystallization and does not bypass the active state.
- The state is not recoverable from repository artifacts, so a new chat starts with no prior Closure State.

## Related

- `openspec/changes/enforce-explore-pre-crystallization-closure/specs/explore-closure-state/spec.md`
- `openspec/changes/enforce-explore-pre-crystallization-closure/design.md` — Decision 2
