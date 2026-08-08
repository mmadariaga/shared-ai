# worktree-inventory Specification

## Purpose

TBD: worktree inventory rendering for the `/sai-worktree` command.

## Requirements

### Requirement: Repository resolution through the common git directory

The `/sai-worktree` command SHALL resolve the repository via `git rev-parse --git-common-dir` and SHALL derive all worktree paths from that common directory, never from the current working directory.

#### Scenario: Invoked from the main worktree
- **WHEN** the command is invoked from the main worktree
- **THEN** the inventory lists every registered worktree of the repository

#### Scenario: Invoked from a linked worktree
- **WHEN** the command is invoked from a linked worktree
- **THEN** the inventory lists every registered worktree of the same repository, including the main worktree, because resolution used the common git directory rather than the invoking path

### Requirement: Stale worktree pruning before rendering

The `/sai-worktree` command SHALL run `git worktree prune` before rendering the inventory, so that administrative entries for worktrees whose directories no longer exist do not appear in the listing.

#### Scenario: A worktree directory was deleted behind git's back
- **WHEN** a worktree directory was removed without `git worktree remove`
- **THEN** the inventory omits it after pruning, and the pruning touches only stale administrative records

#### Scenario: No stale entries present
- **WHEN** all registered worktrees still exist
- **THEN** pruning changes nothing in the rendered inventory

### Requirement: Inventory rendering with role marking

The `/sai-worktree` command SHALL render every registered worktree as its name — the basename of its directory — its path, and its branch, and SHALL mark the main worktree and the worktree the command is running in.

#### Scenario: Main worktree is marked
- **WHEN** the inventory is rendered
- **THEN** the main worktree is displayed with an explicit main marker alongside its name, path, and branch

#### Scenario: Invoked from a linked worktree
- **WHEN** the command is invoked from a linked worktree
- **THEN** that worktree is marked as the current one and the main worktree is marked separately, so the two roles never collide

#### Scenario: A worktree in detached HEAD state
- **WHEN** a registered worktree is in detached HEAD state and has no branch
- **THEN** the command renders it without a branch label instead of failing or inventing one
