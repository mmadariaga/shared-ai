# DDR 0140: Valid results carry a validator-observed `validated_at` sidecar; worker payloads are timeless

## Status

Accepted

## Context

Worker results — the four terminal lifecycle statuses, the design notice, and
the progress event — reached the coordinator with no record of *when* the
pipeline saw them. The only time-bearing surface in a routed run was the **Milestone
Stamp**, an `HH:mm` annotation the coordinator renders on a progress task list
from its own clock at the moment it *receives* a progress event. That stamp
cannot answer how long a worker spent between two results, is absent for every
non-progress payload, and is lost entirely once the task list is re-rendered.
Worker-claimed time would mix two clocks and cannot answer durations in one
place.

## Decision

Worker payloads carry no time field in any phase. The validator tool
(`sai/tools/worker-report-validator.js`) owns the only clock: on each valid
result it observes validation time and emits an additive display-only
`validated_at` sidecar in the exact form `YYYY-MM-DDTHH:MM:SS±HH:MM` — local
wall-clock time with the session's numeric UTC offset attached, never the `Z`
designator. The sidecar appears as a text suffix and a JSON field with exit
codes unchanged; invalid results carry none. Unknown payload fields stay
ignored with no explicit legacy handling, so a payload carrying a legacy time
field stays valid with that field ignored. The sidecar applies to all four
validated kinds (terminal, notice, progress, `conflict_detected`).

The value is validator state under display-only rules: the decision stays
deterministic (`ok`/`errors` plus exit code) while presentation carries
observation time. A coordinator forwards the verdict verbatim, surfaces
`validated_at` in its prompt for terminal and progress results at minimum, and
never reads wall-clock time; zone handling lives in the tool. Reception time
substitutes emission time; the small transport delta is accepted as a duration
proxy. Time is observation, not claim.

This record establishes the sidecar itself. Its relationship to the Milestone
Stamp — which DDR 0141 makes wholly derived from `validated_at` — is settled
there, not here.

## Alternatives Considered

- **Validator backfills a worker time field by rewriting the payload** — rejected:
  mutating validator.
- **State machine timestamps arrivals** — rejected: sees arrival only and is not
  the worker-lifecycle authority.
- **Dual-source with a worker time field plus `validated_at` fallback** —
  rejected: silent mixing of two clocks.
- **Reuse the Milestone Stamp** — rejected: `HH:mm` is a presentation
  annotation with no date, no timezone, and no sub-minute resolution, and it is
  owned by a different surface. Overloading it would couple verdict semantics to
  task-list rendering.
- **Write the instant in UTC with the `Z` designator** — rejected:
  `validated_at` never leaves the machine that produced it. It is not persisted
  to any artifact, never enters git, and travels only between the validator and
  its coordinator in the same session on the same host, so UTC's cross-machine
  normalisation buys nothing here. An offset-bearing value is exactly as
  comparable — `2026-08-17T14:32:05+02:00` and `2026-08-17T12:32:05Z` denote the
  same instant — while additionally carrying the local reading that
  `@sai/policies/todo-structure.md` renders as a Milestone Stamp, which under
  `Z` would require the coordinator to resolve a timezone it has no reliable way
  to obtain.

## Consequences

The closed payload shapes lose their time field and the validator gains a
display-only sidecar, so every worker stops authoring time and every coordinator
reads the verdict; the change is flag-day across contracts, specs, decision
records, and glossary. Result streams become measurable end to end — worker
think time, gate wait time, and total run duration are all derivable without new
instrumentation. Because the value is validator-observed, it reflects reception
time: values are comparable within one run and are not a trusted cross-machine
audit source. Validator output becomes non-deterministic in presentation while
the decision stays deterministic. The decision states a property that must hold
of every result the pipeline produces, which is why this record is a DDR.

## Provenance

User — requested that the worker-authored emission timestamp be replaced with a
validator-observed validation timestamp, with the field as a display-only
sidecar and the validator as the single time source for prompt and panel.
