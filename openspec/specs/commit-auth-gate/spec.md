# commit-auth-gate Specification

## Purpose
Require explicit per-invocation user authorization before git commit operations, with implicit add authorization for the same step.

## Requirements

### Requirement: Explicit per-invocation authorization before git commit

The agent MUST ask for explicit per-invocation authorization before running `git commit`. The authorization MUST be presented as a closed-choice prompt with options `yes` / `no` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping). The agent commits only on an explicit `yes` selection or reply; anything else (no, silence, redirect, or any other reply) is a decline and the agent MUST NOT commit. Once the user has granted permission for a commit, `git add` for the same step is implicitly authorized — the agent MUST NOT ask again. On a decline, the agent MUST describe the staged changes and instruct the user to commit themselves.

#### Scenario: User grants permission for a commit step
- **WHEN** the agent asks for commit authorization and the user answers `yes`
- **THEN** the agent MAY run `git add` for the same step without additional confirmation, then runs `git commit`

#### Scenario: User declines commit authorization
- **WHEN** the agent asks for commit authorization and the user does not answer `yes` (answers no, stays silent, redirects, or replies off-topic)
- **THEN** the agent MUST NOT run `git commit`; MUST print a summary of staged changes and instruct the user to run `git commit` themselves
