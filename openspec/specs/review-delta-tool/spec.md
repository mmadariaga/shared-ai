# review-delta-tool Specification

## Purpose
Provides the deterministic working-tree snapshot and delta tool that the incremental coordinator review loops use to compute what a fix round changed, without touching the real index, the staging, or the working tree.

## Requirements

### Requirement: Working-tree snapshot through a temporary index

`sai/tools/review-delta.js snapshot [path ...]` SHALL write a Git tree object of the working tree and report its identifier as JSON with verdict `clean`. It SHALL create a temporary index in a private directory under the SAI temp root (`temp-root.js`), load it with `git read-tree HEAD` when HEAD exists, run `git add -A`, force-add with `git add -f` each named path that exists inside the repository, run `git write-tree`, and remove the private directory whatever happens. `GIT_INDEX_FILE` SHALL apply only to those child processes: the real index, the user's staging, and the working tree SHALL never be modified. Untracked files SHALL enter the snapshot; ignored paths SHALL enter it only when named.

#### Scenario: Staging is untouched
- **WHEN** a snapshot is taken while the user has staged and unstaged changes and an untracked file
- **THEN** the tree includes all of them and the real index is unchanged afterwards

#### Scenario: A named ignored path
- **WHEN** a git-ignored path the loop changed is passed as an argument
- **THEN** it enters the snapshot tree

### Requirement: Delta between two trees

`sai/tools/review-delta.js delta <from> <to>` SHALL report the paths that differ between two tree-ish references, each with its status, and their diff, with verdict `changed`, or verdict `empty` when nothing differs. A reference that is not a valid tree-ish name or does not resolve SHALL be a usage error with exit code 2.

#### Scenario: Nothing changed
- **WHEN** both references name the same tree
- **THEN** the verdict is `empty` with no paths and an empty diff

### Requirement: No result reports n/a

When no result is possible (not a Git repository, Git unavailable, or the SAI temp root unusable) the tool SHALL report verdict `n/a` with a reason and exit code 0, so the caller reviews the full diff instead. Usage errors and unexpected Git failures SHALL exit with code 2.

#### Scenario: Outside a repository
- **WHEN** `snapshot` runs in a directory that is not a Git repository
- **THEN** it reports verdict `n/a` with reason `not-a-git-repository` and exits 0
