# claude-default-preset-alignment Specification

## Purpose
Verify that all shipped Claude Code model and effort defaults match the selected unchanged OPUS preset, while detecting unintended changes to generated opencode configuration.

## Requirements

### Requirement: Regression coverage checks all 36 Claude Code preset roles

The default-alignment regression test SHALL compare both model and effort for every role in `sai/presets/claude/[sai-default]-OPUS.json` against the corresponding canonical Claude Code source and generated installation projection. It SHALL require exactly 35 roles: 3 agent roles, 15 command roles, 13 worker roles, and 4 utility roles, the fourth utility role being `utility:sai-retrospective`. Command and agent frontmatter SHALL contain exactly one explicit model line and exactly one explicit effort line. Managed-worker canonical settings SHALL be checked against the corresponding `claudeAgent` entry in the worker matrix.

#### Scenario: All role settings match the preset
- **WHEN** the regression test checks canonical and generated settings for all 35 preset roles
- **THEN** it passes only when every role has exactly the preset model and effort values and the expected role-family counts of 3 agent, 15 command, 13 worker, and 4 utility roles

#### Scenario: A model or effort differs or is absent
- **WHEN** a canonical source or generated projection has a model or effort mismatch, or command or agent frontmatter lacks an explicit effort line
- **THEN** the regression test fails

### Requirement: Regression coverage protects the reference preset

The default-alignment regression test SHALL verify that the raw reference preset content retains SHA-256 `b18b22f73b0d21989d309fda2fc5ba0b51a780b8471bf5015f4bc00a5c62133f`. It SHALL assert that `to-pr`, `to-backlog`, `from-backlog`, and `from-next-backlog-item` have no command entries in that preset.

#### Scenario: Reference preset changes
- **WHEN** the raw content of `sai/presets/claude/[sai-default]-OPUS.json` differs from the recorded reference
- **THEN** the preset hash assertion fails

#### Scenario: Excluded commands remain outside the preset
- **WHEN** the regression test examines command membership in the reference preset
- **THEN** none of to-pr, to-backlog, from-backlog, or from-next-backlog-item is present

### Requirement: Regression coverage protects generated opencode output

The default-alignment regression test SHALL collect generated opencode agent, command wrapper, and configuration entries, normalize destination paths to relative forward-slash paths, sort entries by path, and fingerprint their paths and complete contents. It SHALL require exactly 41 entries, including the `sai-retrospective` command wrapper, and SHA-256 `9971048b52b2efe89ae33e841463763472b151dbb443747a84d6d0bcc13c9345` for the JSON-serialized entry array.

#### Scenario: Claude Code defaults change without changing opencode output
- **WHEN** the regression test generates opencode agents, command wrappers, and configuration
- **THEN** the 41-entry output retains the recorded fingerprint

#### Scenario: Generated opencode output changes
- **WHEN** a generated opencode agent, command wrapper, or configuration entry changes its path or contents
- **THEN** the unchanged-output assertion fails
