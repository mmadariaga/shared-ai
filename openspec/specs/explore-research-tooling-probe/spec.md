# explore-research-tooling-probe Specification

## Purpose
TBD - created by archiving change extract-research-tooling-check. Update Purpose after archive.
## Requirements
### Requirement: Deterministic filesystem probe returns advisory status and literal

The probe SHALL resolve filesystem-only signals at the given project root: the `.codegraph/` directory counts as present only when it holds an entry other than `.gitignore`, and the `codegraph` binary counts as present only when `codegraph --version` exits zero. The probe SHALL classify the result as `ready`, `no-index`, or `not-installed` and SHALL return the matching verbatim English literal. Invocation SHALL be `node` with `--json --cwd` inline in the main session with no subagent.

#### Scenario: Probe classifies filesystem state

- **WHEN** the probe runs against a project root
- **THEN** it returns `ready`, `no-index`, or `not-installed` with the matching verbatim literal derived only from index and binary presence plus explicit MCP input

### Requirement: Explicit MCP input with no script inference

The caller SHALL supply MCP presence explicitly via `--mcp-present true|false` by inspecting the session tool list for `codegraph_*` or `mcp__codegraph__*` including deferred tools, and the script SHALL never infer MCP itself. When the flag is omitted the script SHALL remove MCP from detection and decide installed state from the binary alone.

#### Scenario: Caller supplies MCP presence explicitly

- **WHEN** the probe runs with an explicit `--mcp-present` value derived from the session tool list
- **THEN** installed state reflects binary presence or explicit MCP presence without any script-side MCP inference

### Requirement: Advisory read-only execution with usage-only failures

The check SHALL be advisory and read-only: it SHALL never halt the caller and SHALL never write any file. It SHALL exit zero whenever the check completes regardless of status and SHALL exit 2 only on usage or IO errors such as an unknown flag, a missing `--cwd` value, or an unreadable index directory beyond absent-path cases.

#### Scenario: Advisory execution never halts

- **WHEN** the probe completes with any advisory status
- **THEN** it exits zero without halting or writing files and reports usage or IO failures with exit 2 only

