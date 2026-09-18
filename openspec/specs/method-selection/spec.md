# method-selection Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Method-first selection gate
The system SHALL ask exactly `Which integration method do you want to use?` with ordered options `Merge (merge)` / `Rebase (rebase)` / `Rebase with squash (rebase-squash)` before branch selection when fast-track is inactive, where the third label is a presentation shortcut that fixes the existing pair `method=rebase` + `squash=yes` with no new method value or state.
#### Scenario: Third label maps to existing pair
- **WHEN** the user selects `Rebase with squash` in normal mode
- **THEN** the flow records `method=rebase` with `squash=yes` and proceeds to branch selection without any standalone squash gate
#### Scenario: Ask method before branch
- **WHEN** a merge invocation starts in normal mode with a clean worktree and no integration in progress
- **THEN** the worker returns the method question before any branch question and advances only on a merge, rebase, or rebase-squash answer

### Requirement: Fast-track method pinning
The system SHALL pin the method to `merge` without asking and SHALL show no squash choice when fast-track is active.
#### Scenario: Fast-track skips method and squash
- **WHEN** fast-track is active at invocation start
- **THEN** the flow proceeds directly to branch selection as `merge` and no squash choice appears in any mode

### Requirement: Method abandonment safety
The system SHALL perform no mutation when the method or branch question is abandoned, and no squash question exists to abandon in any mode. The former squash-abandonment scenario is retired with the gate.
#### Scenario: Abandon method question
- **WHEN** the user abandons the three-option method question
- **THEN** no branch selection, launch, unification, rebase, staging, or commit occurs
#### Scenario: Abandon branch question
- **WHEN** the user abandons the branch question
- **THEN** no launch, unification, rebase, staging, or commit occurs
#### Scenario: Abandon squash question
- **WHEN** the user abandons the squash question
- **THEN** no unification, rebase, staging, or commit occurs
Retirement note: the squash gate is retired so this trigger cannot occur in any mode and the scenario is preserved only against silent destruction.

### Requirement: Method-aware branch question
The system SHALL ask Which branch do you want to merge? for method merge and Which branch do you want to rebase onto? for method rebase, with exact branch-name values.
#### Scenario: Rebase branch wording
- **WHEN** the selected method is rebase
- **THEN** the branch question uses the rebase-onto wording and records the selected branch as the rebase target

### Requirement: Neutral branch question
The system SHALL ask exactly `Which branch do you want to operate on?` with single neutral text for all three method options and exact branch-name values, and SHALL carry the current branch plus the explicit direction in the gate summary because Batch 1 renders before the method answer exists.
#### Scenario: Neutral branch text with direction in summary
- **WHEN** Batch 1 presents the branch selector with any of the three method options pending
- **THEN** the question uses the neutral wording and the summary states the current branch plus whether the selected branch is the merge source or the rebase target
