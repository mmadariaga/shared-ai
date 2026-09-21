# `/sai-review`

## Command function

Runs a general review and, based on what it finds, activates the relevant specialized audits in the same run: security, performance, or accessibility.

## Flags and behavior modifiers

- `--fast-track`: is treated as a no-op modifier. The command has no approvals of its own to accelerate and does not activate fast-track mode in any audits it recommends.

## In detail

The user identifies the change to review. The command first performs a general review of the complete set of modifications and produces its conclusions. It then checks which areas are actually affected and decides which additional audits make sense.

If the change touches sensitive data, identity, or permissions, it may activate the security audit. If it changes queries, calculations, rendering, or processes that may grow, it may activate the performance audit. If it changes an interface, it may activate the accessibility audit. Only audits that match the affected surface are run.

The general review completes before the specialized audits begin, but everything is presented as one operation to the user. The command gathers the reports and recommendations; it does not fix problems or create commits.
