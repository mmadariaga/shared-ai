# stop-commit-checklist Specification

## Purpose
Define the checklist the apply coordinator follows at every STOP & COMMIT marker. Its home is `sai/commands/apply/runner.md` § Step commit gate.

## Requirements

### Requirement: Every STOP & COMMIT marker SHALL follow the Step commit gate

When `/sai-4-apply` reaches a Step's STOP & COMMIT marker, the coordinator MUST execute this sequence in order:

    1. **Print the pre-commit file visibility report** per the `apply-pre-commit-file-report` capability: header with status letter, human-readable status line, `Will be committed` block, `Totals` line, optional `Will NOT be committed` block, `Plan cross-check` block, and `Subagent ↔ git` block. The report is mandatory and runs unconditionally so the user has the file list before being asked to authorize.
    2. **Propose the commit message** following `commit-rules.md` format. The message describes only the add-list.
    3. **Ask** `Ready to commit Step N. May I create commit with message: '<subject>'?` through the commit-rules authorization gate: options `yes (Recommended)` / `no` / `Allow on this session`; an off-option reply or silence re-presents the same ask; only an explicit `no` declines. An active session grant skips only this ask.
    4. **Commit on authorization** → `git add` exactly the add-list, then `git commit`, and report the resulting SHA + subject. **On `no`** → do NOT commit; print "Commit not authorized. The changes are: <summary>. Run `git commit` yourself when ready."
    5. **Continue the loop.** In both outcomes the next action is the Step loop's advance: dispatching a NEW worker for the next unchecked Step, never implementing it yourself and never ending the turn. Only if no unchecked Step remains does the terminal lifecycle run.

The report step does not require a separate authorization — the single authorization at step 3 is the only gate; if the file list is wrong, the user answers `no` and the commit is vetoed.

This checklist overrides any directive in the plan that says "stage and commit". The plan describes the work; this checklist describes the commit gate.

#### Scenario: User grants commit permission
- **WHEN** the coordinator reaches a STOP & COMMIT marker and the user answers `yes`
- **THEN** it stages exactly the add-list, runs `git commit`, reports the resulting SHA + subject, then dispatches a NEW worker for the next unchecked Step

#### Scenario: User declines
- **WHEN** the coordinator reaches a STOP & COMMIT marker and the user answers `no`
- **THEN** it MUST NOT run `git commit`, prints the "Commit not authorized" message, then dispatches a NEW worker for the next unchecked Step

#### Scenario: Silence does not decline
- **WHEN** the authorization ask receives no answer or an off-option reply
- **THEN** the same ask is re-presented and nothing is committed until an explicit option is chosen

#### Scenario: User vetoes the commit because the report shows a wrong file list
- **WHEN** the pre-commit report surfaces a deviation, mismatch, or leftover file, and the user answers `no`
- **THEN** the coordinator does NOT run `git commit` and prints the "Commit not authorized" message — the report informed the veto — then continues the Step loop

#### Scenario: Checklist overrides plan directives
- **WHEN** the implementation plan contains a directive that says "stage and commit"
- **THEN** the checklist takes precedence; the plan describes the work, the checklist describes the commit gate

#### Scenario: No unchecked Step remains
- **WHEN** the gate finishes and `implementation.md` has no unchecked Step left
- **THEN** the coordinator runs the terminal lifecycle instead of dispatching a new worker
