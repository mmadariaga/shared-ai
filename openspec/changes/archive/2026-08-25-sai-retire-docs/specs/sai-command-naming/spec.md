## MODIFIED Requirements

### Requirement: The retirement utility uses the canonical command name

The utility SHALL use the `/sai-retire-docs` name in both harness wrappers, registry references, and user-facing command documentation.

#### Scenario: Command references remain mirrored

- **WHEN** a command surface refers to the retirement utility
- **THEN** it SHALL use `/sai-retire-docs` rather than a numbered phase name or a harness-specific alias
