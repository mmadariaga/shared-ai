# green-skeleton-completion Specification

## Purpose
TBD - created by archiving change implement-detail-range. Update Purpose after archive.

## Requirements

### Requirement: GREEN may read the Step's tests

The GREEN worker contract (`sai/commands/implement/green-worker.md`) SHALL state that the GREEN worker may read the Step's tests. Creating or modifying a test file SHALL remain forbidden absolutely.

#### Scenario: GREEN reads a test during recovery

- **WHEN** a GREEN worker resumes on a `continue_after_recovery` continuation for a Step with a RED block
- **THEN** it may read that Step's test files and still creates or modifies no test file

#### Scenario: GREEN reads a test

- **WHEN** a GREEN worker runs for a Step with RED tests
- **THEN** it may read that Step's test files and creates or modifies no test file
