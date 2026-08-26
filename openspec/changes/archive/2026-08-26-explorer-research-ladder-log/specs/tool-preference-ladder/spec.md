# tool-preference-ladder Specification

## MODIFIED Requirements

### Requirement: Fixed research-tool preference order

When researching the project, the explorer SHALL prefer research tools in a fixed order: codegraph levels 1a and 1b first, git grep second, and direct disk tools last. When `codegraph_*` MCP tools are present in the session, structural questions — where something is defined, what calls it, what a change would affect — SHALL go to codegraph via the MCP tool (level 1a) before any text search. When the MCP tool is absent but the `codegraph` binary is on PATH and shell is available, the same structural questions SHALL invoke `codegraph explore` via shell (level 1b). When shell and git are available, textual searches SHALL run through `git grep` via shell. Glob, Grep, and direct file reads are the final fallback when neither earlier level is available or neither answered the question. Discard logging distinguishes level 1a (MCP) from level 1b (CLI) so that both subroutes are observable.

#### Scenario: Structural questions go to codegraph MCP first
- **WHEN** `codegraph_*` MCP tools are present in the session and the explorer faces a structural question about definitions, callers, or change impact
- **THEN** the question goes to the codegraph MCP tool (level 1a) before any text search runs and no discard entry is emitted for level 1a

#### Scenario: Structural questions use codegraph CLI when MCP unavailable
- **WHEN** `codegraph_*` MCP tools are absent but `codegraph` binary is on PATH and shell is available, and the explorer faces a structural question
- **THEN** the question goes to `codegraph explore` via shell (level 1b) and no discard entry is emitted for level 1a (the CLI subroute succeeded)

#### Scenario: Textual searches use git grep
- **WHEN** shell and git are available and the explorer needs a textual search
- **THEN** the search runs through `git grep` via shell instead of direct disk search tools

#### Scenario: Direct disk tools are the last fallback
- **WHEN** neither codegraph nor `git grep` answered the question or neither earlier level is available
- **THEN** the explorer falls back to Glob, Grep, and direct file reads

### Requirement: Conditional skipping of unavailable levels

Each ladder level SHALL be evaluated conditionally and skipped when its availability precondition fails. When a level is skipped, a discard log entry SHALL be emitted with the level number and a plain-English reason. When `codegraph_*` MCP tools are absent from the session AND either shell is unavailable OR the `codegraph` binary is not on PATH, level 1 is skipped and a discard reason is logged. When shell or git is unavailable, level 2 is skipped and a discard reason is logged. Research falls directly to Glob/Grep/Read when neither earlier level is available. The wording of every level SHALL remain presence-based and conditional — never an unconditional instruction to call a tool that may not exist.

#### Scenario: Codegraph absent from the session
- **WHEN** the explorer runs in a session where `codegraph_*` MCP tools are not present AND either shell is unavailable OR `codegraph` binary is not on PATH
- **THEN** level 1 is skipped and a discard entry is logged with `reason: "codegraph MCP tool not available"` or a shell/binary-related reason

#### Scenario: Shell or git unavailable
- **WHEN** shell or git is unavailable inside the explorer runtime
- **THEN** level 2 is skipped and a discard entry is logged with appropriate reason (`shell unavailable`, `git not on PATH`, or `working tree not a git repository`)

#### Scenario: Discard logging distinguishes level 1a from level 1b
- **WHEN** the `codegraph_explore` MCP tool is absent but `codegraph` binary is on PATH
- **THEN** a discard entry distinguishes this scenario from the MCP-only absence case (reason: `codegraph binary not on PATH` vs `codegraph MCP tool not available`)

#### Scenario: Discard logging emitted per execution segment
- **WHEN** the explorer continues into a second execution segment under the 30-call ceiling
- **THEN** ladder_discards is emitted independently per segment with appropriate reasons for that segment

## ADDED Requirements

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
