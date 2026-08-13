## Purpose

Define the standard fetch path patterns for sai command wrappers and instructions, and document the namespace distinction between `@sai/commands/` and `@commands/` paths.
## Requirements
### Requirement: wrapper-sai-commands-fetch-path
All 24 thin wrapper files at `commands/claude/*.md` and `commands/opencode/*.md` that fetch a sai command body SHALL use `Fetch @sai/commands/<name>.md`. The path `@commands/sai/` SHALL NOT appear in any wrapper file.

#### Scenario: claude wrapper fetch path updated
- **WHEN** any file under `commands/claude/` is read
- **THEN** any Fetch directive pointing to a sai command body SHALL use the pattern `Fetch @sai/commands/<name>.md`

#### Scenario: opencode wrapper fetch path updated
- **WHEN** any file under `commands/opencode/` is read
- **THEN** any Fetch directive pointing to a sai command body SHALL use the pattern `Fetch @sai/commands/<name>.md`

#### Scenario: old fetch path absent
- **WHEN** a grep for `@commands/sai/` is run across all wrapper files
- **THEN** zero matches SHALL be found

### Requirement: command-body-instruction-fetch-paths
All 12 sai command body files at `sai/commands/*.md` that fetch sai instructions SHALL use the folded fetch vocabulary: command-local instructions at `Fetch @sai/commands/{name}/instructions.md` (and for the archive pair, `Fetch @sai/commands/archive/instructions.md` then `Fetch @sai/commands/archive/archive-commit-gate.instructions.md`), templates at `Fetch @sai/commands/{name}/{artifact}.template.md`, and the root exceptions at `Fetch @sai/change-overview.md`, `Fetch @sai/adr-index.template.md`, and `Fetch @sai/ddr-index.template.md`. The path `@sai/instructions/` SHALL NOT appear in any command body file.

#### Scenario: command body instruction fetch updated
- **WHEN** any file under `sai/commands/` is read
- **THEN** any Fetch directive pointing to a sai instruction SHALL use a folded pattern: `Fetch @sai/commands/{name}/instructions.md`, `Fetch @sai/commands/{name}/{artifact}.template.md`, or one of the root exceptions `Fetch @sai/change-overview.md`, `Fetch @sai/adr-index.template.md`, `Fetch @sai/ddr-index.template.md`

#### Scenario: old instruction fetch path absent
- **WHEN** a grep for `@sai/instructions/` is run across all files under `sai/commands/`
- **THEN** zero matches SHALL be found

### Requirement: non-sai-wrapper-fetch-paths-unchanged
Wrapper files that do not fetch sai command bodies (e.g., `budget.md`) SHALL NOT be modified as part of this capability.

#### Scenario: budget wrapper untouched
- **WHEN** `commands/claude/budget.md` and `commands/opencode/budget.md` are read
- **THEN** their content SHALL be identical to the pre-restructure originals

### Requirement: The fetch skill SHALL explicitly document that `@sai/commands/` and `@commands/` are different namespaces

The disambiguation MUST be present in both the Claude and opencode variants of the fetch skill, with platform-appropriate path prefixes.

#### Scenario: Agent resolves @sai/commands/ path in opencode context
- **WHEN** the opencode fetch skill encounters `@sai/commands/X.md`
- **THEN** it SHALL resolve to `~/.config/opencode/sai/commands/X.md`, not `~/.config/opencode/commands/X.md`

