# worktree-selector-loop Specification

## Purpose

TBD: interactive Create / Delete / Exit selector loop for the `/sai-worktree` command.

## Requirements

### Requirement: Closed-choice selector through the native picker

The `/sai-worktree` command SHALL present a closed-choice selector offering exactly `Create`, `Delete`, and `Exit` through the harness-native option picker, per the "Closed-choice prompts" rule in `sai/policies/remember.md` (which gives the per-harness option-picker mapping), using full-word option labels.

#### Scenario: Selector on Claude Code
- **WHEN** the selector is presented on Claude Code
- **THEN** it appears through `AskUserQuestion` with three clickable options labeled `Create`, `Delete`, and `Exit`

#### Scenario: Selector on opencode
- **WHEN** the selector is presented on opencode
- **THEN** it appears through the `question` tool with one option per choice — `Create`, `Delete`, and `Exit` — single-select by default

### Requirement: Loop that re-renders after every action

After each terminal outcome of a Create or Delete action — completed, declined, canceled, refused, or failed — the `/sai-worktree` command SHALL re-render the inventory and re-present the selector. Only the `Exit` choice terminates the command.

#### Scenario: Creation is followed by a re-render
- **WHEN** a worktree is created
- **THEN** the inventory is re-rendered including the new worktree and the selector is presented again

#### Scenario: Deletion is declined and the loop continues
- **WHEN** a deletion or its branch-deletion question is declined
- **THEN** the command returns to the re-rendered inventory and selector instead of terminating

#### Scenario: Refused creation returns to the loop
- **WHEN** a creation is refused because the derived branch already exists or the custom name is invalid
- **THEN** the command re-renders the inventory and re-presents the selector instead of terminating

#### Scenario: Exit terminates
- **WHEN** the user chooses `Exit`
- **THEN** the command terminates and the selector is not presented again

### Requirement: No mutation without a user selection

The `/sai-worktree` command SHALL perform no worktree, branch, or checkout mutation except as the direct result of a user-selected Create or Delete action. The only git mutation outside a user selection is the inventory's `git worktree prune`, which removes stale administrative bookkeeping for already-removed worktrees and never touches a registered worktree, its files, or a branch.

#### Scenario: Exiting without any action
- **WHEN** the user exits the selector without having created or deleted anything
- **THEN** no worktree is created or removed and no branch is created or deleted

#### Scenario: Prune scope is bookkeeping-only
- **WHEN** the inventory runs on a repository with stale administrative entries
- **THEN** pruning removes only those stale records and never a registered worktree or its files
