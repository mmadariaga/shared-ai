# green-skeleton-completion Specification

## Purpose
TBD - created by archiving change implement-detail-range. Update Purpose after archive.

## Requirements

### Requirement: GREEN may read the Step's tests

The GREEN worker contract (`sai/commands/apply/green-worker.md`) SHALL state that the GREEN worker may read the Step's tests, including in recovery continuations. Creating or modifying a test file SHALL remain forbidden absolutely, including during recovery.

#### Scenario: GREEN reads a test during recovery
- **WHEN** a GREEN worker resumes on a `continue_after_recovery` continuation for a Step with a RED block
- **THEN** it may read that Step's test files and still creates or modifies no test file

### Requirement: GREEN completes the plan's instruction for each file

The GREEN worker contract SHALL state that the plan's GREEN block gives each file one instruction: complete content to copy, a skeleton to complete, or described content to write. For a skeleton, the GREEN worker SHALL read the Step's tests and finish every `TODO(sai-4)` comment as its what/how states, keeping the `interfaces.md` signatures. The Step SHALL be done when the Step test passes and no `TODO(sai-4)` remains in the GREEN worker's files.

#### Scenario: Skeleton completed
- **WHEN** a GREEN block names `src/feature.js` under `Complete the skeleton below in`
- **THEN** the GREEN worker writes the code each `TODO(sai-4)` describes, removes every marker, and reports done only once the Step test passes

### Requirement: The split-flow GREEN disclosure names the Step's test paths

In the split flow, the GREEN task disclosure (`sai/commands/apply/steps/routing-split-flow.md`) SHALL contain the Step's GREEN body, its production allowed files, the same Step test command RED received, the same writing profile, and the paths of the Step's test files as read-only references. It SHALL never include declared interfaces.

#### Scenario: GREEN dispatch after a valid RED
- **WHEN** the coordinator dispatches GREEN after a valid RED result
- **THEN** the disclosure lists the Step's test file paths as read-only references and contains no declared interface
