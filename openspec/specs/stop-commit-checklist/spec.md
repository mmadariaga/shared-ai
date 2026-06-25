# stop-commit-checklist Specification

## Purpose
Define the 4-step checklist that agents MUST follow when encountering a STOP & COMMIT marker during apply.md execution.

## Requirements

### Requirement: Every STOP & COMMIT marker SHALL follow the 4-step checklist

When `apply.md` is executed and a STOP & COMMIT marker is encountered, the agent MUST execute the following sequence in order: (1) propose a commit message following `commit-rules.md` format, (2) ask explicitly in chat `Ready to commit Step N. May I create commit with message: '<subject>'? (y/n)`, (3) wait for the user's response without running other git operations, (4) on `y` only run `git commit` and report SHA + subject; on anything else, do NOT commit and describe staged changes.

#### Scenario: User grants commit permission
- **WHEN** the agent reaches a STOP & COMMIT marker and the user answers `y`
- **THEN** the agent runs `git commit` and reports the resulting SHA + subject

#### Scenario: User declines or does not respond
- **WHEN** the agent reaches a STOP & COMMIT marker and the user does not answer `y`
- **THEN** the agent MUST NOT run `git commit`; MUST describe the staged changes and instruct the user to commit themselves

#### Scenario: Checklist overrides plan directives
- **WHEN** the implementation plan contains a directive that says "stage and commit"
- **THEN** the 4-step checklist takes precedence; the plan describes the work, the checklist describes the commit gate
