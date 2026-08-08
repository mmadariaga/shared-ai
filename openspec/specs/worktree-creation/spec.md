# worktree-creation Specification

## Purpose

TBD: worktree creation for the `/sai-worktree` command.

## Requirements

### Requirement: Default name from the main directory name plus the first free slot

The `/sai-worktree` command SHALL propose the default worktree name `<main-repo-directory-name>.worktree-<n>`, where `<main-repo-directory-name>` is the name of the main worktree's directory — never a hardcoded value — and `<n>` is the smallest positive integer such that neither the sibling directory `<main-repo-directory-name>.worktree-<n>` nor the branch `worktree-<n>` exists.

#### Scenario: Next slot after existing worktrees
- **WHEN** the repository has worktrees `worktree-1` and `worktree-2` with their sibling directories and branches
- **THEN** the command proposes `<main-repo-directory-name>.worktree-3`

#### Scenario: First free slot after a deletion
- **WHEN** the `worktree-2` directory and branch were deleted
- **THEN** the command proposes `<main-repo-directory-name>.worktree-2`, reusing the freed slot rather than skipping past it

#### Scenario: Name derives from the actual main directory
- **WHEN** the main worktree directory is named `my-project`
- **THEN** the proposal is `my-project.worktree-1`, never a hardcoded repository name

### Requirement: Custom name override through the picker's free-text option

The `/sai-worktree` command SHALL accept a user-supplied worktree name through the picker's free-text option and SHALL use that name instead of the default proposal when one is provided, subject to the custom-name validation requirement below.

#### Scenario: Custom name is used
- **WHEN** the user supplies a custom name at the creation prompt
- **THEN** creation uses the custom name and the default proposal is discarded

#### Scenario: Default proposal is accepted
- **WHEN** the user accepts the proposed default name
- **THEN** creation uses the proposed name unchanged

### Requirement: Sibling directory creation relative to the main worktree

The `/sai-worktree` command SHALL create the new worktree directory as a sibling of the main worktree directory, regardless of which worktree the command is invoked from, and SHALL never create a worktree nested inside an existing worktree.

#### Scenario: Invoked from the main worktree
- **WHEN** the command is invoked from the main worktree
- **THEN** the new directory is created beside the main worktree directory

#### Scenario: Invoked from a linked worktree
- **WHEN** the command is invoked from a linked worktree
- **THEN** the new directory is still created beside the main worktree directory, not inside the invoking worktree, preventing nested worktrees

### Requirement: Branch from the current HEAD

The `/sai-worktree` command SHALL create the new worktree on a new branch derived from the current HEAD — `worktree-<n>` for a default-named worktree, and for a custom-named worktree the suffix obtained by stripping a leading `<main-repo-directory-name>.` prefix from the custom name, falling back to the whole custom name when no such prefix is present — and SHALL refuse creation without mutating anything when the derived branch already exists.

#### Scenario: Default name yields the matching branch
- **WHEN** the accepted name is `<main-repo-directory-name>.worktree-3`
- **THEN** the branch `worktree-3` is created from the current HEAD and the new worktree checks it out

#### Scenario: Custom name without the repo prefix yields the custom branch
- **WHEN** the user supplies the custom name `feature-x`
- **THEN** the branch `feature-x` is created from the current HEAD and the new worktree checks it out

#### Scenario: Custom name carrying the repo prefix yields the matching branch
- **WHEN** the user supplies the custom name `<main-repo-directory-name>.worktree-9`
- **THEN** the leading `<main-repo-directory-name>.` prefix is stripped and the branch `worktree-9` is created from the current HEAD, so the new worktree's branch still matches the `worktree-<n>` convention

#### Scenario: Derived branch already exists
- **WHEN** the branch derived from the accepted name already exists
- **THEN** creation is refused, no worktree directory and no branch are created, and the conflict is surfaced to the user

### Requirement: Custom-name validation refuses invalid names without mutation

Before any mutation, the `/sai-worktree` command SHALL validate a user-supplied custom name and SHALL refuse creation — mutating nothing, surfacing the conflict, and returning to the selector — when the name contains a path separator or `..`, when the target sibling directory already exists, or when the derived branch is not a valid git refname.

#### Scenario: Name with a path separator or `..` is refused
- **WHEN** the user supplies a custom name containing a path separator or `..` (for example `feature/one` or `../outside`)
- **THEN** creation is refused, no directory and no branch are created, the conflict is surfaced, and the command returns to the selector

#### Scenario: Existing target directory is refused
- **WHEN** the sibling directory for the supplied custom name already exists
- **THEN** creation is refused, nothing is mutated, the conflict is surfaced, and the command returns to the selector

#### Scenario: Invalid git refname is refused
- **WHEN** the branch derived from the supplied custom name is not a valid git refname (for example it contains spaces or a `~`, `^`, `:`, or a trailing `.lock`)
- **THEN** creation is refused, nothing is mutated, the conflict is surfaced, and the command returns to the selector
