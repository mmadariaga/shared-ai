# TODO List Progress Rendering Specification

## Purpose
Keep coordinator task-list state visible and current throughout planned worker execution.

## Requirements

### Requirement: render-before-dispatch

When an invocation declares a progress plan, the coordinator SHALL render the full task list before dispatching the worker, with the first step `in_progress` and all remaining steps `pending`.

#### Scenario: initial plan render
- **WHEN** a planned invocation begins
- **THEN** the coordinator SHALL render the initial task list before the worker dispatch call

### Requirement: render-before-progress-continuation

After every returned progress event, the coordinator SHALL re-render the task list from the updated marked-step set before resuming the worker.

#### Scenario: live progress update
- **WHEN** the coordinator receives a progress event
- **THEN** it SHALL mark only declared reported step ids
- **AND** re-render the list before sending `continue_after_progress`
