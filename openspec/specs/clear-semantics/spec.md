# clear-semantics Specification

## Purpose
TBD - created by archiving change restore-explore-stage-todo-rule. Update Purpose after archive.
## Requirements
### Requirement: Clear At Emission Checkpoint
The stage TODO SHALL clear at block emission as part of the emission checkpoint and never re-render afterward.
#### Scenario: Emission clears TODO once
- **WHEN** the Ready to Propose block emits
- **THEN** the stage TODO clears once per emission turn as part of the checkpoint with no post-emission re-render

### Requirement: Empty Panel Until Route Choice
The panel SHALL stay empty from emission until the deferred route choice resolves, with the first Phase B render only at choice resolution.
#### Scenario: Panel empty until choice resolution
- **WHEN** emission has completed but the route choice has not resolved
- **THEN** the panel holds no stage TODO and no route list, a new chat start clear removes only sai-explore-stage: and sai-idea-list: entries leaving foreign entries, and coordinator-only rendering with single-notice degradation is preserved

