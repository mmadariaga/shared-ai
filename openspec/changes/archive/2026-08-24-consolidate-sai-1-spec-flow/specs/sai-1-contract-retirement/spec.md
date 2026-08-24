## MODIFIED Requirements

### Requirement: Retired spec invocation contract

Standalone sai-1 execution SHALL route through the active coordinator and worker contracts and SHALL NOT require the inactive `sai/commands/spec/invocation.md` file.

#### Scenario: The standalone spec command is launched

- **WHEN** `/sai-1-spec` begins a routed execution
- **THEN** its lifecycle and technical instruction declarations SHALL come from the active coordinator, worker, steps, and canonical phase contract.

### Requirement: Retirement inventory consistency

Source-audit, routed-card layout, installation, fixture, and regression-test inventories SHALL treat the spec invocation file as retired while preserving any required cleanup metadata.

#### Scenario: Active source inventories are checked

- **WHEN** the repository audits routed command cards and installation projections
- **THEN** `sai/commands/spec/invocation.md` SHALL not be required as an active spec contract.
