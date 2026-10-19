# Deep-Review Command Bootstrap

This file declares the segment list and the bounded triage parse that drives
conditional audit fan-out; `sai/commands/deep-review/coordinator.md` executes
them.

## Segment list

An ordered sequence of at most five segments:

- position 0 — review segment (`sai/commands/review/coordinator.md`), always runs; a standalone command coordinator, not a phase adapter
- position 1 — security phase adapter (`sai/commands/security/coordinator.md`)
- position 2 — performance phase adapter (`sai/commands/performance/coordinator.md`)
- position 3 — accessibility phase adapter (`sai/commands/accessibility/coordinator.md`)
- position 4 — fix segment (`sai/commands/implement/coordinator.md`), a standalone command coordinator, runs only when the findings round selects at least one finding

Positions 1–3 run only when the triage parse activates them, except that
`--full` or `--path` activates all three without the triage parse. Those two
options ask to look beyond the diff, which the triage saves work by reading.
Each segment runs with only the options its own `options.md` declares; the fix
segment takes none.

## Triage parse

With `--full` or `--path`, no triage parse runs and the Error close below does
not apply. Otherwise, after the review segment completes successfully, read
exactly three values from the freshly regenerated `openspec/changes/{change-name}/review.md`: the
`**Surface touched:**` field under each of `## Security Surface Triage`,
`## Performance Surface Triage`, and `## Accessibility Surface Triage`. A value
of exactly `Yes` activates the matching audit segment; exactly `No` leaves it
inactive. Any other value is illegible: that audit does not run and the
summary carries a warning line naming it. An illegible value adds no
correction authorization.

The activated list keeps the declared order (review → security → performance →
accessibility → fix). When no audit is activated after successful review and a
legible triage parse, the coordinator goes straight to the findings round
using only the freshly regenerated `review.md`, with no audit dispatches.
Open fixable findings and open Questions receive the round; when none remain,
the exact zero-audit terminal literal is preserved.

## Error close

When `review.md` is missing, or none of the three values is legible (`Yes` or
`No`), dispatch no audit and offer no correction choice. Report the gap, show
the changed files, and end with no findings round and no fix segment.
