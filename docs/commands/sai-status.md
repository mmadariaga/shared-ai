# `/sai-status`

## Command function

Shows the state of project changes in a read-only panel and suggests what the next command should be.

## Flags and behavior modifiers

It has no documented behavior flags.

- With a change name, it shows the details for that change.
- Without a change name, it shows a table of all active changes.

## In detail

For a specific change, the command states which process documents exist, whether the proposal has been approved, how much of the implementation is complete, and where the change is located if it has already been archived.

It also presents a `Next:` suggestion based on the observed state. This suggestion points to the next reasonable action, such as preparing the design, writing the implementation plan, applying the plan, or reviewing the result.

When run without a name, it gathers the same essential information for each active change in a table. This makes it easy to see which work has started, which work is waiting for a phase, and which work can be cleaned up.

The command never modifies documents, code, branches, or state. It only reads and explains the current situation, so it can be used for orientation without accidentally moving work forward.
