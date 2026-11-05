# opencode-defaults-alignment Specification

## Purpose
TBD - created by archiving change update-opencode-defaults-to-go-zen. Update Purpose after archive.

## Requirements

### Requirement: Generic opencode agents declare DeepSeek Flash with the high variant

Each of `agents/opencode/budget-explorer.md`, `agents/opencode/budget-executor.md`, and `agents/opencode/budget-subagent.md` MUST declare `model: opencode-go/deepseek-v4.1-flash` and `variant: high` on separate frontmatter lines while retaining its description, mode, and permissions.

#### Scenario: Generic agent frontmatter uses DeepSeek Flash with high

- **WHEN** the three shipped OpenCode generic agent files are read
- **THEN** each declares the model without a suffix and a separate high variant while retaining its mode

### Requirement: Opencode command wrappers declare DeepSeek Flash with their role variant
Each file in `commands/opencode/` SHALL declare `model: opencode-go/deepseek-v4.1-flash#<variant>` in single-line form with no separate variant line: `max` for `sai-explore`, `sai-1-spec`, `sai-2-design`, `sai-plan`, `sai-build`, `sai-3-implement`, `sai-merge`, `sai-retire-docs`, and `sai-retrospective`, and `high` for `sai-4-review`, `sai-deep-review`, `sai-5-security`, `sai-6-performance`, `sai-7-accessibility`, `sai-backfill`, `sai-archive`, `sai-commit`, `sai-status`, and `sai-worktree`.

#### Scenario: Wrapper frontmatter matches the preset
- **WHEN** the opencode command wrappers are read after the change
- **THEN** each declares the model with the variant its role carries in the shipped preset

### Requirement: Worker-matrix opencodeAgent entries match the shipped presets

The worker matrix MUST retain the configured model identifiers and variant levels for its seventeen OpenCode agents, with each model stored as a bare `model` value and each selected level stored as a separate `variant` value. Materialization MUST use those separate values without appending a suffix to the model. This requirement does not change the OpenCode command-wrapper format.

#### Scenario: Manifest entries mirror the preset

- **WHEN** the install manifest OpenCode agent entries are read after the change
- **THEN** their configured model identifiers and variant levels remain paired without a variant suffix in any model value

#### Scenario: Materialized agents retain separate selections

- **WHEN** the installer materializes the OpenCode worker entries
- **THEN** each worker retains its configured model and selected level in separate model and variant frontmatter lines
