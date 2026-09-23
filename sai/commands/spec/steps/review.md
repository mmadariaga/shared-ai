# Spec Step — Review

Active step: review. Process the `sai-explore` findings block supplied with the
request, if there is one, then finish the phase.

## No findings block

Return `completed` now, carrying the decision summary and validation report
from the validation step.

## Findings block

1. Fetch @sai/policies/tool-resolution.md, resolve `validate-findings.js` by
   it, and run `node <tool> --cwd <project-root>` with the block on stdin. It
   prints `{ok, violations, error?}` and exits 0 (valid), 1 (violations), or 2
   (unreadable or empty block, or a tool error). When no candidate exists,
   continue without format validation and add the line
   `Findings validation skipped: validate-findings.js not found` to the
   decision summary.
2. On exit 1, return `needs_input` quoting the exact violations and asking for
   a corrected block. On exit 2, return `needs_input` quoting the `error`.
3. Process each finding per `@sai/policies/artifact-review-contract.md` and
   `@sai/policies/artifact-feedback-gate.md`: apply the valid ones to
   `proposal.md` or `specs/**` only, and report every discarded one with its
   specific reason.
4. After accepted edits, re-run verification and recompute the decision
   summary; the `proposal`, `specs`, and `validation` progress ids stay closed.
5. Return the `review` progress event only when `review` is unmarked and the
   block carries the base-form `Summary: High=<count> Medium=<count> Low=<count>`
   with an explicit `High=0`. A missing, malformed, or different summary line
   never counts as `High=0`.
6. Finish with `completed`, as in the no-block case.
