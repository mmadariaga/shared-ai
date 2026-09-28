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
of exactly `Yes` activates the matching audit segment; any other value leaves
it inactive.

Missing or illegible content:

- `review.md` is missing, or none of the three sections is legible — abort
  without dispatching any audit and report the gap.
- One or two sections are illegible — each counts as not recommended plus a
  summary warning line, and the audits whose sections were legible still run.

The activated list keeps the declared order (review → security → performance →
accessibility). When no audit is activated, the suite ends after the review
segment with a terminal message and no audit dispatches.
