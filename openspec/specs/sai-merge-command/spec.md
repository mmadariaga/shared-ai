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

The system SHALL offer every local branch except the current one as merge sources, ordered by full committer timestamp descending with exact branch-name ascending as the deterministic tie-break. Each option SHALL carry the exact branch name as its value and a label of the form `<branch> — last commit <YYYY-MM-DD>`. The branch question SHALL be `¿Qué rama quieres mergear?`.

#### Scenario: User picks the source branch

- **WHEN** more than one local branch exists
- **THEN** the user picks one from a recency-ordered picker and the coordinator launches exactly `git merge <branch>` into the current branch

#### Scenario: User picks a date-labeled source branch

- **WHEN** more than one local branch exists
- **THEN** the user selects an exact branch value from the deterministic date-labeled picker and the coordinator launches exactly `git merge <branch>` into the current branch

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

When conflicts exist and fast-track is inactive, the system SHALL offer only scope options whose categories are present in the conflict classification, preserving the canonical order of artifacts, code, and full scope. Fast-track SHALL select full scope without presenting this gate.

#### Scenario: Fast-track auto-applies full scope

- **WHEN** the envelope carries `--fast-track` and conflicts exist
- **THEN** full scope is applied automatically without the scope question

#### Scenario: Absent conflict categories are omitted

- **WHEN** a conflicted merge contains only code conflicts
- **THEN** the scope picker offers code and full scope without offering artifacts-only scope

### Requirement: Bounded verification loop

The system SHALL detect the project's test suite from project metadata, run it after resolutions are staged, and iterate proposed corrections for at most three rounds before surfacing the remaining failures for human decision.

#### Scenario: Suite failure exhausts the budget

- **WHEN** the detected suite still fails after the third correction round
- **THEN** the remaining failures are reported and the resolved-and-staged state is left uncommitted for human decision

### Requirement: Unconditional post-merge ADR/DDR collision pass

After every merge, clean or conflicted, the system SHALL scan existing ADR and DDR directories and return collision applicability as `not-applicable`, `no-collision`, `repair-required`, or `escalation-required`. Every proposed rename SHALL carry a family-aware assigned identifier and exact path, H1, index-label, and canonical-reference replacements.

#### Scenario: Numeric collision repaired

- **WHEN** two `0010-*.md` files coexist after a merge
- **THEN** the older file becomes `0010a-…md`, the newer becomes `0010b-…md` per commit dates, and index links, pinned relationship tokens, and openspec mentions are updated to the suffixed names

#### Scenario: Orphan reference is reported, never invented

- **WHEN** a reference points to a number matching no file after renaming
- **THEN** it is reported as an orphan and left unmodified

#### Scenario: Collision applicability controls presentation

- **WHEN** the collision pass finds neither an ADR nor a DDR directory
- **THEN** the coordinator records `not-applicable` and does not render a pending collision TODO item

### Requirement: Explicit final-commit authorization

The system SHALL execute the merge commit only after explicit user authorization. The authorization presentation SHALL contain target branch, source branch, verification status, conflict result, collision result with applicability, and staged-file count without dumping the full staged-file list into the picker.

#### Scenario: Authorization declined

- **WHEN** the user answers no to the final-commit ask
- **THEN** the resolved-and-staged state remains, the current branch, merged branch, staged files, manual-commit and revert paths are documented, and no commit executes

#### Scenario: Authorization uses compact context

- **WHEN** final staging is complete and the commit authorization question is pending
- **THEN** the user sees the compact merge summary and the unchanged `yes (Recommended)` and `no` options


### Requirement: Adaptive TODO follows the resolved merge path

The coordinator MUST render the canonical merge, scope, resolution, verification, collision, and authorization items only when their route conditions apply, and MUST clear the merge-owned surface at terminal closure without restoring displaced foreign entries.

#### Scenario: Fast-track conflict route skips scope

- **WHEN** a fast-track merge has conflicts
- **THEN** the TODO omits scope and renders the full-resolution route before verification
