# `/sai-worktree`

## Command function

Manages Git worktrees linked to the project. It allows users to view existing worktrees, create one for isolated work, and remove it when it is no longer needed.

## Flags and behavior modifiers

It has no documented behavior flags. It presents an interactive menu with the `Create`, `Delete`, and `Exit` actions.

## In detail

The command starts by showing the available worktrees and lets the user choose what to do. Creating a worktree prepares a separate working folder and an associated branch, so another task can be worked on without mixing files with the main folder.

Names follow a predictable convention: each new folder uses the first available number and its branch uses the same number. This makes it easy to relate a folder to its branch and create several without choosing names manually.

Deleting a worktree removes that linked folder and allows completed work to be cleaned up. The action is performed from the menu, and the command always allows the user to exit without changing anything.

After creating a worktree, the command attempts to prepare the information needed for code searches in it. This preparation is optional: if it cannot be completed, the worktree is still valid and the result is reported.
