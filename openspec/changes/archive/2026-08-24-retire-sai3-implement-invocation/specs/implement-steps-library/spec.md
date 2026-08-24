## MODIFIED Requirements

### Requirement: Common baseline and just-in-time step delivery

`sai/commands/implement/steps/common.md` SHALL remain the run-long technical baseline for the implementation worker, and coordinator-selected step files SHALL provide just-in-time instructions for the active step. The step library SHALL be the active technical instruction source after the inactive `sai/commands/implement/invocation.md` surface is retired.

#### Scenario: Step-gated worker starts without the retired invocation card

- **WHEN** the implementation worker begins a routed run
- **THEN** it uses `steps/common.md` and the coordinator-named step file without loading `sai/commands/implement/invocation.md`.
