# ladder-discard-logging Specification

## Purpose

Makes the explorer's research-ladder decisions observable: every skipped ladder level is reported with a plain-English reason in the `ladder_discards` field of the structured response.

## Requirements

### Requirement: Explorer emits ladder_discards field for audit trail
The explorer structured response SHALL include the per-segment `ladder_discards` field as before; with the main-session probe removed this field SHALL serve as the only availability signal surfaced to the principal, printed once per subagent result as an informational notice when present.

#### Scenario: Codegraph MCP tool not available
- **WHEN** the explorer session lacks the codegraph_explore MCP tool
- **THEN** a discard entry for that absence is emitted as the sole signal with no principal probe or notice

#### Scenario: Codegraph CLI binary not available
- **WHEN** shell is available but the codegraph binary is not on PATH
- **THEN** a discard entry for that absence is emitted as the sole signal with no principal probe or notice

#### Scenario: Shell unavailable, affects both codegraph CLI and level 2
- **WHEN** shell is unavailable
- **THEN** discard entries for shell-dependent levels are emitted as the sole signal with no principal probe or notice

#### Scenario: Git not on PATH despite shell available
- **WHEN** shell is available but git is not on PATH
- **THEN** a discard entry for that absence is emitted as the sole signal with no principal probe or notice

#### Scenario: Not a git repository
- **WHEN** shell and git are available but the working directory is not a git repository
- **THEN** a discard entry for that state is emitted as the sole signal with no principal probe or notice

#### Scenario: Caller prescribed a tool despite the ladder
- **WHEN** a caller prompt names a specific research tool
- **THEN** the ladder still governs with the prescribed-tool discard emitted as the sole signal with no principal probe

#### Scenario: Shell operation other than git grep or codegraph is requested
- **WHEN** the explorer is asked to run a shell command other than git grep or codegraph explore
- **THEN** the explorer does not execute it and the refusal discard is emitted as the sole signal with no principal probe

#### Scenario: Discard logging emitted per execution segment
- **WHEN** the explorer continues into a second execution segment under the 40-call ceiling
- **THEN** ladder_discards is emitted independently per segment as the sole signal with no principal probe

#### Scenario: Field emitted even when output contract omits it
- **WHEN** a caller declared output contract does not list ladder_discards
- **THEN** the field is still emitted as the sole signal with no principal probe or notice
