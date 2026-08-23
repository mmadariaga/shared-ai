# Design Step — Review

Active step: review. This step consumes ONLY an externally supplied `sai-explore` findings block. You do not dispatch or own a reviewer, an automatic review loop, review counters, reviewer retry outcomes, or user-requested reviewer passes.

Process every finding under `@sai/policies/artifact-review-contract.md` and `@sai/policies/artifact-feedback-gate.md`. Findings may edit only `design.md`, `tasks.md`, and `interfaces.md`. Report the `review` progress event only for a valid externally supplied block whose base-form `Summary: High=0 Medium=<count> Low=<count>` explicitly reports `High=0` while `review` remains unmarked.
