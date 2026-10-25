# sai-build-registration Specification

## Purpose
Register `/sai-build` consistently across both supported harnesses and shared inventories.

## Requirements

### Requirement: Mirrored thin wrappers exist
Claude Code and opencode SHALL each ship a thin `sai-build.md` wrapper loading the harness fetch skill, carrying the clean-start line and the capability-profile line, and fetching `sai/commands/build/coordinator.md` directly, with no boot adapter and no command bootstrap. Each envelope SHALL use `command_name: build` and forward `$ARGUMENTS`.

#### Scenario: Wrappers are mirrored
- **WHEN** both wrapper files are read
- **THEN** they use the shared direct-entry shape and contain no phase logic

### Requirement: Registry and documentation list build
The installed command files (the registry the universal `sai-commands` skill resolves against), README, and AGENTS command inventories SHALL list `/sai-build` as a user command that runs implementation planning and apply back-to-back, never as an internal `opsx:*` skill.

#### Scenario: Operator surfaces include build
- **WHEN** the registry and primary documentation are read
- **THEN** each maps or describes `/sai-build`

### Requirement: Existing projections and inventories cover build
Build wrappers and cards SHALL install through existing recursive projections without a new destination class. Fixed-count inventory, doctor, and install tests SHALL include build. No build worker agent, binding, or worker-matrix row SHALL be added.

#### Scenario: Recursive installation
- **WHEN** projections and inventories run
- **THEN** both build wrappers and both build cards are included while worker matrices remain unchanged
