# ADR 0195: `/sai-4-review-new` is a review-only command of the `-new` family

<!-- adr-index: amends 0194 -->

## Status

Accepted

## Context

ADR 0194 put `/sai-3-implement-new` and `/sai-build-new` outside the shared orchestration. `/sai-build-new` reserved a second segment for a review command that did not exist. The only review command, `/sai-5-review`, loads the shared orchestration that the `-new` family avoids. It also fixes findings itself through a Direct Build close, and `/sai-3-implement-new` already applies open findings through its step cycle, one commit per finding with a ` (FIXED)` mark. A review command with its own fix loop would give findings two owners.

## Decision

1. **A review-only command in the `-new` family.** `/sai-4-review-new` reviews a change's diff against its parent branch in a fresh worker (`sai-review-new-worker`) and writes `review.md`. It fixes no finding and has no Direct Build close and no review-fix worker. Findings are applied by `/sai-3-implement-new`, which stays their only owner.
2. **The ADR 0194 boundary holds.** The command loads only the cross-cutting policies that never stop a run, plus `finding-state.md`. Its worker binding renders from `standalone-worker-template.md`, and its step files are delivered by pointer from `review-new-steps@1`.
3. **The report format keeps one source.** `sai/commands/review/review-report.template.md` is read in place by the worker. `/sai-3-implement-new` consumes the reports of both review commands, so a second copy could drift. ADR 0194 forbids loading contracts that stop a run, and a format template does not stop one.
4. **`/sai-build-new` runs the review as segment 2 and ends with human triage.** It runs exactly one review pass per run and implements no finding. Its close prints the finding counts, the recommended audits, and an invitation to delete the findings the user does not want and run `/sai-3-implement-new`.
5. **The commit of `review.md` follows the staging rule of `/sai-3-implement-new`.** The report is staged alone and committed locally only when the project's ignore rules do not ignore it.

## Alternatives Considered

- **`/sai-4-review`.** Rejected. It needs a change to the command-naming spec and reuses a name that users associate with review plus Direct Build fixes.
- **`/sai-5-review-new`.** Rejected. It breaks the 3 then 4 sequence of the family.
- **A copy of the report template under `sai/commands/review-new/`.** Rejected. Two copies of the format could drift.
- **A close warning about the `Summary:` tally after hand deletions.** Rejected. The tally is historical by design, and no consumer reads it.

## Consequences

- The `-new` family keeps one read dependency on `sai/commands/review/review-report.template.md`.
- In a project that ignores `openspec/changes/**`, a regenerated `review.md` replaces the previous report with no history of it.
- Findings deleted by hand leave the `Summary:` tally of `review.md` out of step with the remaining findings.
- Tests and baselines that enumerate commands and workers count the new command and worker.
