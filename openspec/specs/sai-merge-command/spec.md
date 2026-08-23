# sai-merge-command Specification

## Purpose

Defines the `/sai-merge` routed command: pre-merge environment guards, recency-ordered local branch selection, the coordinator-only mutation surface with a strictly read-only worker, categorized conflict resolution with escalation criteria, the fast-track-gated runtime resolution scope question, the bounded three-round verification loop, the unconditional post-merge ADR/DDR collision pass, and explicit final-commit authorization.

## Requirements
### Requirement: Pre-merge environment guards

The system SHALL run pre-merge environment checks before any merge work and SHALL refuse to start when the repository is unsafe.

#### Scenario: In-progress merge blocks a new run

- **WHEN** a `/sai-merge` invocation starts while `MERGE_HEAD` exists
- **THEN** the command stops with "Merge already in progress. Resolve or abort the current merge first (`git merge --continue` or `git merge --abort`)." and performs no merge step

#### Scenario: Dirty worktree requires confirmation

- **WHEN** the worktree reports modified, untracked, or staged files and no other guard fired
- **THEN** the user is asked to continue or stop before any branch listing or merge activity

### Requirement: Recency-ordered local branch selection

The system SHALL offer every local branch except the current one as merge sources, ordered by committer date descending, and SHALL stop cleanly when none exist.

#### Scenario: User picks the source branch

- **WHEN** more than one local branch exists
- **THEN** the user picks one from a recency-ordered picker and the coordinator launches exactly `git merge <branch>` into the current branch

### Requirement: Coordinator-only mutation surface

The system SHALL confine every mutating operation — merge launch, resolution writes, ADR/DDR renames, reference edits, staging, and commit execution — to the coordinator, while the worker remains strictly read-only.

#### Scenario: Worker never mutates

- **WHEN** the worker analyzes conflicts, proposes resolutions, scans collisions, or verifies the suite
- **THEN** it runs only read-only inspection and returns payloads, leaving all writes and git state changes to the coordinator

### Requirement: Categorized conflict resolution with criteria

The system SHALL classify each conflicted file as specs, ADR/DDR, or code, and SHALL propose resolutions per category: union or fusion for compatible spec divergences, labeled ours/theirs variants for genuinely divergent code regions, and escalation instead of auto-selection for true semantic contradictions.

#### Scenario: True contradiction escalates

- **WHEN** both sides modify the same requirement or scenario with incompatible semantics
- **THEN** the conflict is flagged for escalation and left unresolved rather than auto-picked

### Requirement: Runtime resolution scope gate

When conflicts exist and fast-track is inactive, the system SHALL ask whether to resolve artifacts only, code only, or full scope, and SHALL omit out-of-scope proposals into a deferred section.

#### Scenario: Fast-track auto-applies full scope

- **WHEN** the envelope carries `--fast-track` and conflicts exist
- **THEN** full scope is applied automatically without the scope question

### Requirement: Bounded verification loop

The system SHALL detect the project's test suite from project metadata, run it after resolutions are staged, and iterate proposed corrections for at most three rounds before surfacing the remaining failures for human decision.

#### Scenario: Suite failure exhausts the budget

- **WHEN** the detected suite still fails after the third correction round
- **THEN** the remaining failures are reported and the resolved-and-staged state is left uncommitted for human decision

### Requirement: Unconditional post-merge ADR/DDR collision pass

After every merge, clean or conflicted, the system SHALL scan `docs/adr/` and `docs/ddr/` for colliding numeric prefixes, assign lettered suffixes by ascending commit date (oldest = `a`), and propose the renames and repo-wide reference updates.

#### Scenario: Numeric collision repaired

- **WHEN** two `0010-*.md` files coexist after a merge
- **THEN** the older file becomes `0010a-…md`, the newer becomes `0010b-…md` per commit dates, and index links, pinned relationship tokens, and openspec mentions are updated to the suffixed names

#### Scenario: Orphan reference is reported, never invented

- **WHEN** a reference points to a number matching no file after renaming
- **THEN** it is reported as an orphan and left unmodified

### Requirement: Explicit final-commit authorization

The system SHALL execute the merge commit only after explicit user authorization, using the HEREDOC commit form with rules-derived message composition, and SHALL document the exact repository state when authorization is declined.

#### Scenario: Authorization declined

- **WHEN** the user answers no to the final-commit ask
- **THEN** the resolved-and-staged state remains, the current branch, merged branch, staged files, manual-commit and revert paths are documented, and no commit executes
