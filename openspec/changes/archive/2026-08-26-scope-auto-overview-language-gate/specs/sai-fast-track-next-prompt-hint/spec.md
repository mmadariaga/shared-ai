## MODIFIED Requirements

### Requirement: Preserve the overview-enabled fast-track hint

The spec completion recommendation SHALL append `--overview-lang Lang` alongside `--fast-track` when demonstrating the overview-enabled `sai-2-design` continuation, without changing command execution semantics.

#### Scenario: Completion hint demonstrates both flags

- **WHEN** the spec coordinator prints the recommendation for the next design phase
- **THEN** the recommendation contains `--fast-track --overview-lang Lang` after the change name
