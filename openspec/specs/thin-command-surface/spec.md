# thin-command-surface Specification

## Purpose
TBD - created by archiving change deterministic-status-tool. Update Purpose after archive.
## Requirements
### Requirement: Status command delegates to deterministic tool
The `/sai-status` command body file SHALL be thinned to a task template that runs prerequisites, invokes the status-picker policy, dispatches to the status tool with `--json` flag, and relays the tool's output verbatim. All prose-based derivation and decision logic SHALL be removed from the command file.

#### Scenario: Command file contains no prose algorithm
- **WHEN** `sai/commands/status/body.md` is read
- **THEN** it contains no Steps A–E algorithm, no nested if-then-else decision logic, and no derivation of panel cells or Next hints; instead, it is a task template that invokes the tool

#### Scenario: Tool path resolution follows standard pattern
- **WHEN** the status command invokes the tool
- **THEN** it resolves the tool path using the same candidate-list pattern as `status-picker.md` (checking `.claude/sai/tools/status.js` then `~/.claude/sai/tools/status.js`)

#### Scenario: Tool output is relayed verbatim
- **WHEN** the status tool exits with code 0, 1, or 2
- **THEN** the command relays the tool's JSON or plain-text output verbatim to the user without re-deriving, reformatting, or filtering

### Requirement: Command file is reduced to a task template
The status command file SHALL contain only the following elements: prerequisite checks, status-picker policy invocation, tool dispatch instructions, and output relay. No other logic.

#### Scenario: File structure is lean
- **WHEN** counting lines in `sai/commands/status/body.md`
- **THEN** the file is reduced from 70 lines (with prose Steps A–E) to approximately 48 lines (prerequisites, policy, tool invocation, relay)

#### Scenario: Prerequisites remain in place
- **WHEN** the status command is invoked
- **THEN** it first runs the prerequisite checks from `sai/policies/prereqs.md` to ensure the project is ready

#### Scenario: Bulk mode dispatch follows status-picker signal
- **WHEN** `status-picker.md` emits the `> BULK-MODE ACTIVE` signal
- **THEN** the command switches from panel mode to bulk mode and invokes the tool with the `bulk` sub-command instead of `panel <name>`

### Requirement: No decision logic remains in the command file
The command file SHALL have zero responsibility for deriving artifact presence, specs approval, overview state, implementation progress, or the Next hint.

#### Scenario: Panel cells are tool-derived, not command-derived
- **WHEN** the tool renders a panel for a change
- **THEN** the command does not re-compute or validate any cell value; it simply relays the tool's output

#### Scenario: Tool changes do not require command changes
- **WHEN** the status tool is updated to improve edge-case handling or fix a bug in the decision table
- **THEN** the command file does not need to change; the tool update alone suffices

### Requirement: Command maintains the same external interface
The user-facing contract (input/output) of the `/sai-status` command SHALL remain unchanged: it continues to show the panel or bulk table for the requested change(s).

#### Scenario: User experience is unchanged
- **WHEN** a user invokes `/sai-status` with a change name
- **THEN** they receive the same panel format as before (one change, all 11 artifacts, specs cell, overview, implementation progress, Next hint)

#### Scenario: Bulk mode remains user-accessible
- **WHEN** a user invokes the status command with the "See all" option from status-picker
- **THEN** they receive the same bulk-changes table format as before (header, legend, one row per change)

