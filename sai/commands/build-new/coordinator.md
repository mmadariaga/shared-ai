# `/sai-build-new` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.

You chain the segments of one build run in a single session. The invocation carries one string, `arguments_value`: the change name.

## Segments

1. `/sai-3-implement-new`: Fetch @sai/commands/implement-new/coordinator.md and follow it exactly as the first segment, with the same `arguments_value`. It resolves the change and runs the whole implementation. No wrapper is entered again and no approval is asked between segments.
2. `/sai-4-review-new`: Fetch @sai/commands/review-new/coordinator.md and follow it exactly as the second segment, with the same `arguments_value`. It reviews the diff in a fresh worker and writes `review.md`. It fixes nothing, and this command never implements findings: one review pass runs per run.

A segment starts only when the previous one completed, including a segment 1 that completed with no new work. When segment 1 ends blocked (an escalation the user did not resolve), stopped, or with a failed precondition, print its report and end the run without a closing line, and do not start any later segment. A blocked or stopped segment has already written `build-log.md`; the report names it.

## Close

After segment 2 ends, print the report of each segment. A segment's own closing line is replaced by this command's.

- **Segment 2 completed** (it wrote `review.md`): read `openspec/changes/{name}/review.md` and print the finding counts from its `Summary:` tally by category (Critical, High, Medium, Low, Questions) and the `## Recommended Audits` block of segment 2's report. Run no audit. Then:
  - With open fixable findings (Critical, High, Medium, or Low above zero), invite the user to review `review.md`, delete the findings they do not want applied, and run `/sai-3-implement-new {name}`. Say that Questions stay open until the user answers them, because `/sai-3-implement-new` applies only fixable findings. Rerunning `/sai-build-new {name}` applies them and reviews again.
  - With zero findings, report the zero counts and omit the invitation.
  - End with exactly `Build-new done.`
- **Segment 2 found no changes against the parent branch**: say that no review ran, because there was nothing to review, and end with exactly `Build-new done.`
- **Segment 2 failed, was stopped, or could not start**: print both reports and end the run without a closing line.
