# DDR 0141: The milestone stamp is closure-only and derived from `validated_at`, never from a coordinator clock

<!-- ddr-index: refs 0140, refs 0112 -->

## Status

Accepted

## Context

The milestone stamp as first specified attached two HH:mm values to every step —
a start inherited from the preceding step's closure and a closure of its own —
and acquired each value with a wall-clock shell call from the coordinator
session, at most one per render act. Two problems accumulated.

First, the acquisition mechanism no longer exists. `per-harness-time-command` of
`sai-todo-timestamps` places the wall-clock command in the harness bindings and
`sai/policies/todo-structure.md` explicitly refuses to name one; the
`collapse-sai-worker-matrix` change then deleted the 28 per-harness binding
sources, taking `date +%H:%M` and `Get-Date -Format "HH:mm"` with them. The
coordinator is told to issue a call, the policy will not say which, and the
bindings no longer say either. `SAI_LEARNINGS.md` records the loss; the scoped
`Bash(date:*)` grant of ADR 0117a survived it, pointing at nothing.

Second, a coordinator-read clock measures the wrong thing. It records when the
coordinator rendered the update, not when the pipeline saw the result, so
transport and scheduling latency are silently attributed to the work.

DDR 0140 removed the obstacle that had settled the original design: valid
results now carry `validated_at`, the validator's own observation instant. ADR
0117a had considered and rejected exactly this source — "acquire stamps
worker-side and carry them in payloads" — on the grounds that it would change
the worker contract and the lifecycle protocol, which that change had committed
to preserving. That constraint no longer holds; the clock lives in the
validator and payloads are timeless.

## Decision

A progress step carries exactly one milestone stamp, attached when and only when
it renders `completed`. `pending` and `in_progress` steps carry none. The stamp's
value is the `validated_at` of the verdict that marked the step — the progress
verdict for a step that event marks, the terminal `completed` verdict for a step
closed by run-closing reconciliation. Because `validated_at` carries local
wall-clock time with its offset attached (DDR 0140), the stamp is that value's
own `HH:MM` field read straight off it: no timezone resolution, no conversion,
no fallback. Zone handling lives in the tool.

The coordinator issues no wall-clock call of any kind. The three planning-phase
Claude wrappers accordingly drop the scoped `Bash(date:*)` entry, restoring the
unbroken read-only tool-scoping doctrine (ADR 0119a).

Stamps extend to every routed phase progress task list marked from worker
progress events — the four audit plans included, since the per-call cost that
justified excluding them is gone. The `sai-explore` Idea Progress List and the
apply step projection stay unstamped: neither is marked from worker progress
events, so neither has a verdict to take a value from.

## Alternatives Considered

- **Restore the wall-clock command to a production surface** — rejected: it
  repairs the plumbing without fixing what the value measures, keeps N+1 shell
  calls per run, and preserves a shell grant on three otherwise read-only
  coordinators.
- **Keep start and closure stamps, sourced from `validated_at`** — rejected: the
  start of step N is the closure of step N−1, so the second value is derivable
  by the reader and doubles the visual weight of every row. A multi-mark event
  also renders zero-width spans, which read as a defect rather than as
  information.
- **Stamp `in_progress` with its inherited start** — rejected: it puts a time on
  a step that has not finished, which reads as a completion claim. An unfinished
  step showing no time is unambiguous.
- **Render the stamp in UTC** — rejected: the stamp exists to be read at a
  glance against the reader's own clock, and a run at 12:51 local labelled 10:51
  defeats that.
- **Keep `validated_at` in UTC and resolve the local offset at render time** —
  rejected, and this is why DDR 0140 fixes the sidecar's form as offset-bearing.
  The coordinator has no shell and no reliable way to obtain a timezone, so a
  UTC verdict would leave the one part of the render that cannot come from the
  verdict resting on a mechanism that does not exist — the same gap that broke
  the original wall-clock design.

## Consequences

The stamp costs the coordinator nothing — no shell call, no permission grant, no
per-harness command — and becomes correct, since it reports the validator's
observation instant rather than the coordinator's render time. This is not a net
saving in clock reads: the validator acquires one per valid result it sees, so
a run trades the coordinator's N+1 calls for the validator's N. The reads are
paid for regardless by DDR 0140, which emits `validated_at` on every valid
verdict for its own reasons; the stamp rides a value that already exists. What
the decision buys is accuracy and the removal of a shell grant from three
otherwise read-only coordinators, not fewer calls. Stamp coverage roughly
doubles, reaching all seven routed phases. Stamp accuracy now depends on
validator-observed values: prompt and panel share one clock. The
`sai-todo-timestamps` requirements `first-render-start-stamp`,
`progress-event-closure-and-inheritance`, `stamp-call-budget`,
`per-harness-time-command`, `every-step-carries-start-and-closure`,
`coordinator-wall-clock-permission-grant`, and the three-phase scope of
`stamp-scope-three-routed-phase-lists` are all retired or rewritten by this
decision. It states a property that must hold of every stamped list the
pipeline renders, which is why this record is a DDR.

## Provenance

User — requested that the main agent update the TODO list on each progress event
with the hour at which the task completed, and chose closure-only rendering,
`validated_at` as the source, and full-phase scope over the alternatives above.
