# DDR 0110: Progress reporting is additive and nonterminal; a run closes with exactly one terminal status

## Status

Accepted

## Context

`worker-lifecycle.md` is shared by seven workers and carries the design notice as its only nonterminal extension. Progress needed machine-marked semantics — step ids the coordinator marks — rather than the notice's user-visible message semantics, and the four-terminal-status contract is closed.

## Decision

A routed planning worker MAY return an additive, nonterminal progress event with exactly `event: progress`, `step_ids: string[]`, and `changed_files: string[]`, structurally modelled on the design notice. It is not a lifecycle status: a worker MAY emit zero or more progress events before a terminal result, and the terminal payload (`completed`, `needs_input`, `failed`, `cancelled`) remains the only way the run closes. The coordinator marks the reported step ids, unions the progress-event changed files in first-seen order, and resumes the same worker with the fixed protocol value `continue_after_progress`, which is protocol-only and never recorded as user input, opaque interaction history, or pending feedback. In this change only the design worker emits progress events; implementation and audit workers never do, and their payload validation is unchanged.

## Alternatives Considered

- **Reuse the design notice for progress** — rejected: the notice is a user-visible informational message owned by presentation, while progress carries machine-marked state.
- **Add progress to terminal payloads** — rejected: the four-terminal-status contract is closed; progress must be nonterminal and repeatable.
- **A separate out-of-band channel** — rejected: the worker↔coordinator lifecycle has one return surface, so the event is modelled on the notice with the same shape discipline (`event` discriminator, `changed_files`).

## Consequences

The event extends, and never replaces, the closed lifecycle payloads; unwinding the handling across coordinators and bindings is real work, so the extension is hard to reverse. Each progress batch costs one worker→coordinator→worker round trip; batching completions reduces the count but does not eliminate the cost. The decision states a property that must hold of the pipeline's behavior at all times, which is why this record is a DDR.

## Provenance

User — the decision and its alternatives were settled in the design discussion recorded in `design.md` D2.
