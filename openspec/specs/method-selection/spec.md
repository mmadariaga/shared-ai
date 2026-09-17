# method-selection Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Method-first selection gate
The system SHALL ask exactly Which integration method do you want to use? with ordered options Merge (merge) / Rebase (rebase) before branch selection when fast-track is inactive.
#### Scenario: Ask method before branch
- **WHEN** a merge invocation starts in normal mode with a clean worktree and no integration in progress
- **THEN** the worker returns the method question before any branch question and advances only on a merge or rebase answer

### Requirement: Fast-track method pinning
The system SHALL pin the method to merge without asking and never show the squash question when fast-track is active.
#### Scenario: Fast-track skips method and squash
- **WHEN** fast-track is active at invocation start
- **THEN** the flow proceeds directly to branch selection as merge and the squash gate never appears

### Requirement: Method abandonment safety
The system SHALL perform no mutation when the method, branch, or squash question is abandoned.
#### Scenario: Abandon method question
- **WHEN** the user abandons the method question
- **THEN** no branch selection, launch, unification, rebase, staging, or commit occurs
#### Scenario: Abandon branch question
- **WHEN** the user abandons the branch question
- **THEN** no launch, unification, rebase, staging, or commit occurs
#### Scenario: Abandon squash question
- **WHEN** the user abandons the squash question
- **THEN** no unification, rebase, staging, or commit occurs

### Requirement: Method-aware branch question
The system SHALL ask Which branch do you want to merge? for method merge and Which branch do you want to rebase onto? for method rebase, with exact branch-name values.
#### Scenario: Rebase branch wording
- **WHEN** the selected method is rebase
- **THEN** the branch question uses the rebase-onto wording and records the selected branch as the rebase target
