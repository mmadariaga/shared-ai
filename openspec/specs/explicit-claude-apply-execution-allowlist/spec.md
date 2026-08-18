# explicit-claude-apply-execution-allowlist Specification

## Purpose
TBD: Define the explicit execution boundary for the Claude apply entrypoint.

## Requirements

### Requirement: Apply's explicit scope preserves coordinator execution

The Claude Code apply entrypoint SHALL make its broader execution boundary visible in frontmatter, including read, search, edit, write, shell, skill, worker-dispatch, user-interaction, and panel-task capabilities required by its coordinator contract.

#### Scenario: Apply does not depend on allowlist omission

- **WHEN** Claude Code invokes `sai-4-apply`
- **THEN** the wrapper's explicit `allowed-tools` declaration supplies the capabilities needed for artifact execution, verification, gates, worker dispatch, and Step Projection rendering.
