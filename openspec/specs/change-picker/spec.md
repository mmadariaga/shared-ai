## ADDED Requirements

### Requirement: Invocation Trigger
The change-picker instruction SHALL run only when no change name is available from the wrapper-echo line and the consuming command's `$ARGUMENTS` is empty at the point the command's `## Load instructions` step reaches it. When any of those two sources provides a non-empty change name, the instruction SHALL be a no-op and the provided value SHALL pass through unchanged. The wrapper-echo line check runs first; the `$ARGUMENTS` check is the fall-through path.

#### Scenario: Change name already provided via wrapper-echo
- **WHEN** a change-consuming `sai-*` command is invoked AND the conversation history contains a `**Change-name argument:** <value>` line with non-empty `<value>` (regardless of any tool results or model turns that appear after the user message)
- **THEN** the change-picker instruction does not query OpenSpec or prompt the user, and the command proceeds using the wrapper-echo value exactly as if the user had typed it

#### Scenario: Change name already provided via $ARGUMENTS
- **WHEN** a change-consuming `sai-*` command is invoked AND no wrapper-echo line is present AND `$ARGUMENTS` is non-empty
- **THEN** the change-picker instruction does not query OpenSpec or prompt the user, and the command proceeds using the provided name exactly as before this change existed

#### Scenario: Change name missing
- **WHEN** a change-consuming `sai-*` command is invoked AND no wrapper-echo line is present (or it has an empty value) AND `$ARGUMENTS` is empty
- **THEN** the change-picker instruction activates before any other command processing

### Requirement: Wrapper-Echo Resolution
The change-picker instruction SHALL resolve a change name by scanning the conversation history for a line matching exactly `**Change-name argument:** <value>` (two literal asterisks, the literal text `Change-name argument:`, a single space, and the change name; the value extends to the end of that line). The scan covers the user message that invoked the command (the wrapper), so the line is reliably found even if tool results or model turns have appeared afterward. If the line is present anywhere in the conversation history and `<value>` is non-empty, the change-picker SHALL treat `<value>` as the resolved change name and SHALL be a no-op (no OpenSpec query, no user prompt). If the line is absent, or present with an empty or whitespace-only value, the change-picker SHALL fall through to the existing `$ARGUMENTS` check and the 0/1/N picker logic.

#### Scenario: Wrapper-echo line present with non-empty value
- **WHEN** the change-picker is reached by a change-consuming `sai-*` command AND the conversation history contains a line matching exactly `**Change-name argument:** <value>` with non-empty `<value>` (regardless of any tool results or model turns that appear after the user message)
- **THEN** the change-picker treats `<value>` as the resolved change name and the consuming command proceeds using that name, with no OpenSpec query and no user prompt

#### Scenario: Wrapper-echo line absent or value empty
- **WHEN** the change-picker is reached by a change-consuming `sai-*` command AND the conversation history contains no `**Change-name argument:**` line OR the only matching line has an empty or whitespace-only value
- **THEN** the change-picker falls through to the existing `$ARGUMENTS` check and the 0/1/N picker logic

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
WHEN exactly one active change exists, the change-picker instruction SHALL NOT auto-select it. It SHALL present the single change's name to the user and require an explicit yes/no confirmation before treating it as the resolved change name. The confirmation MUST be presented as a closed-choice prompt with options `yes` / `no` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping); the plain-text fallback reads `Use change '{name}'? (yes/no)`. A `yes` is matched case-insensitively whether the user clicks the option or types it.

#### Scenario: One active change, user confirms
- **WHEN** `openspec list --json` returns exactly one change and the user answers `yes` to the confirmation prompt
- **THEN** that change's name becomes the resolved change name and the command continues as if the user had typed it

#### Scenario: One active change, user declines
- **WHEN** `openspec list --json` returns exactly one change and the user answers `no` to the confirmation prompt (or stays silent, or gives an off-topic reply)
- **THEN** the change-picker instruction does not resolve a name and the command halts without proceeding

### Requirement: Multiple Changes Numbered Picker
WHEN two or more active changes exist, the change-picker instruction SHALL present one option per change name (in the order returned by `openspec list --json`) and ask the user to select one. The selection MUST be presented as a closed-choice prompt (per the "Closed-choice prompts" rule in `remember.md`): on harnesses with a native option-picker, one option per change name; on harnesses without one, a plain-text fallback that prints a 1-indexed numbered list with the prompt `Which change? Enter a number (1-{N}).` The instruction SHALL reject input that does not correspond to a valid selection (a clicked option that does not match, a number outside the range, a non-numeric reply, or a free-text reply that matches no listed name) and re-prompt rather than guessing or defaulting. Re-prompting is unbounded — no retry cap.

#### Scenario: Multiple active changes, valid selection via click
- **WHEN** `openspec list --json` returns two or more changes and the user clicks one of the listed options
- **THEN** the change matching that option becomes the resolved change name and the command continues as if the user had typed it

#### Scenario: Multiple active changes, valid selection via number
- **WHEN** `openspec list --json` returns two or more changes and the user enters a number within the listed range
- **THEN** the change at that position becomes the resolved change name and the command continues as if the user had typed it

#### Scenario: Multiple active changes, invalid selection
- **WHEN** `openspec list --json` returns two or more changes and the user enters a number outside the listed range, a non-numeric input, or a free-text reply that matches no listed name
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
- **THEN** every command body that fetches it (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`) reflects the change without any of those command bodies being edited. `sai-backfill` is the only `sai-*` command that previously fetched the picker and now does not; it is excluded from this list because `/sai-backfill` creates changes from a diff and therefore has its own name-resolution flow (`sai/instructions/backfill.md` STOP Conditions and Phase 4).
