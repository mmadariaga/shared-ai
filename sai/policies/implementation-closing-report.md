# Implementation Closing Report

## Scope and authority

This is the single closing-format authority for standalone `/sai-4-apply`,
`/sai-build`, and Explore's full Direct Build route, in Claude Code and opencode.
The `--no-specs` POC keeps its own closing behavior. Render once at the route's
existing terminal close, including failure, cancellation, and interruption;
an execution question or a pending recovery choice is a pause, not a close.
Contract-pinned stop text keeps its existing precedence.

Use only results already available from execution: checks, incidents, affected
files, commits, and authorization decisions. Keep reporting in conversation;
use existing invocation information, with no new persisted reporting state and
no verification run solely to compose this report. Completion conditions,
execution ownership, authorizations, recovery budgets, and safety gates remain
route-owned.

## Format, in order

1. **Status.** Start with exactly one English required literal:
   - `Status: completed successfully.` — existing route completion conditions
     hold and no relevant warning is known.
   - `Status: completed with warnings.` — those conditions hold, with a known
     limitation or problem, including pending human checks or omitted checks.
   - `Status: stopped.` — the route did not complete, including cancellation
     or interruption. State which of failure, cancellation, or interruption
     ended the run and why in What you need to know. Partial work is partial.

   These are required literals under `public-chat.md`'s existing preservation
   exception: they precede Terminology. The rest follows that policy and the
   user's language; the section names below identify their required order.
2. **Terminology**, when applicable. Define specialized terms before using
   them in the explanation.
3. **What you need to know.** Name the command and change, summarize the
   material outcome, and state every relevant limitation and required action.
   State what was not checked and why; a permitted omission is not a pass.
   Include known pre-existing failures and incidents affecting the outcome,
   even when their technical explanation is below. On a stopped run state what
   work and commits remain, including written, staged, and uncommitted work
   and known commit references. Assume the state remains as observed; reporting
   authorizes no rollback or new operation. A declined commit retains its
   existing consequences and is disclosed here.
4. **Terminal functional review — pending human review**, when applicable.
   Preserve the complete held review block: every pending `fail` or
   `unverifiable` check, its reason, and the recommendation in the user's
   language (English fallback). A count is not a replacement. Omit the block
   when there are no pending checks or the review never ran; a stopped report
   uses only findings actually obtained.
5. **Next step.** Use the route's existing navigation or recovery options,
   appropriate to the outcome. Apply and Build use the same pinned completion
   message only on completion; stopped reports use the existing stop/recovery
   guidance instead. For an unplanned stop, name the required decision here;
   the options of `@sai/policies/stop-options.md` follow Execution details as a
   separate decision prompt, outside the report.
6. **Execution details**, last report section. Put the technical record of
   work, verification results, affected files, created commits, declined/no-op
   commit decisions, collected tool-generated commit reports, and correction
   traces here. Keep relevant problems summarized above as well. Reuse the
   original reports verbatim rather than rebuilding them. Preserve route-owned
   diagnostic information and telemetry omissions.

## Authorization visibility

Keep each original tool-generated report at its current pre-authorization
point, including included/excluded files, necessary warnings, the proposed
message, and the authorization question. Only their final diagnostic
collection moves to Execution details. An active authorization keeps its
existing effect; this format grants nothing.

## Closing check

Before printing, confirm that a reader who stops before Execution details can
identify the outcome, every relevant limitation, every pending human check and
reason, and the next required action. Execution details is the last report
section; only an existing separate stop-options decision may follow it.
