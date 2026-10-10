# `/sai-2-design`

## Command function

Turns an approved proposal into an understandable, actionable technical design. It describes the chosen solution, its important decisions, its trade-offs, and an ordered task list.

## Flags and behavior modifiers

- `--fast-track`: enables the phase's fast-track behavior; invoking design already approves the specs without a separate confirmation.
- `--overview-lang <language>`: generates an optional `change-overview.md` in that language after the design feedback loop. Without it, standalone design generates no overview.

Supply the change name before the options, for example `/sai-2-design my-change --overview-lang Spanish`.

## In detail

Invoking the command approves the reviewed specs and records that approval. It then explains how the solution could be built without modifying project code. Research reuses the proposal, specs, and any existing design, investigates gaps, and resolves blocking questions before producing tasks.

The result clarifies which parts need to change, how they relate to one another, which alternatives were considered, and why one option was chosen. It also breaks the work into ordered tasks so each step has a clear objective and can be checked before moving on.

For each step, it makes clear which public interfaces or behaviors must exist and which checks will demonstrate that the step works. This keeps design, implementation, and verification aligned.

The outputs are `design.md`, `tasks.md`, and `interfaces.md`. Each task has a
category, context size, and difficulty judged for the later implementer. Tasks
map one-to-one to implementation Steps; each must leave a buildable, passing
commit boundary, including any existing tests it breaks. Public signatures and
exact test assertions live in `interfaces.md`, while project conventions and
commands accompany the tasks.

The command ends when the design is complete. It does not implement the solution or execute tasks from the plan. In normal use, it stops so the user can review the design before requesting detailed implementation preparation.
