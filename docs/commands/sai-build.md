# `/sai-build`

## Command function

Runs a change's build in one invocation. It chains [`/sai-3-implement`](sai-3-implement.md), then one pass of [`/sai-4-review`](sai-4-review.md), assesses the review findings itself, runs `/sai-3-implement` again for the findings it selects, and closes with the lists of fixed, excluded, and left-open findings.

## Flags and behavior modifiers

- `--fast-track`: accepted and ignored. Local commits are authorized by invoking the command.

## In detail

The command runs the implementation segment, the review segment, and the fix segment in the same session, with no approval between segments. The behavior, preconditions, checks, and stops of each segment are the ones described in [`/sai-3-implement`](sai-3-implement.md) and [`/sai-4-review`](sai-4-review.md).

Each segment starts only when the previous one completes, including an implementation segment that found no new work. When the implementation segment or the fix segment is blocked, stopped, or fails its preconditions, the command prints that report, ends without the closing line, and starts no later segment.

The command runs exactly one review pass per run. Right after it, the command assesses each fixable finding of `review.md` itself and decides whether to fix it. It has no fixed rule, threshold, or severity cutoff: impact, the cost of the correction, and the risk of the correction are things it may weigh. It appends ` (EXCLUDED: <reason>)` to the heading of each finding it will not fix, never to a Question, and commits `review.md` alone when the project does not ignore it. The fix segment then applies the remaining findings and marks each one ` (FIXED)`. When it fixes at least one, it also stores the inherent-risk ratings block in `review.md` and commits it in its own local commit, as described in [`/sai-3-implement`](sai-3-implement.md). A build whose fix segment does not start leaves `review.md` without a ratings block, and [`/to-pr`](to-pr.md) computes the ratings. No review runs after the fixes. With no fixable finding, or when every fixable finding is excluded, the fix segment does not run.

The command then prints the finding counts by category (Critical, High, Medium, Low, Questions) and the recommended audits, and runs no audit. It lists the fixed findings, the excluded findings with their reasons, and the findings the fix segment left open with their reasons. To apply an excluded finding, remove its ` (EXCLUDED: …)` mark from `review.md` and run `/sai-3-implement {change}`. Questions stay open until you answer them, because the fix segment applies only fixable findings. Rerunning `/sai-build` reviews again and judges every finding from scratch. With zero findings, the command reports the zero counts and prints no list. When the diff has no changes against the parent branch, it says that no review ran.

The command ends with `Build done.` after the review segment ends normally. When the review segment fails, is stopped, or cannot start, the command prints both reports and ends without the closing line.
