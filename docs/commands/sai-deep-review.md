# `/sai-deep-review`

## Command function

Runs a general review and, based on what it finds, runs the relevant specialized audits in the same run: security, performance, or accessibility. It then judges the findings itself and fixes the ones it leaves to fix through [`/sai-3-implement`](sai-3-implement.md). It runs with no human in the loop. Works in Claude Code and opencode.

## Flags and behavior modifiers

- `--fast-track`: accepted and ignored. The command already runs with no human in the loop.
- `--parent-branch <branch>`: the branch the review and the audits compare the change against.
- `--full`: audits the whole repository instead of only the diff.
- `--path <dir>`: audits one path instead of only the diff.
- `--tier backend|frontend|db|queue`: limits the performance audit to one tier.
- `--runtime`: lets the performance and accessibility audits run their read-only diagnostics and browser checks. The flag is the whole authorization: no question asks for it.
- `--url <url>`: the dev-server URL for the accessibility browser checks. It is an input, not an authorization. With `--runtime`, an accessibility audit that runs, and no `--url`, the command asks you for the URL once, before the audits start, and lets you decline. It is the only question the command asks of its own, apart from the audit-worker question described below.

Write the change name first, then the options, or omit the name to use the only change that has a `proposal.md`; with none or several, the command prints the candidates and stops. Each step receives only the options its own command accepts: the general review takes just `--parent-branch` and always reviews the diff. With `--full` or `--path`, the three audits run after review without consulting its recommendations. If the review finds no changes, the command ends with no audits and no fix even then. An option meant for an audit that did not run has no effect, and the final summary says so. An option that no step accepts stops the command before anything runs. Write the comparison branch as `--parent-branch <branch>`.

## In detail

The command first performs a general review of the complete set of modifications with [`/sai-4-review`](sai-4-review.md), which writes and commits `review.md`. It then checks which areas are actually affected and decides which additional audits make sense.

By default, sensitive data, identity, or permissions may activate security; queries, rendering, and growing workloads may activate performance; interface changes may activate accessibility. `--full` and `--path` override that filtering and activate all three audits, while general review remains diff-scoped.

The general review completes before the specialized audits begin. The activated audits then run in parallel, each as the same cycle that [`/sai-5-security`](sai-5-security.md), [`/sai-6-performance`](sai-6-performance.md), and [`/sai-7-accessibility`](sai-7-accessibility.md) run on their own. Each audit regenerates its report and commits only that report. If an audit fails or runs out of attempts, the others finish, the summary shows each audit's status, and the findings of the failed audit are not judged or fixed. A question from an audit worker is answered from the change, its artifacts, or the repository when they answer it, and is listed as an assumption in the summary. When nothing answers it and the answer would change the report, the command asks you through the picker; only that audit waits while the others continue. A question whose answer would not change the report is answered with the best reading and listed as an assumption.

Each recommendation must read exactly `Yes` or `No`. Any other value is illegible: that audit does not run and the summary carries a warning. If the review report is missing, or none of the three recommendations is legible, the command reports the gap and ends without judging or fixing anything.

The command then runs an **Assessment pass** over `review.md` and the reports of the audits that finished. It judges each fixable finding on its own and either leaves it to fix or appends ` (EXCLUDED: <reason>)` to its heading, with a concrete one-line reason. Impact, cost, and risk of the correction are things it may weigh; no severity cutoff applies. Questions stay open for you, and no mark is written on them. Each report that received a mark is committed alone. When the change has no `tasks.md`, no `proposal.md`, or no spec file, the command skips the Assessment pass and the fix, and prints `Cannot start /sai-3-implement for {name}: missing {items}.` after the summary. When every fixable finding is excluded, or none exists, no fix runs.

Otherwise it runs a `/sai-3-implement` segment on the findings left to fix: RED → GREEN per step, an adversarial review of each step, one local commit per step, a ` (FIXED)` mark on each resolved finding, and the unit and integration suites against the baseline recorded before the first step.

The summary lists the finding counts, each audit's status, what was fixed, what was excluded with its reason, what the fix segment left open, and the Questions that stay open. To apply an excluded finding, remove its ` (EXCLUDED: …)` mark from the report and run `/sai-3-implement {name}`. The command ends with `Deep review done.`.

The run commits `review.md` once, each verified audit report once, each report the Assessment pass marked once, and then once per fix step. When the fix segment fixed a finding, it ends with one more local commit that stores the inherent-risk ratings block in `review.md` (see [`/sai-3-implement`](sai-3-implement.md)). A report the project ignores stays on disk uncommitted. The run adds no other commit and never pushes.

A rerun of an interrupted run regenerates `review.md` and the activated audit reports and judges every finding again, because the Assessment pass keeps no memory. Only the fix segment resumes, through `/sai-3-implement`'s own resume. See [review scope, reports, and fix selection](../review-triage.md) for the complete workflow.
