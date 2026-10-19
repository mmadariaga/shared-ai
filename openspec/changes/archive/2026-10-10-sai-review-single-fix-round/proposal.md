> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The Direct Build close of `/sai-review` and `/sai-5-review` offered the fix as two consecutive questions: a Direct Build / decline selector, then a second findings-selection question. The "not fixable" criteria were also stated three ways, and open Questions and findings needing a requirement or design change were routed to `/sai-1-spec` or `/sai-2-design` instead of being answered while the user was present. The close now asks one round at the end, with one question per report, where the user picks what to fix and answers the review's Questions.

## What Changes

- `sai/commands/meta-review/findings-selection.md` now holds the whole round, the single user interaction of the Direct Build close:
  - It is asked after every segment has finished and the summary is printed.
  - It has one question per report with an open fixable finding or an open Question, in the fixed order `review.md`, `security.md`, `performance.md`, `accessibility.md`. When no report qualifies, there is no round.
  - Each open finding is shown with its source-qualified id, severity, title, problem/impact, and location, and each open Question is shown in full before the round.
  - Each question offers `Fix all fixable findings (Recommended)`, `Fix nothing`, or the picker's built-in free text. The free text carries the ids to exclude (`exclude: review:C1, review:L2`) and the answers to Questions, one per line (`review:Q1: <answer>`).
  - An unknown or unqualified id, an answer to a non-Question, or an exclusion of a Question repeats only that report's question, once. A second invalid answer ends the close with no dispatch and no commit.
  - When every answer is `Fix nothing`, the picker is dismissed, or nothing is selected, nothing is dispatched and `decline-close` runs. Choosing to fix anything authorizes the writes and a single local commit.
  - On Claude Code the round is one `AskUserQuestion` call. On opencode it is one `question` call when the picker accepts several questions, and one call per question, consecutively and in the same order, otherwise.
- `sai/commands/meta-review/direct-build-close.md` changes in four ways:
  - It drops the `direct-label` and `decline-label` parameters and the two-option selector, and delegates the round to `findings-selection.md`.
  - It no longer routes Questions or requirement/design-change findings to `/sai-1-spec` or `/sai-2-design`.
  - It forwards answered Questions with their answers as selected findings, and unanswered Questions in the labeled exclusion list.
  - It asks for "one revised round" after an excluded-finding dependency conflict.
- New `sai/policies/finding-state.md` defines a Question (a finding that needs an answer from the user, `Q*` in `review.md`) and a fixable finding (any finding that is not a Question). It needs no report field and no worker judgment, and it routes no finding to another command.
- `sai/commands/meta-review/coordinator.md` and `sai/commands/review/coordinator.md` supply only `input` and `decline-close` to the close. The meta-review coordinator's zero-audit branch and `command-bootstrap.md` now say that open fixable findings and open Questions receive the round, and they no longer mention blocked-finding explanations.
- `docs/commands/sai-5-review.md` and `docs/commands/sai-review.md` describe the round for both harnesses. The `/sai-5-review` documentation keeps the stale-audit notice for the on-disk audits.
- `test/review-coordinator-worker.test.js` asserts the round wording, the removed labels, and the finding-state definition.

## Capabilities

### New Capabilities

- `finding-state`: a single definition of a Question and a fixable finding for the Direct Build close.

### Modified Capabilities

- `review-direct-build-close`: the selector and the two-step findings selection become one round with one question per report. Questions are answered in the round, and an invalid answer gets one retry.
- `findings-driven-fix`: no finding is routed to `/sai-1-spec` or `/sai-2-design`; answered Questions join the fix input; a dependency conflict asks for one revised round.
- `standalone-close-selector`: the standalone two-option selector and its dismissal semantics become the round; the zero-audit branch drops blocked-finding explanations.
- `composition-terminal-report`: the zero-audit literal applies when no report qualifies for the round.
- `conditional-audit-activation`: the zero-audit and illegible-triage scenarios describe the round.

## Impact

- New: `sai/policies/finding-state.md`
- Modified: `sai/commands/meta-review/findings-selection.md`, `sai/commands/meta-review/direct-build-close.md`, `sai/commands/meta-review/coordinator.md`, `sai/commands/meta-review/command-bootstrap.md`, `sai/commands/review/coordinator.md`, `docs/commands/sai-5-review.md`, `docs/commands/sai-review.md`, `test/review-coordinator-worker.test.js`
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Originating issue: https://github.com/mmadariaga/shared-ai/issues/66 (slice 3 of 4). `/sai-5-review` keeps passing the on-disk audits to the close with its stale-audit notice, so their findings can be selected in the round. Undecided: whether the opencode `question` tool accepts several questions in one call; the repository states only that it has no option cap (affects I7).
