# apply-coordinator-authority Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.
## Requirements
### Requirement: Subagent is barred from git, commits, and the STOP & COMMIT boundary

The Step-execution subagent SHALL NOT run any git operation, SHALL NOT create commits, and SHALL NOT cross a STOP & COMMIT marker. When a subagent's Step reaches a STOP & COMMIT, the subagent SHALL stop and report the STOP rather than acting on it.

#### Scenario: Subagent's Step reaches a STOP & COMMIT marker

- **WHEN** the subagent executing a Step encounters a STOP & COMMIT marker
- **THEN** the subagent halts, performs no git action and no commit, and returns a report indicating the STOP was reached (with the exact marker message)

#### Scenario: Subagent is tempted to stage or commit

- **WHEN** a Step's body contains "stage and commit" style wording
- **THEN** the subagent still performs no git or commit action; staging and committing remain the coordinator's responsibility under the human gate

### Requirement: Only the coordinator writes implementation.md

Checkbox marking and the deviations appendix in `implementation.md` SHALL be written ONLY by the coordinator, derived from the subagent's report. The subagent SHALL NOT modify `implementation.md`.

#### Scenario: Subagent finishes a Step with deviations

- **WHEN** the subagent reports deviations for a completed Step
- **THEN** the coordinator (not the subagent) writes those deviations into the `## Appendix: Plan vs Final Implementation` section and marks the Step's checkboxes

#### Scenario: Subagent never edits the plan document

- **WHEN** the subagent executes any Step
- **THEN** `implementation.md` shows no edits authored by the subagent; all checkbox and appendix edits trace to the coordinator

### Requirement: Human commit gate stays in the main thread

The STOP & COMMIT human authorization gate SHALL remain in the coordinator (main thread): the coordinator proposes the commit message and waits for explicit `y/n` authorization before running `git commit`, exactly as defined by the existing apply STOP & COMMIT checklist.

#### Scenario: Coordinator reaches a STOP & COMMIT after a Step's report

- **WHEN** the coordinator has verified a Step whose plan ends at a STOP & COMMIT
- **THEN** the coordinator proposes the commit message and asks the user `(y/n)`, committing only on explicit `y` and otherwise describing the staged changes for the user to commit themselves

