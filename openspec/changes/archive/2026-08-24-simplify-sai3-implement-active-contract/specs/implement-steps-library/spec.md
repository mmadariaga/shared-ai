## MODIFIED Requirements

### Requirement: Common baseline and just-in-time step delivery

`steps/common.md` SHALL remain the run-long technical baseline for the implementation worker, and coordinator-selected step files SHALL provide the just-in-time instructions for the active step. Coordinator and worker lifecycle contracts MUST NOT override the technical authority of those files.

#### Scenario: Step-gated worker starts a step

- **WHEN** the coordinator delivers the pointer for the next implementation step
- **THEN** the worker uses `steps/common.md` and only the pointed step file as its technical instruction surface.
