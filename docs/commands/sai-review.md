# `/sai-review`

## Command function

Runs a general review and, based on what it finds, activates the relevant specialized audits in the same run: security, performance, or accessibility.

## Flags and behavior modifiers

- `--fast-track`: is treated as a no-op modifier. The command has no approvals of its own to accelerate and does not activate fast-track mode in any audits it recommends.

## In detail

The user identifies the change to review. The command first performs a general review of the complete set of modifications and produces its conclusions. It then checks which areas are actually affected and decides which additional audits make sense.

If the change touches sensitive data, identity, or permissions, it may activate the security audit. If it changes queries, calculations, rendering, or processes that may grow, it may activate the performance audit. If it changes an interface, it may activate the accessibility audit. Only audits that match the affected surface are run.

The general review completes before the specialized audits begin, but everything is presented as one operation to the user. If an audit fails or is cancelled, the other audits continue and the final summary shows each audit's status.

Each recommendation must read exactly `Yes` or `No`. Any other value is illegible: that audit does not run and the summary carries a warning. If the review report is missing, or none of the three recommendations is legible, the command reports the gap, shows the changed files, and ends without offering to fix anything.

Afterwards the command offers the Direct Build close: fix the open findings and make one local commit. If the fix does not converge within three fix rounds, nothing is committed; the close says so, names the findings still open, and lists the modified files left uncommitted.
