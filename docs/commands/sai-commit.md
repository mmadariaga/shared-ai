# `/sai-commit`

## Command function

Prepares a commit message from changes that are already staged and creates the commit only after receiving explicit authorization.

## Flags and behavior modifiers

- `--scope <scope>` / `--type <type>`: force the Conventional Commits scope or type instead of inferring them.
- `--no-body`: write the subject line only.
- `--amend`: rewrite the latest commit instead of creating a new one. When that commit is already pushed, the command warns and asks for a second confirmation.

## In detail

The command reviews which files are staged and studies the project's last 20 commits to recognize its usual style. It looks at whether they use types, scopes, titles, explanatory bodies, or specific conventions.

Using that information, it drafts a message that accurately describes what will be saved. Before executing anything, it shows a summary of the staged files and changes so the user can confirm that the set is correct.

The user decides whether to authorize the commit. If approved, the command creates it with the proposed message. If the user rejects it or requests changes, no commit is created until new authorization is received. When sensitive-looking files are staged, it asks for confirmation before continuing. The command does not invent changes or stage files that were not already ready.
