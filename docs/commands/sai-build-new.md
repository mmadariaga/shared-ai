# `/sai-build-new`

## Command function

Runs a change's build in one invocation. It chains two segments: [`/sai-3-implement-new`](sai-3-implement-new.md), then one pass of [`/sai-4-review-new`](sai-4-review-new.md), and closes with a findings summary for you to triage.

## Flags and behavior modifiers

- `--fast-track`: accepted and ignored. Local commits are authorized by invoking the command.

## In detail

The command runs the implementation segment and the review segment in the same session, with no approval between segments. The behavior, preconditions, checks, and stops of each segment are the ones described in [`/sai-3-implement-new`](sai-3-implement-new.md) and [`/sai-4-review-new`](sai-4-review-new.md).

The review segment starts only when the implementation segment completes, including a run that found no new work. When the implementation segment is blocked, stopped, or fails its preconditions, the command prints that report, names `build-log.md` when the segment wrote one, ends without the closing line, and starts no review.

The command runs exactly one review pass and never implements findings. After the review it prints the finding counts by category (Critical, High, Medium, Low, Questions) and the recommended audits, and runs no audit. When open fixable findings exist, it invites you to review `review.md`, delete the findings you do not want applied, and run `/sai-3-implement-new {change}`. Questions stay open until you answer them, because `/sai-3-implement-new` applies only fixable findings. Rerunning `/sai-build-new` applies the findings and reviews again. With zero findings, the command reports the zero counts and omits the invitation. When the diff has no changes against the parent branch, it says that no review ran.

The command ends with `Build-new done.` after the review segment ends normally. When the review segment fails, is stopped, or cannot start, the command prints both reports and ends without the closing line.

The command does not replace `/sai-build`, `/sai-3-implement`, or `/sai-4-apply`. They stay as they are while the new commands coexist with them.
