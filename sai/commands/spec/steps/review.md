# Spec Step — Review

Active step: review. This step consumes ONLY an externally supplied `sai-explore` findings block. The phase result and write boundaries remain those in `@sai/policies/spec-phase-contract.md`; you do not dispatch or own a reviewer, an automatic review loop, review counters, reviewer retry outcomes, or user-requested reviewer passes.

Rules originating here: none. This step uses the Artifact Verification Checklist and Rule #1 and Rule #2 from common.md when processing edits.

## Fast path — no findings block

With no externally supplied `sai-explore` findings block present, return `completed` immediately per the worker contract's ordinary pre-gate terminal. Create no reviewer machinery: no reviewer dispatch, no review loop, no counters, no retry outcomes, no user-requested reviewer pass.

## With an externally supplied findings block

Validate the format of the externally supplied findings block through the deterministic format validator `validate-findings.js`. Resolve the validator by taking the **first candidate below that exists**, copied **verbatim**:

**Claude Code**:
1. `.claude/sai/tools/validate-findings.js` — project-local
2. `~/.claude/sai/tools/validate-findings.js` — user-global

**opencode**:
1. `.opencode/sai/tools/validate-findings.js` — project-local
2. `~/.config/opencode/sai/tools/validate-findings.js` — user-global

If no candidate exists, report that and proceed without validation; do not attempt to compose a path. If the validator exists, run it against the findings block. If format violations are found, return `needs_input` with the exact violations and a request to correct and resubmit the block for review. The coordinator retries the correction under the existing bounded-retry mechanism. If the block validates successfully, process every finding under `@sai/policies/artifact-review-contract.md` and `@sai/policies/artifact-feedback-gate.md`:

- Require the shared contract's base-form `Summary: High=<count> Medium=<count> Low=<count>` and an explicit `High=0` before treating the block as review evidence; never infer `High=0` from missing, malformed, or other summary text.
- Apply each finding selectively per item; discard invalid or inapplicable items.
- Findings may edit only `proposal.md` and `specs/**`.
- Report every discarded item with a specific reason.
- Accepted edits trigger pre-completion verification (apply the Artifact Verification Checklist and Rule #1 and Rule #2 from common.md) and decision-summary recomputation from current artifacts without reopening or re-emitting the already completed `proposal`, `specs`, or `validation` progress ids.
- Return the `review` progress event only for a valid block meeting the base-form explicit-`High=0` requirement while `review` is unmarked.
