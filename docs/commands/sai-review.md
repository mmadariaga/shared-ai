# `/sai-review`

## Command function

Runs a general review and, based on what it finds, activates the relevant specialized audits in the same run: security, performance, or accessibility.

## Flags and behavior modifiers

- `--fast-track`: is treated as a no-op modifier. The command has no approvals of its own to accelerate and does not activate fast-track mode in any audits it recommends.
- `--parent-branch <branch>`: the branch the review and the audits compare the change against.
- `--full`: audits the whole repository instead of only the diff.
- `--path <dir>`: audits one path instead of only the diff.
- `--tier backend|frontend|db|queue`: limits the performance audit to one tier.
- `--runtime`: lets the performance and accessibility audits run their read-only diagnostics and browser checks, each after you authorize it. It is the only option that makes the command ask a question mid-run; without it the command asks nothing between choosing the change and finishing.

Write the change name first, then the options. Each step receives only the options its own command accepts: the general review takes just `--parent-branch` and always reviews the diff. With `--full` or `--path`, the three audits run without waiting for the review's recommendations, because those options ask to look beyond the diff. If the review finds no changes, the command ends with no audits even then. An option meant for an audit that did not run has no effect, and the final summary says so. An option that no step accepts stops the command before anything runs. The branch is no longer accepted as a bare second word: write `--parent-branch <branch>`.

## In detail

The user identifies the change to review. The command first performs a general review of the complete set of modifications and produces its conclusions. It then checks which areas are actually affected and decides which additional audits make sense.

If the change touches sensitive data, identity, or permissions, it may activate the security audit. If it changes queries, calculations, rendering, or processes that may grow, it may activate the performance audit. If it changes an interface, it may activate the accessibility audit. Only audits that match the affected surface are run.

The general review completes before the specialized audits begin, but everything is presented as one operation to the user. If an audit fails or is cancelled, the other audits continue and the final summary shows each audit's status.

Each recommendation must read exactly `Yes` or `No`. Any other value is illegible: that audit does not run and the summary carries a warning. If the review report is missing, or none of the three recommendations is legible, the command reports the gap, shows the changed files, and ends without offering to fix anything.

Afterwards the command offers the Direct Build close: fix the open findings and make one local commit. If the fix does not converge within three fix rounds, nothing is committed; the close says so, names the findings still open, and lists the modified files left uncommitted.
