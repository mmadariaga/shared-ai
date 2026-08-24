## MODIFIED Requirements

### Requirement: Coordinator owns active-step pointer delivery

The implementation coordinator SHALL own progress rendering and delivery of the active-step pointer, while the worker SHALL execute the step named by that pointer without selecting a different step.

#### Scenario: Coordinator advances the plan

- **WHEN** the coordinator emits a continuation for the next implementation step
- **THEN** the continuation carries the coordinator-selected active-step pointer and the worker executes that step.
