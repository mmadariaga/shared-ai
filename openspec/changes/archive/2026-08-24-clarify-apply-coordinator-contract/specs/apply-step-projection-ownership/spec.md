## MODIFIED Requirements

### Requirement: Apply worker progress SHALL remain dispatch-local and MUST NOT mutate the durable Step Projection

Worker progress SHALL report completion only against the immutable plan selected for its dispatch. Worker progress MUST NOT mark, create, extend, rename, reorder, relabel, or otherwise mutate the durable run-start Step Projection. The coordinator SHALL remain the sole owner of durable Step Projection rendering, state, and checkbox synchronization.

#### Scenario: Worker emits dispatch-local progress

- **WHEN** a worker reports progress for a step in its immutable dispatch-local plan
- **THEN** the coordinator may process that event without changing the durable Step Projection except through its own verification-and-checkbox update
