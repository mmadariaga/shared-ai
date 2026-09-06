# Design Step — Review

When no externally supplied `sai-explore` findings block has been received in this invocation, process nothing, verify that `design.md`, `tasks.md`, and `interfaces.md` each exist and are non-empty, and return the ordinary pre-gate terminal per the worker contract.

Active step: review. This step consumes ONLY an externally supplied `sai-explore` findings block. You do not dispatch or own a reviewer, an automatic review loop, review counters, reviewer retry outcomes, or user-requested reviewer passes.

Validate the format of the externally supplied findings block through the deterministic format validator `validate-findings.js`. Resolve the validator by taking the **first candidate below that exists**, copied **verbatim**:

**Claude Code**:
1. `.claude/sai/tools/validate-findings.js` — project-local
2. `~/.claude/sai/tools/validate-findings.js` — user-global

**opencode**:
1. `.opencode/sai/tools/validate-findings.js` — project-local
2. `~/.config/opencode/sai/tools/validate-findings.js` — user-global

If no candidate exists, report that and proceed without validation; do not attempt to compose a path. If the validator exists, run it against the findings block. If format violations are found, return `needs_input` with the exact violations and a request to correct and resubmit the block for review. The coordinator retries the correction under the existing bounded-retry mechanism. If the block validates successfully, use the worker card's `### External findings consumption` section as the sole review-evidence authority, together with `@sai/policies/artifact-review-contract.md` and `@sai/policies/artifact-feedback-gate.md`. Findings may edit only `design.md`, `tasks.md`, and `interfaces.md`; report the `review` progress event only when that canonical section accepts a valid external block with the base-form `Summary: High=0 Medium=<count> Low=<count>` and explicit `High=0` while `review` remains unmarked.
