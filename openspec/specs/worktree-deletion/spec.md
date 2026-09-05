# worktree-deletion Specification

## Purpose

TBD: safe worktree deletion for the `/sai-worktree` command.
## Requirements
### Requirement: Main and active worktrees are never deletion targets

The `/sai-worktree` command SHALL offer as deletion targets only worktrees other than the main worktree and the worktree the command is running in; both SHALL be excluded from the deletion choices.

#### Scenario: Main worktree is excluded
- **WHEN** the deletion target list is presented
- **THEN** the main worktree is not offered as a deletable target

#### Scenario: Active worktree is excluded
- **WHEN** the command is invoked from a linked worktree
- **THEN** that invoking worktree is not offered as a deletable target, while the other linked worktrees remain offerable

#### Scenario: No deletable targets remain
- **WHEN** the only registered worktrees are the main worktree and the currently active worktree
- **THEN** the command states that no deletable worktrees exist, does not present a target picker, and returns to the re-rendered inventory and selector

### Requirement: Uncommitted-work gating with explicit confirmation

When a selected deletion target has uncommitted changes (modified, staged, or untracked files), the `/sai-worktree` command SHALL first surface what would be lost and SHALL require explicit confirmation before any forced removal; without that confirmation the worktree SHALL NOT be removed. A clean target SHALL be removed without a forced-removal confirmation.

#### Scenario: Target with uncommitted modifications
- **WHEN** the selected target contains uncommitted changes
- **THEN** the command lists what would be lost and requires explicit confirmation before removing the worktree with force

#### Scenario: Forced removal is declined
- **WHEN** the user declines the forced-removal confirmation
- **THEN** the worktree is not removed and the command returns to the selector

#### Scenario: Clean target
- **WHEN** the selected target has no uncommitted changes
- **THEN** the worktree is removed without a forced-removal confirmation prompt

### Requirement: Separate branch-deletion question after removal

After removing a worktree, the `/sai-worktree` command SHALL ask — as its own closed-choice question, never implicitly — whether to delete that worktree's branch, and SHALL delete the branch only when the user confirms. When the removed worktree was in detached HEAD state and had no branch, the command SHALL NOT ask the branch-deletion question and SHALL NOT delete any branch.

#### Scenario: Detached-HEAD target skips the branch question
- **WHEN** the removed worktree was in detached HEAD state and had no branch
- **THEN** the command does not ask the branch-deletion question, deletes no branch, and returns to the selector

#### Scenario: Branch deletion declined
- **WHEN** the user declines the branch-deletion question after the worktree removal
- **THEN** the branch remains in the repository and the command returns to the selector

#### Scenario: Branch deletion confirmed
- **WHEN** the user confirms the branch-deletion question after the worktree removal
- **THEN** the branch is deleted and the command returns to the selector

### Requirement: Unmerged-commits warning before branch deletion

When the user confirms branch deletion, the `/sai-worktree` command SHALL run the tool's `delete-branch` sub-command, which SHALL refuse with `reason: "unmerged"` when the branch holds commits not merged into the main worktree's branch; the command SHALL then warn using the refusal `message` and SHALL require a further explicit confirmation before re-invoking `delete-branch` with `--force`. When the main worktree is in detached HEAD state and has no branch, the tool SHALL refuse with `reason: "merge-check-skipped"` because the unmerged-commits check cannot run, and the command SHALL re-present the branch-deletion question stating that the check was skipped, passing `--force` only on that informed confirmation.

#### Scenario: Branch is fully merged
- **WHEN** the branch to delete holds no commits absent from the main worktree's branch
- **THEN** `delete-branch` exits 0 and the branch is deleted on the confirmation without an additional warning

#### Scenario: Branch holds unmerged commits
- **WHEN** the branch to delete holds commits not present in the main worktree's branch
- **THEN** `delete-branch` refuses with `reason: "unmerged"` without deleting anything, and the command warns about the unmerged commits and requires a further explicit confirmation before re-invoking it with `--force`

#### Scenario: Main worktree is detached
- **WHEN** the branch-deletion question is confirmed while the main worktree is in detached HEAD state and has no branch
- **THEN** `delete-branch` refuses with `reason: "merge-check-skipped"` without deleting anything, and the command re-presents the branch-deletion question stating that the check was skipped, instead of silently proceeding

#### Scenario: The user declines after the warning
- **WHEN** the user declines the further confirmation after an unmerged or skipped-check refusal
- **THEN** the branch remains, no `--force` invocation is made, and the command returns to the selector

