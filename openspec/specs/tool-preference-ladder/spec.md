# tool-preference-ladder Specification

## Purpose

Prioritizes the most suitable research tools available in the explorer's environment: `codegraph` structural queries first, `git grep` second, and direct disk tools (Glob/Grep/Read) as the last fallback.

## Requirements

### Requirement: Fixed research-tool preference order
All discovery research in `sai-explore` SHALL be delegated to the explorer where the fixed ladder governs; the explorer SHALL self-detect CodeGraph availability in its own session and the principal SHALL NOT research code directly.

#### Scenario: Structural questions go to codegraph MCP first
- **WHEN** `codegraph_*` MCP tools are present in the session and the explorer faces a structural question about definitions, callers, or change impact
- **THEN** the delegated explorer routes that question to the codegraph MCP tool before any text search with no principal probe

#### Scenario: Structural questions use codegraph CLI when MCP unavailable
- **WHEN** `codegraph_*` MCP tools are absent but `codegraph` binary is on PATH and shell is available, and the explorer faces a structural question
- **THEN** the delegated explorer routes that question to `codegraph explore` via shell with no principal probe

#### Scenario: Textual searches use git grep
- **WHEN** shell and git are available and the explorer needs a textual search
- **THEN** the delegated explorer runs that search through `git grep` via shell instead of principal direct search

#### Scenario: Direct disk tools are the last fallback
- **WHEN** neither codegraph nor `git grep` answered the question or neither earlier level is available
- **THEN** the delegated explorer falls back to Glob, Grep, and direct file reads with no principal direct research

### Requirement: Conditional skipping of unavailable levels
Each ladder level SHALL be evaluated conditionally inside the delegated explorer and skipped when its precondition fails with a discard entry logged; the main session SHALL run no probe of its own.

#### Scenario: Codegraph absent from the session
- **WHEN** the explorer runs where codegraph MCP tools are absent and shell or binary is unavailable
- **THEN** level 1 is skipped with a discard reason logged and the principal runs no independent check

#### Scenario: Shell or git unavailable
- **WHEN** shell or git is unavailable inside the explorer runtime
- **THEN** level 2 is skipped with an appropriate reason logged and the principal runs no independent check

#### Scenario: Discard logging distinguishes level 1a from level 1b
- **WHEN** the codegraph_explore MCP tool is absent but the codegraph binary is on PATH
- **THEN** a discard entry distinguishes CLI success from MCP absence with no principal probe

#### Scenario: Discard logging emitted per execution segment
- **WHEN** the explorer continues into a second execution segment under the 40-call ceiling
- **THEN** ladder_discards is emitted independently per segment and the principal runs no independent check

### Requirement: The ladder governs only research-tool choice

The tool-preference ladder SHALL govern only research-tool choice and SHALL NOT modify directed out-of-root access, scope escalation, or the per-segment ceiling. Tool selection SHALL be bounded by at most 40 calls per execution segment.

#### Scenario: Out-of-root need discovered while following the ladder
- **WHEN** following the ladder exposes a concrete filesystem need outside the project root
- **THEN** the need is handled exclusively through directed-access and escalation with no extra ladder access

#### Scenario: Tool choice does not spend beyond the ceiling
- **WHEN** the explorer selects tools according to the ladder
- **THEN** the selection stays bounded by at most 40 calls per execution segment

### Requirement: Ladder precedence over caller tool prescriptions

A caller prompt naming a specific research tool, mentioning a procedure, or prescribing a method SHALL NOT override the tool-preference ladder. The ladder remains the governing preference order regardless of caller instructions. When a caller prompt prescribes a tool, the ladder still governs, the task does not abort, and a discard log entry is emitted with `reason: "caller prescribed <tool-name>"` if that tool would be skipped. The shell is restricted to `git grep` and `codegraph explore` operations only; if the explorer is asked to run a shell command for any other purpose, that command is not executed and a discard entry is logged with `reason: "shell operation refused: <description>"`.

#### Scenario: Caller prescribes a tool before the ladder would reach it
- **WHEN** a caller prompt says "use Glob to find X" but level 1 (codegraph) succeeded before level 3 (disk tools) is reached
- **THEN** the ladder governs the tool choice (codegraph is used, not Glob) and a discard log entry includes `reason: "caller prescribed Glob"` if Glob was skipped

#### Scenario: Caller prompt violation does not abort the task
- **WHEN** a caller prompt prescribes a tool despite the ladder policy
- **THEN** the task continues without abortion; the ladder governs tool selection; the discard log records the violation

#### Scenario: Shell operation other than git grep or codegraph is refused
- **WHEN** the explorer is asked to run a shell command other than `git grep` or `codegraph explore`
- **THEN** the explorer does not execute it and emits a discard entry with `reason: "shell operation refused: <description>"`
