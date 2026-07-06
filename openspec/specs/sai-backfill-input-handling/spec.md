## ADDED Requirements

### Requirement: Wrapper MUST NOT fetch the change-picker

The `sai/commands/sai-backfill.md` wrapper body MUST NOT contain a `Fetch @sai/instructions/change-picker.md` directive. Removing the fetch detaches `sai-backfill` from the picker so that the wrapper no longer queries `openspec list --json` or prompts the user with a numbered change list.

#### Scenario: Wrapper has no change-picker fetch

    - **WHEN** the agent reads `sai/commands/sai-backfill.md` after this change is applied
    - **THEN** the file MUST NOT contain any `Fetch @sai/instructions/change-picker.md` line, and MUST NOT contain any other directive that resolves to `sai/instructions/change-picker.md`

### Requirement: Empty-arguments resolution delegates to backfill.md

When `/sai-backfill` is invoked with an empty `$ARGUMENTS`, the wrapper MUST forward execution to `sai/instructions/backfill.md` and MUST NOT introduce any additional resolution mechanism (no inline list, no re-prompt, no `openspec list` call). The empty-`$ARGUMENTS` case is handled by the STOP Conditions section at `sai/instructions/backfill.md:7-10`; the derived-name case is handled by Phase 4 ("Change Name Confirmation"). The wrapper is a pass-through to both.

#### Scenario: Empty arguments falls through to STOP Conditions

    - **WHEN** the user runs `/sai-backfill` with no arguments and no name can be derived from conversation context
    - **THEN** the agent MUST print exactly `Change name required. Run: /sai-backfill <name>` and stop, as specified by the STOP Conditions section at `sai/instructions/backfill.md:10`

#### Scenario: Non-empty arguments proceed unchanged

    - **WHEN** the user runs `/sai-backfill some-kebab-name` with a kebab-case change name
    - **THEN** the wrapper MUST use `some-kebab-name` as the change name and proceed to Phase 4 of `sai/instructions/backfill.md` without any picker interaction

#### Scenario: No picker side effects on the backfill path

    - **WHEN** `/sai-backfill` runs (with or without arguments)
    - **THEN** the agent MUST NOT execute `openspec list` for picker purposes, MUST NOT present a numbered change list, and MUST NOT prompt the user with "Which change? Enter a number (1-N)"
