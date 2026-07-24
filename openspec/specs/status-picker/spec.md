# status-picker Specification

## Purpose

The status-picker capability defines the dedicated change-name picker instruction used by `/sai-status` to resolve a missing change name. It reuses the shared `change-picker.md` resolution machinery (wrapper-echo, invocation trigger, `openspec list --json`) but adds a "See all" option on the 2+ branch that triggers the bulk status table instead of resolving to a single change.

## Requirements

### Requirement: sai-status uses a dedicated status-picker

`sai-status` SHALL resolve a missing change name via a dedicated `sai/instructions/status-picker.md` instruction rather than the shared `change-picker.md`. `status-picker.md` SHALL reuse the change-picker resolution machinery — wrapper-echo resolution, the invocation trigger, `openspec list --json` as the sole source of change names, and the resolved-name substitution — unchanged. No other `sai-*` command SHALL fetch `status-picker.md`.

#### Scenario: sai-status fetches status-picker
- **WHEN** `/sai-status` is invoked
- **THEN** it fetches `sai/instructions/status-picker.md` to resolve the change name, and does not fetch `change-picker.md`

#### Scenario: change name already provided is a no-op
- **WHEN** `/sai-status <change-name>` is invoked with a non-empty change name (via `$ARGUMENTS` or a wrapper-echo line)
- **THEN** `status-picker.md` is a no-op — no `openspec list --json` call and no user prompt — and the single-change panel is rendered for the provided change exactly as before this capability existed

### Requirement: status-picker 0-change and 1-change branches match change-picker

On the zero-changes and exactly-one-change branches, `status-picker.md` SHALL behave identically to `change-picker.md`: zero changes SHALL stop and print the "No active changes found. Run `/sai-1-spec` to create one." message; exactly one change SHALL ask "Use change '{name}'?" with yes/no semantics and the same decline/stop behavior. Neither branch SHALL offer a "See all" option.

#### Scenario: zero active changes
- **WHEN** `status-picker.md` runs and `openspec list --json` returns an empty `changes` array
- **THEN** it stops and prints "No active changes found. Run `/sai-1-spec` to create one." with no "See all" option

#### Scenario: exactly one active change
- **WHEN** `status-picker.md` runs and `openspec list --json` returns exactly one change
- **THEN** it asks "Use change '{name}'?" with yes/no options, resolving to that change on yes and declining on anything else, with no "See all" option

### Requirement: status-picker 2+ branch offers "See all" as the first option

On the two-or-more-changes branch, `status-picker.md` SHALL present a closed-choice prompt whose FIRST option is "See all", followed by one option per active change name in the order returned by `openspec list --json`. Selecting a specific change SHALL resolve that change name and fall through to the standard single-change `sai-status` panel, identical to the change-picker N branch. Selecting "See all" SHALL trigger the bulk status table. The prompt SHALL be presented through the harness's native option-picker where one exists, with a plain-text fallback listing "See all" as option 1 followed by the changes, identically across opencode, Claude Code, and GitHub Copilot.

#### Scenario: See all is the first option
- **WHEN** `status-picker.md` runs and `openspec list --json` returns two or more changes
- **THEN** the prompt's first option is "See all" and the remaining options are the change names in list order

#### Scenario: selecting a specific change renders the single-change panel
- **WHEN** the user selects one of the change-name options
- **THEN** that change is resolved and the standard single-change `sai-status` panel is rendered, exactly as the change-picker N branch would produce

#### Scenario: selecting See all triggers the bulk table
- **WHEN** the user selects the "See all" option
- **THEN** the bulk status table is rendered for all active changes instead of a single-change panel

#### Scenario: harness-agnostic presentation
- **WHEN** the 2+ prompt is presented under opencode, Claude Code, or GitHub Copilot
- **THEN** the option set and its semantics are identical across all three harnesses, using each harness's native option-picker with a plain-text fallback and no harness-specific branch

### Requirement: status-picker preserves the read-only invariant

`status-picker.md` SHALL NOT create, modify, or delete any file under `openspec/` or elsewhere. Its only side effects SHALL be read-only `openspec` CLI calls, local file reads, and presenting the picker prompt.

#### Scenario: no writes during resolution or See all
- **WHEN** `status-picker.md` runs any branch, including "See all"
- **THEN** no file under any `openspec/` path (nor `.openspec.yaml`) is created, modified, or deleted
