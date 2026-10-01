# progress-render-act Specification

## Purpose
TBD

## Requirements

### Requirement: State-changing progress events SHALL re-render the routed phase task list

A routed phase with an adapter-declared `progress_plan` MUST validate the progress result and register its declared marks and ordered duplicate-free `changed_files` union before issuing presentation or continuation calls. It MUST then issue the full task-list update and same-worker `continue_after_progress` continuation as independent tool calls in one assistant turn. Milestone stamps SHALL come from the marking verdict's `validated_at`, including `validation.validated_at` under a step-machine progress emit. Panel completion need not precede resumed worker work. The coordinator MUST process both results before its next Result Loop iteration; panel unavailability SHALL use the existing one-time degradation route, while other panel errors SHALL remain failures without retries. Initial rendering SHALL still precede initial dispatch. Existing guard windows SHALL remain unchanged.

#### Scenario: A progress event marks a new declared step
- **WHEN** a worker progress event reports at least one declared step id that is not already marked
- **THEN** the coordinator validates and registers the event, then issues the full list update and same-worker continuation independently in the same assistant turn
- **AND** the update uses the updated marked set and stamps from the validation verdict without waiting for the panel result before continuation

#### Scenario: A malformed progress event starts neither call
- **WHEN** validation rejects a progress payload
- **THEN** the coordinator follows the existing malformed-result route without marking steps, rendering progress, or issuing `continue_after_progress`

### Requirement: No-op progress events MUST NOT render the task list

Progress events containing only undeclared or already-marked ids MUST be ignored for marking and MUST NOT render or stamp the task list.

#### Scenario: A progress event changes no marked state
- **WHEN** every reported id is undeclared or already marked
- **THEN** the coordinator performs no progress render and continues the worker without extending the plan
