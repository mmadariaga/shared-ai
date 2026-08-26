# ladder-discard-logging Specification

## Purpose

Makes the explorer's research-ladder decisions observable: every skipped ladder level is reported with a plain-English reason in the `ladder_discards` field of the structured response.

## Requirements

### Requirement: Explorer emits ladder_discards field for audit trail

The explorer's structured response SHALL include a `ladder_discards` field containing an array of objects. Each object represents one skipped ladder level and contains `level` (the level number: 1 or 2) and `reason` (a plain-English phrase identifying why that level was not attempted). The field is emitted even when the caller's declared output contract omits it.

#### Scenario: Codegraph MCP tool not available
- **WHEN** the explorer session lacks the `codegraph_explore` MCP tool
- **THEN** a discard entry with `level: 1` and `reason: "codegraph MCP tool not available"` is emitted

#### Scenario: Codegraph CLI binary not available
- **WHEN** shell is available but `codegraph` binary is not on PATH
- **THEN** a discard entry with `level: 1` and `reason: "codegraph binary not on PATH"` is emitted

#### Scenario: Shell unavailable, affects both codegraph CLI and level 2
- **WHEN** shell is unavailable
- **THEN** discard entries with `reason: "shell unavailable"` are emitted for any level that requires shell

#### Scenario: Git not on PATH despite shell available
- **WHEN** shell is available but `git` is not on PATH
- **THEN** a discard entry with `level: 2` and `reason: "git not on PATH"` is emitted

#### Scenario: Not a git repository
- **WHEN** shell and git are available but the working directory is not a git repository
- **THEN** a discard entry with `level: 2` and `reason: "working tree not a git repository"` is emitted

#### Scenario: Caller prescribed a tool despite the ladder
- **WHEN** a caller prompt names a specific research tool (e.g., "use Glob to...")
- **THEN** the ladder still governs (task does not abort), and a discard entry with `reason: "caller prescribed <tool-name>"` is emitted if that tool was skipped

#### Scenario: Shell operation other than git grep or codegraph is requested
- **WHEN** the explorer is asked to run a shell command other than `git grep` or `codegraph explore`
- **THEN** the explorer does not execute it and emits a discard entry with `reason: "shell operation refused: <description>"`

#### Scenario: Discard logging emitted per execution segment
- **WHEN** the explorer continues into a second execution segment under the 30-call ceiling
- **THEN** ladder_discards is emitted independently per segment with appropriate reasons for that segment

#### Scenario: Field emitted even when output contract omits it
- **WHEN** a caller's declared output contract does not list `ladder_discards`
- **THEN** the field is emitted anyway in the explorer's response, exactly as `out_of_root_requests` is
