# explorer-research-capability Specification

## Purpose

Grants the `budget-explorer` agent the tool permissions its research ladder requires: `Bash` for `git grep` and the codegraph CLI, and `mcp__codegraph__codegraph_explore` for structural queries.

## Requirements

### Requirement: Explorer tool permissions enable ladder level access

Both harnesses SHALL derive explorer access from the canonical research profile. Claude grants SHALL include the applicable shell and CodeGraph MCP tools enabling levels 1a, 1b, and 2. Opencode SHALL grant equivalent read, search, web, restricted research shell, fetch-skill, CodeGraph, and execute bridge capabilities through ordered deny-default V2 permissions. Required auxiliary access SHALL be included, while excluded writes, delegation, unrelated skills, and unknown actions remain denied by opencode profile rules. The explorer SHALL apply its profile before availability detection.

#### Scenario: MCP tool present, structural query via level 1a
- **WHEN** granted CodeGraph MCP is available for a structural query
- **THEN** the explorer uses it without a level 1a discard

#### Scenario: MCP tool absent, codegraph binary available, shell accessible
- **WHEN** granted MCP access is absent but granted CodeGraph CLI and shell access are available
- **THEN** the explorer uses codegraph explore at level 1b without discarding the entire first level

#### Scenario: Neither MCP nor CLI available
- **WHEN** granted applicable MCP is absent and its granted CLI path is unavailable
- **THEN** the explorer skips level 1 with appropriately classified absence and remediation entries

#### Scenario: Shell available, git grep available, textual search
- **WHEN** granted shell and Git access are available for a textual query
- **THEN** the explorer uses git grep without a level 2 discard

#### Scenario: Shell unavailable for level 2
- **WHEN** granted applicable shell support is absent
- **THEN** level 2 is skipped with shell unavailable and shell-enabling remediation

#### Scenario: Git not on PATH despite shell available
- **WHEN** granted applicable shell exists but Git is absent from PATH
- **THEN** level 2 is skipped with git not on PATH and installation guidance

#### Scenario: Query type is documentation read, not structural or textual
- **WHEN** the explorer receives a documentation-read query
- **THEN** levels 1 and 2 are not attempted and are classified as inapplicable rather than environmental absences

#### Scenario: Native research grants include the bridge
- **WHEN** the opencode research profile is translated
- **THEN** it includes execute and the exact CodeGraph action while leaving unrelated permission-checked tools denied

#### Scenario: New action does not inherit broad access
- **WHEN** an unknown action is evaluated despite inherited allow rules
- **THEN** research profile deny-default rules deny that action
