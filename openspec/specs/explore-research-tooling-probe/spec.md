# explore-research-tooling-probe Specification

## Purpose
TBD - created by archiving change extract-research-tooling-check. Update Purpose after archive.

## Requirements

### Requirement: Deterministic filesystem probe returns advisory status and literal
The filesystem probe SHALL remain available for its other consumers but SHALL NOT be invoked from the `sai-explore` path; no `sai/commands/explore/body.md` inline run SHALL occur in the main session.

#### Scenario: Probe classifies filesystem state
- **WHEN** the probe runs against a project root
- **THEN** no probe runs from the explore path and delegation governs instead

### Requirement: Explicit MCP input with no script inference
The `sai-explore` path SHALL NOT supply any caller-computed `--mcp-present` value; MCP presence including deferred tools SHALL be self-detected only inside the explorer session and the script SHALL never infer MCP itself.

#### Scenario: Caller supplies MCP presence explicitly
- **WHEN** the probe runs with an explicit `--mcp-present` value derived from the session tool list
- **THEN** no such flag is computed from the explore path and detection stays explorer-owned

### Requirement: Advisory read-only execution with usage-only failures
The retired explore invocation SHALL neither halt nor write; the probe itself SHALL stay advisory and read-only for its remaining consumers, exiting zero on completion and 2 only on usage or IO errors.

#### Scenario: Advisory execution never halts
- **WHEN** the probe completes with any advisory status
- **THEN** it exits zero without halting or writing files and the explore path invokes nothing
