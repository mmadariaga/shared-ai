## MODIFIED Requirements

### Requirement: sai-2-design uses a high-capability model
The Claude Code and opencode `sai-2-design` wrappers SHALL declare the staged routed coordinator model and effort or variant, rather than the retired standalone high-effort inline model contract.

#### Scenario: model declared in Claude Code wrapper
- **WHEN** either supported design wrapper is read
- **THEN** its model declaration matches the staged routed coordinator surface used by that harness

#### Scenario: staged-wrapper-model-is-used
- **WHEN** either supported design wrapper is read
- **THEN** its staged model declaration matches the routed coordinator surface used by that harness.

