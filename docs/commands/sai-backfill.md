# `/sai-backfill`

## Command function

Reconstructs the basic documentation for a change that was made directly in code without going through the full workflow.

## Flags and behavior modifiers

- `--staged`: uses changes staged for commit as the information source. It stops when nothing is staged.
- `--unstaged`: uses local changes that are not yet staged for commit, including untracked files.
- `--diff <sha>`: uses the difference between the current state and the specified commit.
- `--fast-track`: skips generated reconciliation questions, automatically continues after reporting specification conflicts, and accepts the change name from a `/sai-explore` block without confirmation, once a diff source is given.

## In detail

Both Claude Code and opencode check MODIFIED requirements against current
published specifications before draft delivery and again before materialization
or archive. Existing scenario names must remain in the same requirement.
Reordering, editing scenario text, and adding scenarios are allowed. An
intentional removal or rename needs an exact, scope-approved exception; worker
metadata alone is not approval. An unreadable or ambiguous comparison does not
count as a pass. Exception metadata stays temporary and is never archived.

The user identifies the manual change to regularize or chooses a change source using the available selector. The command studies that difference to separate what can be demonstrated from the code from what would only be an assumption.

It then interviews the user about the original intent: what problem was meant to be solved, why that behavior was chosen, and which boundaries mattered. It also looks for possible contradictions with existing documentation and presents them before drafting anything. Answers already present in a `/sai-explore` handoff block are reused, and their questions are skipped.

Using the answers and available evidence, it prepares a proposal and behavior criteria that can be justified. It does not invent technical decisions that are unsupported by the change or the answers. For that reason, it reconstructs the basic documentation but does not automatically create a detailed design, a complete task list, or interface contracts that would require new decisions.

A verified originating issue is retained as `backlog_origin` in the change's
`.openspec.yaml`, including on Direct Build runs. An existing valid origin is
preserved. Each child change keeps its own issue URL, not the parent's. A known
lost or unverifiable origin produces a warning without blocking the remaining
work; a change without an associated issue produces no warning. Archive commits
use the retained origin for closing references, which the pull request tool
includes in its description. Azure Boards closing references are not supported.

Before writing, it validates that the documents have the expected form. If they are valid, it saves them in the corresponding change; if information is missing or an unresolvable conflict appears, it stops and asks for a decision. `--fast-track` reduces these specific pauses, but it does not remove the questions needed to identify the change source or turn an assumption into a fact.
