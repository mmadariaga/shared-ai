# `/sai-deep-review`

## Command function

Runs a general review and, based on what it finds, activates the relevant specialized audits in the same run: security, performance, or accessibility. It then lets you select the findings to fix and fixes them through [`/sai-3-implement`](sai-3-implement.md). Works in Claude Code and opencode.

## Flags and behavior modifiers

- `--fast-track`: is treated as a no-op modifier. The command has no approvals of its own to accelerate and does not activate fast-track mode in any audits it recommends.
- `--parent-branch <branch>`: the branch the review and the audits compare the change against.
- `--full`: audits the whole repository instead of only the diff.
- `--path <dir>`: audits one path instead of only the diff.
- `--tier backend|frontend|db|queue`: limits the performance audit to one tier.
- `--runtime`: lets the performance and accessibility audits run their read-only diagnostics and browser checks, each after you authorize it. It is the only option that makes the command ask a question mid-run; without it the command asks nothing between choosing the change and the findings round.

Write the change name first, then the options, or omit the name to use the change picker. Each step receives only the options its own command accepts: the general review takes just `--parent-branch` and always reviews the diff. With `--full` or `--path`, the three audits run after review without consulting its recommendations. If the review finds no changes, the command ends with no audits and no fix even then. An option meant for an audit that did not run has no effect, and the final summary says so. An option that no step accepts stops the command before anything runs. Write the comparison branch as `--parent-branch <branch>`.

## In detail

The user identifies the change to review. The command first performs a general review of the complete set of modifications with [`/sai-4-review`](sai-4-review.md), which writes and commits `review.md`. It then checks which areas are actually affected and decides which additional audits make sense.

By default, sensitive data, identity, or permissions may activate security; queries, rendering, and growing workloads may activate performance; interface changes may activate accessibility. `--full` and `--path` override that filtering and activate all three audits, while general review remains diff-scoped.

The general review completes before the specialized audits begin; activated audits run concurrently. If an audit fails or is cancelled, the other audits continue and the final summary shows each audit's status.

Each recommendation must read exactly `Yes` or `No`. Any other value is illegible: that audit does not run and the summary carries a warning. If the review report is missing, or none of the three recommendations is legible, the command reports the gap, shows the changed files, and ends without offering to fix anything.

The findings round then asks one question per report with open findings: fix all fixable findings, fix nothing, or free text to exclude IDs and answer Questions. When you select at least one finding, the command marks every unselected fixable finding ` (EXCLUDED: …)` and runs a `/sai-3-implement` segment for the selected ones: RED → GREEN per step, an adversarial review of each step, one local commit per step, a ` (FIXED)` mark on each resolved finding, and the unit and integration suites against the baseline recorded before the first step. When nothing is selected, no fix runs and no commit is made. A change without `tasks.md` or `specs/` is reviewed and audited but cannot be fixed: the command prints which items `/sai-3-implement` is missing.

The run commits `review.md` once and then once per fix step. When the fix segment fixed a finding, it ends with one more local commit that stores the inherent-risk ratings block in `review.md` (see [`/sai-3-implement`](sai-3-implement.md)); when nothing is selected, or the project ignores `review.md`, that commit does not happen. The run adds no other commit and never pushes. See [review scope, reports, and fix selection](../review-triage.md) for the complete workflow and free-text examples.
