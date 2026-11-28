# ADR 0243: Expert review answer is resolved once at Start

## Status

Accepted.

## Context

`/sai-plan` and `/sai-build` run unattended after their start, and a question that arrives later stops a run whose expensive segments have already produced work. The expert review of ADR 0242 is optional, and two things about it are the user's: whether the review runs at all, and whether the user keeps each correction or the coordinator decides. Asking at the checkpoint would put an unannounced stop late in the run, in the one place where the product is about to settle. `/sai-explore` is different: its product is the user's own agreement, so it always asks the reconciliation question at its checkpoint and records no answer.

## Decision

`/sai-plan` and `/sai-build` resolve one answer for the run, `no`, `auto`, or `ask`, once at Start, after the input checks have passed and before the first worker exists. The first available source wins: the `--expert-review [no|auto|ask]` argument (a bare flag is `auto`; any other value, or a second flag, ends the run before anything is written with `Cannot start {command}: --expert-review takes no, auto or ask.`), then the `expert_review` field recorded in `plan-run@1` or `implement-run@1`, then one native question offering `No` (`no`), `Yes, decide the corrections` (`auto`), and `Yes, ask me before keeping them` (`ask`).

`auto` lets the coordinator keep or revert each correction by itself; `ask` adds exactly one reconciliation question, the one the user chose at Start, offering the coordinator's recommendation, keep all, and discard all, with free text naming identifiers. A `no` answer creates no worker, no report directory, and no write. A caller that runs either command as a segment passes `--expert-review no`, and `/sai-build` passes it to its `/sai-3-implement` segments, which strip it. The answer is recorded in the run state so a resumed run reuses it and asks nothing, an explicit later argument replaces it, and the handled checkpoint is recorded as `expert_review_checkpoint` (`done` or `skipped`) so a resumed run runs it once.

## Alternatives Considered

- **Ask at the checkpoint only.** Rejected because it stops an unattended run late, after the segments have spent their work, and the user cannot plan for it at Start.
- **A generic `--unattended` flag that suppresses every question.** Rejected because it collides with the `--unattended` of `to-pr.js` and one explicit answer per decision is enough; a flag that also covers the reconciliation question would remove the choice the user wants.
- **A second question at Start, one for the review and one for keeping corrections.** Rejected because the three options of one question already carry both decisions: `auto` reviews and decides, `ask` reviews and asks once.

## Consequences

- A run asks one more Start question only when no argument and no recorded answer settled it; with an argument or a resumed run, nothing is asked.
- `ask` is the only mid-run question this decision adds to `/sai-plan` and `/sai-build`, and the user chose it at Start.
- A `no` answer costs nothing beyond the resolution, and an invalid value fails before any write.
- `/sai-explore` records no answer: a conversation that lost its state asks again, and its checkpoint always asks the reconciliation question.

## Provenance

Change `adversarial-expert-review`, decision "Expert review answer is resolved once at Start".
