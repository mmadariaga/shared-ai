# Spec: safe-operations-skill

## ADDED Requirements

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
