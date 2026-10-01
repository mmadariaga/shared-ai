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

After a validated progress event changes the declared marked-step set, the coordinator SHALL register the marks and changed-file union first, then issue the full task-list update and worker continuation independently in the same assistant turn per the shared runner. It SHALL NOT wait for panel completion before issuing the continuation. An event marking no new declared step SHALL perform no panel update or stamp. The historical requirement name does not impose render-first completion ordering for progress; initial rendering SHALL still precede initial dispatch.

#### Scenario: live progress update
- **WHEN** the coordinator receives a progress event
- **THEN** it SHALL validate the event and mark only declared reported step ids
- **AND** if the marked set changes, it SHALL issue the list update and `continue_after_progress` in the same assistant turn; otherwise it SHALL continue without a panel update
