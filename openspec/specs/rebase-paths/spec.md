# rebase-paths Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Plain and squashed rebase execution

The system SHALL execute plain rebase as git rebase of the current branch onto the selected branch, and squashed rebase as prior unification followed by git rebase of that single commit, with pushed-branch rewrite risk remaining the user's responsibility and no push-safety handling. Each conflicted stop SHALL reuse the merge resolution and verification flow followed by invocation-authorized automatic local continuation rather than a finalization question.

#### Scenario: Execute squashed rebase

- **WHEN** the rebase path with squash Yes is authorized after provenance capture
- **THEN** the coordinator unifies the commits, runs git rebase onto the selected branch, and reuses the merge resolution, verification, and automatic local-finalization flow

### Requirement: Rebase conflict reuse

The system SHALL route rebase conflicts through the same full-scope resolution, mode-specific strategy handling, verification, and invocation-authorized local-finalization flow as the merge path, with conflicts per replayed commit without squash and at most at one point with squash. Later conflicts SHALL reuse the selected working language and same worker.

#### Scenario: Resolve rebase conflict like merge

- **WHEN** a rebase produces conflicts reported via git diff name-only diff-filter U
- **THEN** the worker analyzes base, ours, and theirs versions and proposes the complete global strategy over all affected files, followed by normal-mode approval or fast-track presentation-and-application where applicable

### Requirement: Rebase progress and finalization

The system SHALL render the TODO as Rebase target onto source for method rebase and SHALL automatically run `GIT_EDITOR=true git rebase --continue` at each resolved, reviewed, verified, and staged stop under command-local authorization. Missing verification SHALL be reported as unavailable and SHALL NOT block continuation through a new question. After the rebase finishes, the collision pass SHALL run on the final state; a staged collision repair SHALL be committed automatically, while a finished rebase with nothing staged SHALL create no additional commit. The coordinator SHALL show actual completion information and SHALL report failures without claiming finalization succeeded.

#### Scenario: Authorize rebase finalization

- **WHEN** the incremental collision pass completes and all renames and reference updates are staged
- **THEN** the worker returns a completed finalization report with method, squash choice, target, source, verification, conflict, collision, and staged-file count, and the coordinator commits the repair automatically without a finalization question

#### Scenario: Successive resolved stops continue automatically

- **WHEN** a resolved rebase stop passes the applicable checks and final staging
- **THEN** the coordinator continues automatically and reports a new conflict to the same worker in the selected language or routes a finished rebase to the final collision pass

#### Scenario: Finished rebase requires no extra commit

- **WHEN** the rebase has finished and no collision repair remains staged
- **THEN** the run reports the new HEAD without an additional commit or finalization question
