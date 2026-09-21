# `/sai-commit`

## Command function

Prepares a commit message from changes that are already staged and creates the commit only after receiving explicit authorization.

## Flags and behavior modifiers

It has no documented behavior flags. It works with the changes that are staged for commit.

## In detail

The command reviews which files are staged and studies the project's last 20 commits to recognize its usual style. It looks at whether they use types, scopes, titles, explanatory bodies, or specific conventions.

Using that information, it drafts a message that accurately describes what will be saved. Before executing anything, it shows a summary of the staged files and changes so the user can confirm that the set is correct.

The user decides whether to authorize the commit. If approved, the command creates it with the proposed message. If the user rejects it or requests changes, no commit is created until new authorization is received. The command does not invent changes or stage files that were not already ready.
