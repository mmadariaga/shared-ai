# `/sai-2-design`

## Command function

Turns an approved proposal into an understandable, actionable technical design. It describes the chosen solution, its important decisions, its trade-offs, and an ordered task list.

## Flags and behavior modifiers

- `--overview-lang <language>`: generates an optional `change-overview.md` in that language at the end of the run. Without it, no overview is generated.
- `--fast-track` and `--supervised`: accepted and ignored. The command asks no approval and prints no banner.

Supply the change name before the options, for example `/sai-2-design my-change --overview-lang Spanish`. Text after the name is feedback: on a change that already has `design.md`, `/sai-2-design my-change <feedback>` runs the same cycle over the design artifacts with the feedback as its input.

## In detail

The command always runs unattended. Invoking it approves the reviewed specs and records that approval. A worker then explains how the solution could be built without modifying project code. Research reuses the proposal, specs, and any existing design, investigates gaps, and resolves blocking questions before producing tasks. The command answers a worker question itself when the artifacts or the repository settle it, records the answer as an assumption with its source, and escalates to you only what nothing settles. It runs the mechanical checks, reviews the artifacts in up to three incremental rounds, and commits the segment's own paths locally. The assumptions and any findings still open after the third round are listed once in the closing report and are not written to the repository.

The result clarifies which parts need to change, how they relate to one another, which alternatives were considered, and why one option was chosen. It also breaks the work into ordered tasks so each step has a clear objective and can be checked before moving on.

For each step, it makes clear which public interfaces or behaviors must exist and which checks will demonstrate that the step works. This keeps design, implementation, and verification aligned.

The outputs are `design.md`, `tasks.md`, and `interfaces.md`. Each task has a
category, context size, and difficulty judged for the later implementer. Tasks
map one-to-one to implementation Steps; each must leave a buildable, passing
commit boundary, including any existing tests it breaks. Public signatures and
exact test assertions live in `interfaces.md`, while project conventions and
commands accompany the tasks.

Without `proposal.md` and specs the command stops before any dispatch. It ends when the design is complete and does not implement the solution or execute tasks from the plan. In normal use, it stops so the user can review the design before running [`/sai-3-implement`](sai-3-implement.md) or [`/sai-build`](sai-build.md). [`/sai-plan`](sai-plan.md) runs this command after `/sai-1-spec` in one invocation.
