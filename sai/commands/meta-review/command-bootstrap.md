# Meta-Review Command Bootstrap

This file declares the segment list and the bounded triage parse that drives
conditional audit fan-out. The coordinator follows this bootstrap and then
transfers control to `sai/commands/meta-review/coordinator.md`.

## Segment list

Declare an ordered sequence of phase adapters. Position 0 is always the review
phase adapter. Positions 1–3 are conditionally activated audit segments based
on the triage parse outcome:

- position 0 — review phase adapter (`sai/commands/review/coordinator.md`)
- position 1 — security phase adapter (`sai/commands/security/coordinator.md`) — activated only when the triage parse reads `Yes` from the Security Surface Triage section
- position 2 — performance phase adapter (`sai/commands/performance/coordinator.md`) — activated only when the triage parse reads `Yes` from the Performance Surface Triage section
- position 3 — accessibility phase adapter (`sai/commands/accessibility/coordinator.md`) — activated only when the triage parse reads `Yes` from the Accessibility Surface Triage section

The segment list is bounded: at most four segments (one review + three audits).
The review segment always runs; the audit segments activate only when their
triage condition is met.

## Triage parse

After the review segment completes successfully and writes `review.md`, perform
a bounded parse of the three Surface Triage sections. Read exactly these three
values from the freshly regenerated `openspec/changes/{change-name}/review.md`:

1. **Security Surface Triage** — locate the section headed `## Security Surface Triage` and read the value of the `**Surface touched:**` field. If the value is `Yes`, activate the security segment at position 1.
2. **Performance Surface Triage** — locate the section headed `## Performance Surface Triage` and read the value of the `**Surface touched:**` field. If the value is `Yes`, activate the performance segment at position 2.
3. **Accessibility Surface Triage** — locate the section headed `## Accessibility Surface Triage` and read the value of the `**Surface touched:**` field. If the value is `Yes`, activate the accessibility segment at position 3.

The parse is bounded and deterministic: it reads three named fields from three
named template sections. Two rules govern missing or illegible content:
(a) if `review.md` is missing after a completed review segment, the suite
aborts without dispatching any audit and reports the gap; (b) while the file
exists, an individually illegible section counts as not recommended plus a
summary warning line, and the suite continues with the other audits whose
sections were legible.

## Conditional activation

After the triage parse, construct the activated segment list by including only
the review segment (always) plus the audit segments whose triage condition
resolved to `Yes`. The activated list preserves the declared order (review →
security → performance → accessibility) but omits segments whose condition was
not met. If zero audits are recommended, the suite ends after the review
segment with a terminal message and no audit dispatches.
