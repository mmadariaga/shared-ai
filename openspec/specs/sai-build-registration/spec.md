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

The meta-build bootstrap SHALL load the implementation command bootstrap, which supplies five neutral category-planning bindings. The composition coordinator SHALL reuse the technical implementation coordinator followed by the unchanged apply adapter. It SHALL not dispatch a build-specific worker or send an implement worker step-machine pointer. Apply SHALL retain RED/GREEN selection ownership.

#### Scenario: Launcher is non-empty

- **WHEN** the meta-build launcher is read
- **THEN** it loads the implementation bootstrap with category bindings and requires no build worker or launcher-owned RED/GREEN selection.

### Requirement: Registry and documentation list build
The installed command files (the registry the universal `sai-commands` skill resolves against), README, and AGENTS command inventories SHALL list `/sai-build` as a user command that runs implementation planning and apply back-to-back, never as an internal `opsx:*` skill.

#### Scenario: Operator surfaces include build
- **WHEN** the registry and primary documentation are read
- **THEN** each maps or describes `/sai-build`

### Requirement: Existing projections and inventories cover build

Existing recursive projections SHALL install build wrappers and cards for both harnesses. Inventories and tests SHALL include build and the five implementation planners without adding a build worker, binding, or matrix row. The implementation segment SHALL use the category coordinator's complete-task and verified-publication contracts.

#### Scenario: Recursive installation

- **WHEN** projections and inventories run
- **THEN** build wrappers/cards and the category implementation surfaces are included while no build-specific worker identity is added.
