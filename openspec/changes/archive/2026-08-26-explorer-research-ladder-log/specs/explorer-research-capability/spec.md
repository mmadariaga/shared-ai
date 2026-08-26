# Capability: explorer-research-capability

## ADDED Requirements

### Requirement: Explorer tool permissions enable ladder level access

The `budget-explorer` agent SHALL have `Bash` and `mcp__codegraph__codegraph_explore` tools granted in its agent frontmatter. These tools enable structural query access (level 1a via MCP, level 1b via CLI) and textual search access (level 2 via git grep).

#### Scenario: MCP tool present, structural query via level 1a
- **WHEN** `codegraph_explore` MCP tool is present in the session and the explorer receives a structural question
- **THEN** the explorer uses the MCP tool and does not emit a discard log entry for level 1a

#### Scenario: MCP tool absent, codegraph binary available, shell accessible
- **WHEN** `codegraph_explore` MCP tool is absent but `codegraph` binary is on PATH and shell is available
- **THEN** the explorer invokes `codegraph explore` CLI through shell (level 1b) and level 1 is not discarded

#### Scenario: Neither MCP nor CLI available
- **WHEN** `codegraph_explore` MCP tool is absent AND either shell is unavailable OR `codegraph` binary is not on PATH
- **THEN** the explorer skips level 1 and emits discard log entry with appropriate reason

#### Scenario: Shell available, git grep available, textual search
- **WHEN** shell and `git` are available and the explorer receives a textual search query
- **THEN** the explorer uses `git grep` through shell (level 2) and does not emit a discard log entry for level 2

#### Scenario: Shell unavailable for level 2
- **WHEN** shell is unavailable
- **THEN** the explorer skips level 2 and emits discard log with reason `shell unavailable`

#### Scenario: Git not on PATH despite shell available
- **WHEN** shell is available but `git` is not on PATH
- **THEN** the explorer skips level 2 and emits discard log with reason `git not on PATH`

#### Scenario: Query type is documentation read, not structural or textual
- **WHEN** the explorer receives a documentation-read query (not a "where is X" or "search for Y")
- **THEN** ladder levels 1 and 2 are not attempted; both are reported as `not applicable for this query type` rather than environment discards
