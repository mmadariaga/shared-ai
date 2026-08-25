## MODIFIED Requirements

### Requirement: Registry table covers sai-retire-docs

The universal SAI command registry SHALL contain a `/sai-retire-docs` entry pointing to its wrapper and describing its bounded, confirmation-gated archival analysis.

#### Scenario: Registry lookup identifies the utility

- **WHEN** a user or harness resolves the SAI command registry
- **THEN** `/sai-retire-docs` SHALL resolve to the retire-docs wrapper before execution begins

### Requirement: Registry preserves fetch-before-execute discipline

The command registration SHALL preserve the existing fetch-before-execute contract for the utility wrapper and its boot adapter.

#### Scenario: Registered command loads its contract

- **WHEN** the utility is selected from the registry
- **THEN** the harness SHALL load the declared wrapper and command card before interpreting the task
