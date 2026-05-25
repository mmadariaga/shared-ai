## Why

When an idea crystallizes in explore mode, the agent outputs the "Ready to Propose" block — a structured handoff artifact that must be copy-pasted into a new chat. This block is currently subject to caveman compression, which risks losing nuance, omitting critical constraints, or leaving examples unwritten precisely when they are most needed.

## What Changes

- `sai/instructions/explore.md`: add an explicit rule that suspends caveman mode for the duration of the "Ready to Propose" block, allows unlimited verbosity, and permits inline examples when they aid clarity.

## Capabilities

### New Capabilities

- `explore-crystal-full-output`: During crystallization output (the "Ready to Propose" block and the instruction to open a new chat), caveman mode is suspended. The agent writes at whatever length and depth is needed to convey the idea faithfully, including examples.

### Modified Capabilities

<!-- Leave empty — no existing capability spec changes -->

## Impact

- `sai/instructions/explore.md` — rule added to the crystallization protocol (rule #2).
- No other files affected; this is a behavioral constraint on the explore instruction, not a code change.
