# codegraph-state-warnings Specification

## Purpose
TBD - created by archiving change installer-opencode-config-codegraph-warnings. Update Purpose after archive.

## Requirements

### Requirement: Binary absence SHALL recommend system-level install only
When the `codegraph` binary is absent from PATH, the installer SHALL recommend system-level installation with `npm i -g @colbymchenry/codegraph` and SHALL attempt nothing else CodeGraph-related.

#### Scenario: Missing binary short-circuits
- **WHEN** the codegraph probe reports absent
- **THEN** only the system-install recommendation is printed and no MCP or index check runs

### Requirement: MCP absence SHALL recommend flagged install command
When `mcp.codegraph` is missing or disabled in both global and project configs, the installer SHALL recommend `codegraph install -y -t claude,opencode`. An enabled entry in either the global or the project config SHALL count as configured.

#### Scenario: Missing MCP wiring
- **WHEN** the binary exists but no enabled mcp.codegraph entry is found
- **THEN** the output recommends the flagged install command and continues to the index check

### Requirement: Index absence SHALL recommend codegraph init at the db path
The index check SHALL look at `<project-root>/.codegraph/codegraph.db` and, when absent, SHALL recommend `codegraph init` in the project root with that db path named.

#### Scenario: Missing index
- **WHEN** the binary and MCP layers pass but the db file is absent
- **THEN** the output recommends codegraph init with the db path

### Requirement: Stale index SHALL NOT warn and installer SHALL never execute CodeGraph commands
A present db file SHALL produce no warning even when stale, and the installer SHALL only recommend CodeGraph commands without running them automatically.

#### Scenario: Recommend-only behavior
- **WHEN** the db file exists regardless of freshness
- **THEN** no index warning is printed and no codegraph command is executed
