# `/sai-2-design`

## Command function

Turns an approved proposal into an understandable, actionable technical design. It describes the chosen solution, its important decisions, its trade-offs, and an ordered task list.

## Flags and behavior modifiers

- `--fast-track`: automatically approves the specification proposal and continues without stopping for that confirmation.

## In detail

The command starts from a proposal that has already been reviewed. It confirms that the proposal is the working basis and then explains how the solution could be built without modifying code yet.

The result clarifies which parts need to change, how they relate to one another, which alternatives were considered, and why one option was chosen. It also breaks the work into ordered tasks so each step has a clear objective and can be checked before moving on.

For each step, it makes clear which public interfaces or behaviors must exist and which checks will demonstrate that the step works. This keeps design, implementation, and verification aligned.

The command ends when the design is complete. It does not implement the solution or execute tasks from the plan. In normal use, it stops so the user can review the design before requesting detailed implementation preparation.
