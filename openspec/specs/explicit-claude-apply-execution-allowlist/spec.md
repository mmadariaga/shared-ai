# explicit-claude-apply-execution-allowlist Specification

## Purpose
TBD: Define the explicit execution boundary for the Claude apply entrypoint.

## Requirements

### Requirement: Apply's explicit scope preserves coordinator execution

The Claude Apply entrypoint SHALL make its broader required execution access visible in generated allowed-tools frontmatter, including read, search, edit, write, shell, skill, worker-dispatch, user-interaction, and panel-task capabilities required by its coordinator contract. These pre-approvals SHALL derive from its canonical capability profile and SHALL NOT be described as a deny-list or operation-authorization grant.

#### Scenario: Apply does not depend on allowlist omission
- **WHEN** Claude Code invokes Apply
- **THEN** its explicit generated allowed-tools declaration supplies required artifact execution, verification, gate, worker-dispatch, and Step Projection capabilities subject to effective native permissions
