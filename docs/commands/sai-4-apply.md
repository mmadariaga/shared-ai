# `/sai-4-apply`

## Command function

Executes the previously prepared implementation plan in the project. It adds or changes code, runs the associated tests, and progresses through the steps until the solution is complete.

## Flags and behavior modifiers

- `--fast-track`: authorizes the commits in the process, gathers checks that require human review at the end, and automatically keeps the run on the current branch.

## In detail

The command takes the written plan and works through its steps in the stated order. For each step, it first prepares the check that must demonstrate the behavior and confirms that the check fails before applying the solution. It then makes the smallest necessary change and runs the check again until it passes.

After each step, it shows which files changed and checks that the result matches the planned work. In normal use, it asks for authorization before creating each commit, so the user retains control over what is saved in the history.

After all steps are complete, it presents checks that require human validation, such as reviewing a visual result or confirming behavior that an automated test cannot assess. With `--fast-track`, these checks do not disappear: they are grouped at the end and commits are pre-authorized.

If a test or build fails, the command stops at the affected step so the problem can be corrected before continuing. It does not consider an implementation complete just because the changes have been written.
