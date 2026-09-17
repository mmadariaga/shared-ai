# rebase-paths Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Plain and squashed rebase execution
The system SHALL execute plain rebase as git rebase of the current branch onto the selected branch, and squashed rebase as prior unification followed by git rebase of that single commit, with pushed-branch rewrite risk remaining the user's responsibility and no push-safety handling.
#### Scenario: Execute squashed rebase
- **WHEN** the rebase path with squash Yes is authorized after provenance capture
- **THEN** the coordinator unifies the commits, runs git rebase onto the selected branch, and reuses the merge resolution, verification, and authorization flow

### Requirement: Rebase conflict reuse
The system SHALL route rebase conflicts through the same existing resolution, verification, and commit-authorization flow as the merge path, with conflicts per replayed commit without squash and at most at one point with squash.
#### Scenario: Resolve rebase conflict like merge
- **WHEN** a rebase produces conflicts reported via git diff name-only diff-filter U
- **THEN** the worker analyzes base, ours, and theirs versions and proposes the complete global strategy under the same gates

### Requirement: Rebase progress and finalization
The system SHALL render the TODO as Rebase target onto source for method rebase, require method-aware authorization Finalize the rebase onto selected-branch?, and finalize via git rebase --continue until completion with HEAD SHA and subject shown.
#### Scenario: Authorize rebase finalization
- **WHEN** the incremental collision pass completes and all renames and reference updates are staged
- **THEN** the worker returns the rebase finalization question with method, squash choice, target, source target, verification, conflict, collision, and staged-file count
