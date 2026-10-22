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
When no CodeGraph MCP entry is configured in either the global or the project config, the installer SHALL recommend `codegraph install -y -t claude,opencode`. The installer SHALL recognize two entry shapes: the opencode v1 `mcp.codegraph` entry, which counts as configured unless it sets `enabled: false`, and the opencode v2 `mcp.servers.codegraph` entry that CodeGraph writes, which counts as configured unless it sets `disabled: true`. A configured entry of either shape in either the global or the project config SHALL count as configured.

#### Scenario: Missing MCP wiring
- **WHEN** the binary exists but no configured `mcp.codegraph` or `mcp.servers.codegraph` entry is found
- **THEN** the output recommends the flagged install command and continues to the index check

#### Scenario: opencode v2 servers entry counts as configured
- **WHEN** a config holds `mcp.servers.codegraph` without `disabled: true`
- **THEN** the installer treats the CodeGraph MCP as configured and does not recommend the install command for it

#### Scenario: Disabled opencode v2 servers entry is not configured
- **WHEN** the only CodeGraph entry is `mcp.servers.codegraph` with `disabled: true`
- **THEN** the installer treats the CodeGraph MCP as not configured

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
