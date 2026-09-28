# opencode-defaults-alignment Specification

## Purpose
TBD - created by archiving change update-opencode-defaults-to-go-zen. Update Purpose after archive.

## Requirements

### Requirement: Generic opencode agents declare the free model with xhigh variant

Each of `agents/opencode/explore.md`, `agents/opencode/executor.md`, and `agents/opencode/budget.md` MUST declare `model: opencode/muse-spark-1.3-contributor-free` and `variant: xhigh` on separate frontmatter lines while retaining its description, mode, and permissions.

#### Scenario: Generic agent frontmatter uses free xhigh

- **WHEN** the three shipped OpenCode generic agent files are read
- **THEN** each declares the free model without a suffix and a separate xhigh variant while retaining its mode

### Requirement: Opencode command wrappers declare the contributor model with xhigh variant
Each file in `commands/opencode/` SHALL declare `model: opencode-go/muse-spark-1.3-contributor#xhigh` in single-line form with no separate variant line and no stale free or high value.

#### Scenario: Wrapper frontmatter matches the preset
- **WHEN** the opencode command wrappers are read after the change
- **THEN** each declares the contributor model with xhigh variant

### Requirement: Worker-matrix opencodeAgent entries match the Go+Zen preset

The worker matrix MUST retain the configured model identifiers and variant levels for its fifteen OpenCode agents, with each model stored as a bare `model` value and each selected level stored as a separate `variant` value. Materialization MUST use those separate values without appending a suffix to the model. This requirement does not change the OpenCode command-wrapper format.

#### Scenario: Manifest entries mirror the preset

- **WHEN** the install manifest OpenCode agent entries are read after the change
- **THEN** their configured model identifiers and variant levels remain paired without a variant suffix in any model value

#### Scenario: Materialized agents retain separate selections

- **WHEN** the installer materializes the OpenCode worker entries
- **THEN** each worker retains its configured model and selected level in separate model and variant frontmatter lines
