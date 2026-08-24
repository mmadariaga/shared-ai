## MODIFIED Requirements

### Requirement: Recency-ordered local branch selection

The system SHALL offer every local branch except the current one as merge sources, ordered by full committer timestamp descending with exact branch-name ascending as the deterministic tie-break. Each option SHALL carry the exact branch name as its value and a label of the form `<branch> — last commit <YYYY-MM-DD>`. The branch question SHALL be `¿Qué rama quieres mergear?`.

#### Scenario: User picks a date-labeled source branch

- **WHEN** more than one local branch exists
- **THEN** the user selects an exact branch value from the deterministic date-labeled picker and the coordinator launches exactly `git merge <branch>` into the current branch

### Requirement: Runtime resolution scope gate

When conflicts exist and fast-track is inactive, the system SHALL offer only scope options whose categories are present in the conflict classification, preserving the canonical order of artifacts, code, and full scope. Fast-track SHALL select full scope without presenting this gate.

#### Scenario: Absent conflict categories are omitted

- **WHEN** a conflicted merge contains only code conflicts
- **THEN** the scope picker offers code and full scope without offering artifacts-only scope

### Requirement: Unconditional post-merge ADR/DDR collision pass

After every merge, clean or conflicted, the system SHALL scan existing ADR and DDR directories and return collision applicability as `not-applicable`, `no-collision`, `repair-required`, or `escalation-required`. Every proposed rename SHALL carry a family-aware assigned identifier and exact path, H1, index-label, and canonical-reference replacements.

#### Scenario: Collision applicability controls presentation

- **WHEN** the collision pass finds neither an ADR nor a DDR directory
- **THEN** the coordinator records `not-applicable` and does not render a pending collision TODO item

### Requirement: Explicit final-commit authorization

The system SHALL execute the merge commit only after explicit user authorization. The authorization presentation SHALL contain target branch, source branch, verification status, conflict result, collision result with applicability, and staged-file count without dumping the full staged-file list into the picker.

#### Scenario: Authorization uses compact context

- **WHEN** final staging is complete and the commit authorization question is pending
- **THEN** the user sees the compact merge summary and the unchanged `yes (Recommended)` and `no` options

## ADDED Requirements

### Requirement: Adaptive TODO follows the resolved merge path

The coordinator MUST render the canonical merge, scope, resolution, verification, collision, and authorization items only when their route conditions apply, and MUST clear the merge-owned surface at terminal closure without restoring displaced foreign entries.

#### Scenario: Fast-track conflict route skips scope

- **WHEN** a fast-track merge has conflicts
- **THEN** the TODO omits scope and renders the full-resolution route before verification
