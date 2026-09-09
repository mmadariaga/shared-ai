# Spec: safe-operations-skill

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.
## Requirements
### Requirement: Agent SHALL evaluate operation reversibility before acting

The agent MUST assess whether a requested operation is hard to reverse, destructive, or affects shared systems before executing it.

#### Scenario: Destructive operation detected
- **WHEN** the agent is about to delete files, drop database tables, or run `rm -rf`
- **THEN** the agent SHALL ask the user for confirmation before proceeding

#### Scenario: Hard-to-reverse operation detected
- **WHEN** the agent is about to `git push --force`, `git reset --hard`, or amend published commits
- **THEN** the agent SHALL ask the user for confirmation before proceeding

#### Scenario: Shared-system operation detected
- **WHEN** the agent is about to push code, comment on PRs/issues, send messages, or modify shared infrastructure
- **THEN** the agent SHALL ask the user for confirmation before proceeding

### Requirement: Agent SHALL NOT use destructive actions as shortcuts

When encountering obstacles, the agent MUST NOT bypass safety checks (e.g., `--no-verify`) or discard unfamiliar files that may be in-progress work.

#### Scenario: Obstacle encountered
- **WHEN** the agent encounters an unfamiliar file or safety check during execution
- **THEN** the agent SHALL report the obstacle and ask the user how to proceed, rather than bypassing or deleting

### Requirement: The pre-authorized remediation reset does not fire the confirmation gate

The one mixed `git reset <guard_base>` that a coordinator runs while remediating a no-commit-guard violation SHALL be pre-authorized by the calling flow and SHALL be explicitly carved out of safe-operations: it SHALL NOT fire the destructive-operation confirmation gate. The carve-out SHALL cover exactly that one mixed reset; every other safe-operations confirmation — including `git reset --hard`, deleting files or branches, `--no-verify` bypasses, and amending published commits — SHALL remain in force.

#### Scenario: the guard remediation continues without a confirmation ask

- **WHEN** a coordinator remediates a no-commit-guard violation with `git reset <guard_base>` (mixed)
- **THEN** the remediation proceeds without the destructive-operation confirmation gate and the route continues
- **AND** any other destructive operation still requires the user's confirmation

