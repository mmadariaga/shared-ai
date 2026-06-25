# commit-auth-gate Specification

## Purpose
Require explicit per-invocation user authorization before git commit operations, with implicit add authorization for the same step.

## Requirements

### Requirement: Explicit per-invocation authorization before git commit

The agent MUST ask for explicit per-invocation authorization before running `git commit`. Once the user has granted permission for a commit, `git add` for the same step is implicitly authorized — the agent MUST NOT ask again. If the user does not respond or declines, the agent MUST NOT commit; MUST describe the staged changes and instruct the user to commit themselves.

#### Scenario: User grants permission for a commit step
- **WHEN** the agent asks for commit authorization and the user answers `y`
- **THEN** the agent MAY run `git add` for the same step without additional confirmation, then runs `git commit`

#### Scenario: User declines commit authorization
- **WHEN** the agent asks for commit authorization and the user does not answer `y`
- **THEN** the agent MUST NOT run `git commit`; MUST print a summary of staged changes and instruct the user to run `git commit` themselves
