## MODIFIED Requirements

### Requirement: Crystallization-close selector presents stable route titles

The crystallization-close selector SHALL present exactly three options, in the existing order, with the fixed English titles `Plan - Unattended`, `Direct build - Unattended`, and `Manual`. Their machine-readable route identities MUST remain `plan-unattended`, `build-unattended`, and `manual`.

#### Scenario: Selector presents the three continuation routes

- **WHEN** a crystallization turn reaches its close selector
- **THEN** the selector presents the three fixed titles in order and preserves their existing route identities without adding aliases or changing dispatch behavior.

### Requirement: Selector descriptions distinguish continuation modes

The selector SHALL describe `Plan - Unattended` as running `sai-1` and `sai-2` to create and review a plan before stopping ahead of direct implementation. It SHALL describe `Direct build - Unattended` as direct implementation suited to simple changes and fixes followed by spec updates, and SHALL describe `Manual` as providing instructions for continuing manually with `/sai-1-spec <change-name>`.

#### Scenario: User can distinguish the available continuation modes

- **WHEN** the selector descriptions are displayed
- **THEN** each description communicates its intended continuation mode without changing the underlying route or worker flow.
