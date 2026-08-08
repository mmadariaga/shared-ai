# Progress Minimum Threshold Specification

## Purpose

Define the minimum-threshold rule for rendering a declared progress plan as a task list, and the single-sourced constant that both harnesses reference.

## Requirements

### Requirement: no-list-below-three-steps

A declared progress plan with fewer than three progress steps SHALL NOT be rendered as a task list on either harness. The coordinator SHALL process progress events normally but SHALL suppress the list entirely.

#### Scenario: two-step plan renders nothing

- **WHEN** a declared plan has two steps
- **THEN** neither harness renders a task list and progress events are still processed and acknowledged

#### Scenario: three-step plan renders

- **WHEN** a declared plan has three or more steps
- **THEN** both harnesses render the task list per the neutral policy

### Requirement: threshold-single-sourced

The minimum-threshold constant SHALL be fixed in the neutral policy `sai/policies/todo-structure.md` and SHALL be the single source of the rule: consuming surfaces SHALL reference it and SHALL NOT restate the constant, following the single-source pattern of `sai/policies/question-context.md:29-31`.

#### Scenario: threshold referenced from policy

- **WHEN** a coordinator or binding applies the threshold
- **THEN** it SHALL reference `sai/policies/todo-structure.md` and SHALL NOT hard-code or restate the value inline

#### Scenario: both harnesses behave identically

- **WHEN** the same plan is declared on Claude Code and opencode
- **THEN** both harnesses render or suppress the list identically at the threshold
