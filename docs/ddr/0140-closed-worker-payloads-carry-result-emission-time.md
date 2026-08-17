# DDR 0140: Every closed worker payload carries a worker-authored `emitted_on`

## Status

Accepted

## Context

Worker results — the four terminal lifecycle statuses, the design notice, and
the progress event — reached the coordinator with no record of *when* the worker
composed them. The only time-bearing surface in a routed run was the **Milestone
Stamp**, an `HH:mm` annotation the coordinator renders on a progress task list
from its own clock at the moment it *receives* a progress event. That stamp
cannot answer how long a worker spent between two results, is absent for every
non-progress payload, and is lost entirely once the task list is re-rendered.

## Decision

Every closed worker payload carries `emitted_on` immediately after its `status`
or `event` discriminator: a worker-authored ISO-8601 instant in the exact form
`YYYY-MM-DDTHH:MM:SS±HH:MM` — local wall-clock time with the session's numeric
UTC offset attached, never the `Z` designator. It is mandatory and
unconditional — present in `completed`, `needs_input`, `failed`, `cancelled`,
the design notice, and the progress event, in every phase, including phases with
no declared progress plan and pre-resolution results that omit
`resolved_change_name`. A missing, non-ISO-8601, or offset-less value is a
malformed payload and routes through the existing closed-shape violation
handling.

The value is worker state under the same rules as `summary` and `changed_files`:
the worker reads its clock as it composes each result and never reuses,
back-dates, forward-dates, or copies an earlier value; a coordinator forwards or
records it verbatim and never invents, corrects, re-derives, or reformats it.
A replacement worker authors its own values and never reconstructs the prior
worker's.

This record establishes the field itself. Its relationship to the Milestone
Stamp — which DDR 0141 makes wholly derived from `emitted_on` — is settled
there, not here.

## Alternatives Considered

- **Add the field only to the progress event** — rejected: the gap is the whole
  result stream, not one payload. A timeline that stops at the terminal status
  cannot say when a run actually ended, and a notice-emitting design run would
  stay untimed.
- **Have the coordinator stamp arrival time instead** — rejected: arrival time
  measures the transport, not the work. It also silently attributes a stalled or
  slow return to the coordinator's clock, which is exactly the interval the
  field exists to expose.
- **Reuse the Milestone Stamp** — rejected: `HH:mm` is a presentation
  annotation with no date, no timezone, and no sub-minute resolution, and it is
  owned by a different surface. Overloading it would couple payload semantics to
  task-list rendering.
- **Make the field optional** — rejected: an optional time field yields a
  timeline with holes, which is worth less than no timeline. Unconditional
  presence also keeps the closed shapes uniform across phases.
- **Write the instant in UTC with the `Z` designator** — rejected: `emitted_on`
  never leaves the machine that produced it. It is not persisted to any
  artifact, never enters git, and travels only between a worker subagent and its
  coordinator in the same session on the same host, so UTC's cross-machine
  normalisation buys nothing here. An offset-bearing value is exactly as
  comparable — `2026-08-17T14:32:05+02:00` and `2026-08-17T12:32:05Z` denote the
  same instant — while additionally carrying the local reading that
  `@sai/policies/todo-structure.md` renders as a Milestone Stamp, which under
  `Z` would require the coordinator to resolve a timezone it has no reliable way
  to obtain. The cost is that a run crossing a daylight-saving transition
  carries two offsets and stops sorting lexicographically; the values remain
  correct instants, and the trade was accepted for local readability the rest of
  the year.

## Consequences

The closed payload shapes grow by one mandatory field, so every worker must
author it and every coordinator must validate it; the change is additive but
touches all seven routed phases plus the apply RED/GREEN boundary, making it
costly to unwind. Result streams become measurable end to end — worker think
time, gate wait time, and total run duration are all derivable without new
instrumentation. Because the value is worker-authored, it reflects the worker's
clock: values are comparable within one run and are not a trusted cross-machine
audit source. The decision states a property that must hold of every result the
pipeline produces, which is why this record is a DDR.

## Provenance

User — requested that worker→coordinator events carry the date and time of
emission, with the field placed immediately after the `event` discriminator and
applied to every worker result rather than the progress event alone.
