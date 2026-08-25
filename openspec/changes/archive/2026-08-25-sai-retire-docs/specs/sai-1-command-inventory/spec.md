## MODIFIED Requirements

### Requirement: Both harness inventories enumerate sai-retire-docs

The Claude Code and opencode command inventories SHALL enumerate `/sai-retire-docs` as the same utility command and SHALL include it in their mirrored command counts.

#### Scenario: The new utility is present in both inventories

- **WHEN** either harness enumerates installed command projections
- **THEN** the result SHALL contain one `sai-retire-docs` utility entry matching the other harness
