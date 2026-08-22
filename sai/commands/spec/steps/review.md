# Spec Step — Review

Active step: review. This step consumes ONLY an externally supplied `sai-explore` findings block. You do not dispatch or own a reviewer, an automatic review loop, review counters, reviewer retry outcomes, or user-requested reviewer passes.

## Fast path — no findings block

With no externally supplied `sai-explore` findings block present, return `completed` immediately per the worker contract's ordinary pre-gate terminal. Create no reviewer machinery: no reviewer dispatch, no review loop, no counters, no retry outcomes, no user-requested reviewer pass.

## With an externally supplied findings block

Process every finding under `@sai/policies/artifact-review-contract.md` and `@sai/policies/artifact-feedback-gate.md`:

- Require the shared contract's base-form `Summary: High=<count> Medium=<count> Low=<count>` and an explicit `High=0` before treating the block as review evidence; never infer `High=0` from missing, malformed, or other summary text.
- Apply each finding selectively per item; discard invalid or inapplicable items.
- Findings may edit only `proposal.md` and `specs/**`.
- Report every discarded item with a specific reason.
- Accepted edits trigger pre-completion verification (re-run the validation step's checks) and decision-summary recomputation from current artifacts without reopening or re-emitting the already completed `proposal`, `specs`, or `validation` progress ids.
- Return the `review` progress event only for a valid block meeting the base-form explicit-`High=0` requirement while `review` is unmarked.
