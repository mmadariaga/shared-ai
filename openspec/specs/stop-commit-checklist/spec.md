# stop-commit-checklist Specification

## Purpose
Define the 6-step checklist that agents MUST follow when encountering a STOP & COMMIT marker during apply.md execution.

## Requirements

### Requirement: Every STOP & COMMIT marker SHALL follow the 6-step checklist

When `apply.md` is executed and a STOP & COMMIT marker is encountered, the agent MUST execute the following sequence in order:

    1. **Print the pre-commit file visibility report** per the `apply-pre-commit-file-report` capability: status letter, human-readable status, `Staged` block, `Totals` line, optional `Unstaged (will NOT be committed)` block, `Plan cross-check` block, and `Subagent ↔ git` block. This step is mandatory and is not contingent on the user accepting the report — it runs unconditionally so the user has the file list before being asked to authorize.
    2. **Propose the commit message** following `commit-rules.md` format. The message must describe only what is staged.
    3. **Ask explicitly** as a closed-choice prompt with options `yes` / `no` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping): `Ready to commit Step N. May I create commit with message: '<subject>'?`. Do NOT run `git commit` before the user answers `yes`; anything other than an explicit `yes` selection or reply is a decline.
    4. **Wait.** Stop here. Do not advance to the next step, do not run other git operations, do not start a subagent.
    5. **On `yes` only** → run `git commit -m "..."` (or the HEREDOC form for multi-line) and report the resulting SHA + subject. **On anything else (no, silence, redirect)** → do NOT commit. Print: "Commit not authorized. The staged changes are: <summary>. Run `git commit` yourself when ready."
    6. **Continue the loop.** In both outcomes (commit created, or user declined and was told how to commit themselves), the next action after reporting is dispatching a NEW Step-execution subagent for the next unchecked Step — not implementing it yourself, and not ending the turn. Only if no unchecked Step remains: run the Final sweep and declare the implementation done.

The report step (step 1) does not require a separate authorization — the single user authorization at step 3 is the only gate. The report's purpose is to inform the user so they can decide at that single gate; if the file list is wrong, the user answers `no` at step 3 and the commit is vetoed.

This checklist overrides any directive in the plan that says "stage and commit". The plan describes the work; this checklist describes the commit gate.

#### Scenario: User grants commit permission
- **WHEN** the agent reaches a STOP & COMMIT marker and the user answers `yes`
- **THEN** the agent runs `git commit` and reports the resulting SHA + subject, then dispatches a NEW subagent for the next unchecked Step (step 6)

#### Scenario: User declines or does not respond
- **WHEN** the agent reaches a STOP & COMMIT marker and the user does not answer `yes`
- **THEN** the agent MUST NOT run `git commit`; MUST describe the staged changes and instruct the user to commit themselves; then dispatches a NEW subagent for the next unchecked Step (step 6)

#### Scenario: User vetoes the commit because the report shows a wrong file list
- **WHEN** the pre-commit report (step 1) surfaces a deviation, mismatch, or unstaged file, and the user answers `no` to step 3
- **THEN** the agent does NOT run `git commit` and prints the existing "Commit not authorized" message — the report successfully informed the veto — then dispatches a NEW subagent for the next unchecked Step (step 6)

#### Scenario: Checklist overrides plan directives
- **WHEN** the implementation plan contains a directive that says "stage and commit"
- **THEN** the 6-step checklist takes precedence; the plan describes the work, the checklist describes the commit gate

#### Scenario: No unchecked Step remains
- **WHEN** the agent finishes step 6 and `implementation.md` has no unchecked Step left
- **THEN** the agent runs the Final sweep and declares the implementation done instead of dispatching a new subagent
