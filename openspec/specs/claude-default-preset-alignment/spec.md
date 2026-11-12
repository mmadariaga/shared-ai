# claude-default-preset-alignment Specification

## Purpose
Verify that all shipped Claude Code model and effort defaults match the selected unchanged OPUS preset, while detecting unintended changes to generated opencode configuration.

## Requirements

### Requirement: Regression coverage checks all 36 Claude Code preset roles

The default-alignment regression test SHALL compare both model and effort for every role in `sai/presets/claude/[sai-default]-OPUS.json` against the corresponding canonical Claude Code source and generated installation projection. It SHALL require exactly 36 roles: 3 agent roles, 16 command roles (including `command:sai-direct-build`), 13 worker roles, and 4 utility roles, the fourth utility role being `utility:sai-retrospective`. Command and agent frontmatter SHALL contain exactly one explicit model line and exactly one explicit effort line. Managed-worker canonical settings SHALL be checked against the corresponding `claudeAgent` entry in the worker matrix.

#### Scenario: All role settings match the preset
- **WHEN** the regression test checks canonical and generated settings for all 36 preset roles
- **THEN** it passes only when every role has exactly the preset model and effort values and the expected role-family counts of 3 agent, 16 command, 13 worker, and 4 utility roles

#### Scenario: A model or effort differs or is absent
- **WHEN** a canonical source or generated projection has a model or effort mismatch, or command or agent frontmatter lacks an explicit effort line
- **THEN** the regression test fails

### Requirement: Regression coverage protects the reference preset

The default-alignment regression test SHALL verify that the raw reference preset content retains SHA-256 `bc176a1369a95ad15b048eba5c7aef66858fec3951b4f3b6455b1be67a44acbb`. It SHALL assert that `to-pr`, `to-backlog`, `from-backlog`, and `from-next-backlog-item` have no command entries in that preset.

#### Scenario: Reference preset changes
- **WHEN** the raw content of `sai/presets/claude/[sai-default]-OPUS.json` differs from the recorded reference
- **THEN** the preset hash assertion fails

#### Scenario: Excluded commands remain outside the preset
- **WHEN** the regression test examines command membership in the reference preset
- **THEN** none of to-pr, to-backlog, from-backlog, or from-next-backlog-item is present

### Requirement: Regression coverage protects generated opencode output

The default-alignment regression test SHALL collect generated opencode agent, command wrapper, and configuration entries, normalize destination paths to relative forward-slash paths, sort entries by path, and fingerprint their paths and complete contents. It SHALL require exactly 43 entries, including the `sai-retrospective`, `sai-cache-warmer`, and `sai-direct-build` command wrappers, and SHA-256 `d4563b40fb216b52ea07894a0865c2ff836a46664f514bdde7feea5b073876f9` for the JSON-serialized entry array.

#### Scenario: Claude Code defaults change without changing opencode output
- **WHEN** the regression test generates opencode agents, command wrappers, and configuration
- **THEN** the 43-entry output retains the recorded fingerprint

#### Scenario: Generated opencode output changes
- **WHEN** a generated opencode agent, command wrapper, or configuration entry changes its path or contents
- **THEN** the unchanged-output assertion fails
