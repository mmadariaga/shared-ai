# sai-build-registration Specification

## Purpose
Register `/sai-build` consistently across both supported harnesses and shared inventories.

## Requirements

### Requirement: Boot adapters route build
Both boot adapters SHALL include `build` among routed names, select `@sai/commands/build/coordinator.md`, forward envelope fields unchanged, and retain all existing routed and utility names.

#### Scenario: Build boot selection
- **WHEN** boot receives `command_name: build`
- **THEN** it selects the build coordinator and not a utility body

### Requirement: Mirrored thin wrappers exist
Claude Code and opencode SHALL each ship a thin `sai-build.md` wrapper loading the fetch skill, its boot adapter, and the build launcher. Each envelope SHALL use `command_name: build` and forward `$ARGUMENTS`; opencode SHALL include its change-picker echo line.

#### Scenario: Wrappers are mirrored
- **WHEN** both wrapper files are read
- **THEN** they use the shared three-directive shape and contain no phase logic

### Requirement: Build launcher and coordinator are shared
`sai/commands/build/command-bootstrap.md` SHALL load the implementation-worker binding and build coordinator, contain no harness token, and not load RED/GREEN bindings. The build folder SHALL not require `worker.md`; apply selects its own workers.

#### Scenario: Launcher is non-empty
- **WHEN** the build launcher is read
- **THEN** both required fetches are present and no build worker is required

### Requirement: Registry and documentation list build
The universal registry, README, and AGENTS command inventories SHALL list `/sai-build` as a user command that runs implementation planning and apply back-to-back, never as an internal `opsx:*` skill.

#### Scenario: Operator surfaces include build
- **WHEN** the registry and primary documentation are read
- **THEN** each maps or describes `/sai-build`

### Requirement: Existing projections and inventories cover build
Build wrappers and cards SHALL install through existing recursive projections without a new destination class. Fixed-count inventory, doctor, and install tests SHALL include build. No build worker agent, binding, or worker-matrix row SHALL be added.

#### Scenario: Recursive installation
- **WHEN** projections and inventories run
- **THEN** both build wrappers and both build cards are included while worker matrices remain unchanged
