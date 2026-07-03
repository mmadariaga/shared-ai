## ADDED Requirements

### Requirement: Invocation Trigger
The change-picker instruction SHALL run only when the consuming command's `$ARGUMENTS` is empty at the point the command's `## Load instructions` step reaches it. When `$ARGUMENTS` is non-empty, the instruction SHALL be a no-op and the provided value SHALL pass through unchanged.

#### Scenario: Change name already provided
- **WHEN** a change-consuming `sai-*` command is invoked with a non-empty change name in `$ARGUMENTS`
- **THEN** the change-picker instruction does not query OpenSpec or prompt the user, and the command proceeds using the provided name exactly as before this capability existed

#### Scenario: Change name missing
- **WHEN** a change-consuming `sai-*` command is invoked with an empty `$ARGUMENTS`
- **THEN** the change-picker instruction activates before any other command processing

### Requirement: Active Change Enumeration
The change-picker instruction SHALL enumerate active changes by running `openspec list --json` and parsing the `changes` array. It SHALL NOT use any other mechanism (no filesystem globbing of `openspec/changes/`, no additional CLI flags or dependencies) to discover changes.

#### Scenario: List command invoked
- **WHEN** the change-picker instruction needs to discover active changes
- **THEN** it runs `openspec list --json` and reads the `changes[].name` field of the result

### Requirement: Zero Changes Handling
WHEN `openspec list --json` returns zero active changes, the change-picker instruction SHALL STOP and print a friendly message that hints the user to run `/sai-1-spec` to create one. It SHALL NOT proceed to any further processing in the consuming command.

#### Scenario: No active changes exist
- **WHEN** the change-picker instruction runs and `changes` is an empty array
- **THEN** it prints a friendly stop message referencing `/sai-1-spec` and the consuming command halts without picking a name

### Requirement: Single Change Confirmation
WHEN exactly one active change exists, the change-picker instruction SHALL NOT auto-select it. It SHALL present the single change's name to the user and require an explicit yes/no confirmation before treating it as the resolved change name.

#### Scenario: One active change, user confirms
- **WHEN** `openspec list --json` returns exactly one change and the user answers yes to the confirmation prompt
- **THEN** that change's name becomes the resolved change name and the command continues as if the user had typed it

#### Scenario: One active change, user declines
- **WHEN** `openspec list --json` returns exactly one change and the user answers no to the confirmation prompt
- **THEN** the change-picker instruction does not resolve a name and the command halts without proceeding

### Requirement: Multiple Changes Numbered Picker
WHEN two or more active changes exist, the change-picker instruction SHALL present a numbered list of change names and prompt the user to select one by number. It SHALL reject input that does not correspond to a valid list number and re-prompt rather than guessing or defaulting.

#### Scenario: Multiple active changes, valid selection
- **WHEN** `openspec list --json` returns two or more changes and the user enters a number within the listed range
- **THEN** the change at that position becomes the resolved change name and the command continues as if the user had typed it

#### Scenario: Multiple active changes, invalid selection
- **WHEN** `openspec list --json` returns two or more changes and the user enters a number outside the listed range or non-numeric input
- **THEN** the change-picker instruction rejects the input and re-prompts without resolving a name

### Requirement: Resolved Name Substitution
Once the change-picker instruction resolves a single confirmed change name (via the single-change confirmation or the multiple-changes picker), the consuming command SHALL substitute that name for `$ARGUMENTS` for the remainder of its execution, identically to how a user-supplied name would flow through the command.

#### Scenario: Resolved name flows through the rest of the command
- **WHEN** the change-picker instruction resolves a change name through either the single- or multiple-change path
- **THEN** every subsequent step in the consuming command (prerequisite checks already run, instruction fetches, completion messages) uses the resolved name wherever it would have used a directly-typed `$ARGUMENTS` value

### Requirement: Shared Instruction, No Duplication
The change-picker logic SHALL live in exactly one file, `sai/instructions/change-picker.md`, fetched identically by every change-consuming `sai-*` command body. Command bodies SHALL NOT duplicate the picker's 0/1/N logic inline.

#### Scenario: Picker updated once, applies everywhere
- **WHEN** `sai/instructions/change-picker.md` is edited
- **THEN** every command body that fetches it (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-backfill`) reflects the change without any of those command bodies being edited
