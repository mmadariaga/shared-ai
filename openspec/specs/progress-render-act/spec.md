# progress-render-act Specification

## Purpose
TBD

## Requirements

### Requirement: State-changing progress events SHALL re-render the routed phase task list

A routed phase with an adapter-declared `progress_plan` MUST apply the marks and `changed_files` union before rendering the full task list, then MUST resume the worker with `continue_after_progress`.

#### Scenario: A progress event marks a new declared step
- **WHEN** a worker progress event reports at least one declared step id that is not already marked
- **THEN** the coordinator renders the full list using the updated marked set before continuing the worker

### Requirement: No-op progress events MUST NOT render the task list

Progress events containing only undeclared or already-marked ids MUST be ignored for marking and MUST NOT render or stamp the task list.

#### Scenario: A progress event changes no marked state
- **WHEN** every reported id is undeclared or already marked
- **THEN** the coordinator performs no progress render and continues the worker without extending the plan
