# change-picker Specification

## Purpose

TBD - created by archiving change minor-bugfixes. Update Purpose after archive.
## Requirements
### Requirement: Wrapper-Echo Resolution
The change-picker instruction SHALL resolve a change name by scanning the conversation history for a line matching exactly one of the two accepted opencode wrapper-echo forms: `**Change-name argument:** <value>` or `**Change-name argument and and optional flags:** <value>` (two literal asterisks, the literal text `Change-name argument:` or `Change-name argument and and optional flags:`, a single space, and the change name; the value extends to the end of that line). The scan covers the user message that invoked the command (the wrapper), so the line is reliably found even if tool results or model turns have appeared afterward. If a matching line is present anywhere in the conversation history with a non-empty `<value>`, the change-picker SHALL treat `<value>` as the resolved change name and SHALL be a no-op (no OpenSpec query, no user prompt). If no matching line is present, or every matching line has an empty or whitespace-only value, the change-picker SHALL fall through to the existing `$ARGUMENTS` check and the 0/1/N picker logic.

#### Scenario: Wrapper-echo line present with non-empty value
- **WHEN** the change-picker is reached by a change-consuming `sai-*` command AND the conversation history contains a line matching exactly one of the two accepted echo-line forms with non-empty `<value>` (regardless of any tool results or model turns that appear after the user message)
- **THEN** the change-picker treats `<value>` as the resolved change name and the consuming command proceeds using that name, with no OpenSpec query and no user prompt

#### Scenario: Wrapper-echo line absent or value empty
- **WHEN** the change-picker is reached by a change-consuming `sai-*` command AND the conversation history contains no matching echo-line OR the only matching line has an empty or whitespace-only value
- **THEN** the change-picker falls through to the existing `$ARGUMENTS` check and the 0/1/N picker logic

### Requirement: Invocation Trigger
The change-picker instruction SHALL run only when no change name is available from a wrapper-echo line (in either accepted form) and the consuming command's `$ARGUMENTS` is empty at the point the command's `## Load instructions` step reaches it. When any of those two sources provides a non-empty change name, the change-picker SHALL be a no-op (no OpenSpec query, no user prompt) and the provided value SHALL pass through unchanged. The wrapper-echo line check runs first; the `$ARGUMENTS` check is the fall-through path.

#### Scenario: Change name already provided via wrapper-echo
- **WHEN** a change-consuming `sai-*` command is invoked AND the conversation history contains a matching wrapper-echo line with non-empty `<value>` (regardless of any tool results or model turns that appear after the user message)
- **THEN** the change-picker instruction does not query OpenSpec or prompt the user, and the command proceeds using the wrapper-echo value exactly as if the user had typed it

#### Scenario: Change name already provided via $ARGUMENTS
- **WHEN** a change-consuming `sai-*` command is invoked AND no matching wrapper-echo line is present AND `$ARGUMENTS` is non-empty
- **THEN** the change-picker instruction does not query OpenSpec or prompt the user, and the command proceeds using the provided name exactly as before this change existed

#### Scenario: Change name missing
- **WHEN** a change-consuming `sai-*` command is invoked AND no matching wrapper-echo line is present (or it has an empty value) AND `$ARGUMENTS` is empty
- **THEN** the change-picker instruction activates before any other command processing

