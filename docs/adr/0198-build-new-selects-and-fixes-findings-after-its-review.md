# ADR 0198: `/sai-build-new` selects and fixes the findings of its own review

<!-- adr-index: amends 0195 -->

## Status

Accepted

Supersedes Decision 4 of [ADR 0195](./0195-review-new-is-a-review-only-command-of-the-new-family.md). Decisions 1, 2, 3, and 5 of ADR 0195 stand.

## Context

ADR 0195 Decision 4 made `/sai-build-new` end with human triage: one review pass, no finding implemented, and a close that invites the user to delete the findings they do not want and run `/sai-3-implement-new`. Applying the findings of a build therefore needs a manual follow-up every time.

ADR 0195 Decision 1 still holds: `/sai-3-implement-new` owns every fix, and `/sai-4-review-new` fixes nothing.

## Decision

1. **The `/sai-build-new` coordinator assesses the findings itself.** After segment 2 writes `review.md`, the coordinator runs one assessment pass and selects the fixable findings to fix. The agent that selects differs from the agent that fixes. Selection keeps agent judgment: impact, correction cost, and correction risk are possible considerations, never mandatory checks, thresholds, or a severity rule.
2. **Exclusions are marked in `review.md`.** A fixable finding the coordinator decides not to fix gets the literal ` (EXCLUDED: <reason>)` at the end of its heading line, in the style of the ` (FIXED)` mark. `sai/policies/finding-state.md` defines it. The coordinator commits `review.md` alone under the commit rule of `/sai-4-review-new`.
3. **The fixes are a third segment.** `/sai-build-new` runs `/sai-3-implement-new` again for the findings that carry no mark. The segment skips every finding with an excluded mark, and so does `/sai-3-implement-new` in a standalone run. Every other consumer treats an excluded finding as open, so the Direct Build close of `/sai-review` and `/sai-5-review` stays unchanged.
4. **One review pass, no review after the fixes.** A new `review.md` appears only when `/sai-build-new` runs again, and a rerun judges every finding from scratch.
5. **The close reports and asks nothing.** It prints the counts by category, the recommended audits, and the fixed, excluded, and left-open findings with their reasons. It tells the user to remove the excluded mark and run `/sai-3-implement-new {name}` to recover an excluded finding. Questions stay open until the user answers them.

## Alternatives Considered

- **A final report-only review after the fixes.** Rejected. No further `review.md` is generated until `/sai-build-new` runs again, and it would overwrite the marks.
- **A bounded fix-and-review loop.** Rejected. It costs more and is harder to bound, because each review can raise new findings.
- **Deleting excluded findings from `review.md`, with the reasons in the commit body.** Rejected in favor of a visible mark beside the finding text.
- **A new option that passes the selected finding identifiers to `/sai-3-implement-new`.** Rejected. It changes that command's interface and leaves no trace in the report.
- **An interactive picker at the close to recover excluded findings.** Rejected. It keeps `/sai-build-new` free of questions.
- **Assessment by the `/sai-3-implement-new` coordinator, or by a new isolated worker.** Rejected. The first would also exclude findings in standalone runs after a user triage, and the second adds an agent and a contract.

## Consequences

- The coordinator may leave a real defect unfixed when it judges a fix unwarranted; the close reports each exclusion with its reason.
- Fixes made in the run are not reviewed again inside the run; the tests that `/sai-3-implement-new` writes are their safety net.
- `/sai-3-implement-new` skips excluded findings in standalone runs too, including a mark the user wrote by hand.
- ADR 0195 keeps its history and points readers here through the index.
