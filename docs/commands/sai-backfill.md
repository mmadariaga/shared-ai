# `/sai-backfill`

## Command function

Reconstructs the basic documentation for a change that was made directly in code without going through the full workflow.

## Flags and behavior modifiers

- `--staged`: uses changes staged for commit as the information source.
- `--unstaged`: uses local changes that are not yet staged for commit.
- `--diff <sha>`: uses the difference between the current state and the specified commit.
- `--fast-track`: skips generated reconciliation questions, automatically continues after reporting specification conflicts, and accepts an already established change name without confirmation.

## In detail

The user identifies the manual change to regularize or chooses a change source using the available selector. The command studies that difference to separate what can be demonstrated from the code from what would only be an assumption.

It then interviews the user about the original intent: what problem was meant to be solved, why that behavior was chosen, and which boundaries mattered. It also looks for possible contradictions with existing documentation and presents them before drafting anything.

Using the answers and available evidence, it prepares a proposal and behavior criteria that can be justified. It does not invent technical decisions that are unsupported by the change or the answers. For that reason, it reconstructs the basic documentation but does not automatically create a detailed design, a complete task list, or interface contracts that would require new decisions.

Before writing, it validates that the documents have the expected form. If they are valid, it saves them in the corresponding change; if information is missing or an unresolvable conflict appears, it stops and asks for a decision. `--fast-track` reduces these specific pauses, but it does not remove the questions needed to identify the change source or turn an assumption into a fact.
