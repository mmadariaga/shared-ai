# Meta-Review Command Bootstrap

This file declares the segment list and the bounded triage parse that drives
conditional audit fan-out; `sai/commands/meta-review/coordinator.md` executes
them.

## Segment list

An ordered sequence of at most four phase adapters:

- position 0 — review phase adapter (`sai/commands/review/coordinator.md`), always runs
- position 1 — security phase adapter (`sai/commands/security/coordinator.md`)
- position 2 — performance phase adapter (`sai/commands/performance/coordinator.md`)
- position 3 — accessibility phase adapter (`sai/commands/accessibility/coordinator.md`)

Positions 1–3 run only when the triage parse activates them.

## Triage parse

After the review segment completes successfully, read exactly three values
from the freshly regenerated `openspec/changes/{change-name}/review.md`: the
`**Surface touched:**` field under each of `## Security Surface Triage`,
`## Performance Surface Triage`, and `## Accessibility Surface Triage`. A value
of exactly `Yes` activates the matching audit segment; exactly `No` leaves it
inactive. Any other value is illegible: that audit does not run and the
summary carries a warning line naming it. An illegible value adds no
correction authorization.

The activated list keeps the declared order (review → security → performance →
accessibility). When no audit is activated after successful review and a
legible triage parse, the coordinator applies the Direct Build
close using only the freshly regenerated `review.md`, with no audit
dispatches. Eligible findings receive the correction choice;
when none remain, the exact zero-audit terminal literal is preserved.

## Error close

When `review.md` is missing, or none of the three values is legible (`Yes` or
`No`), dispatch no audit and offer no correction choice. Report the gap, show
the changed files, and end with no Direct Build round.
