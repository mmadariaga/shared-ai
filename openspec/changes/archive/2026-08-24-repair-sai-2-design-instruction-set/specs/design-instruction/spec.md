## REMOVED Requirements

### Requirement: Shared design instruction
**Reason:** The monolithic shared design instruction source was deleted and is no longer the active authority.
**Migration:** Use `sai/commands/design/coordinator.md`, `sai/commands/design/worker.md`, and the step files under `sai/commands/design/steps/`.
#### Scenario: retired-shared-source-is-not-active
- **WHEN** the active design instruction chain is loaded
- **THEN** it does not require the deleted monolithic shared instruction source.

### Requirement: No inline duplication
**Reason:** The former wrapper-centered instruction arrangement was retired with the monolithic source.
**Migration:** Keep canonical behavior in the routed coordinator, worker, and step-local instruction surfaces.
#### Scenario: routed-surfaces-are-canonical
- **WHEN** either supported wrapper starts design
- **THEN** it selects the routed contract instead of an inline or monolithic loader.
