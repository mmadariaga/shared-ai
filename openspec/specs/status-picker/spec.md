# status-picker Specification

## Purpose

The status-picker capability defines the dedicated change-name picker instruction used by `/sai-status` to resolve a missing change name. A trimmed, non-empty invocation-envelope `arguments_value` is authoritative; when it is empty, the capability uses `openspec list --json` and adds a "See all" option on the 2+ branch for bulk status.

## Requirements

### Requirement: sai-status uses a dedicated status-picker

`sai-status` SHALL resolve a missing change name via a dedicated `sai/policies/status-picker.md` instruction rather than the shared `change-picker.md`. `status-picker.md` SHALL use the invocation-envelope machinery: a trimmed, non-empty `arguments_value` is authoritative, the opaque `wrapper_echo_value` is forwarded unchanged and ignored for name selection, and the 0/1/N fallback runs only when `arguments_value` is empty. `openspec list --json` SHALL be the sole source of change names for that fallback, followed by resolved-name substitution. Resolution SHALL NOT scan conversation history or require a labelled line. No other `sai-*` command SHALL fetch `status-picker.md`.

#### Scenario: sai-status fetches status-picker
- **WHEN** `/sai-status` is invoked
- **THEN** it fetches `sai/policies/status-picker.md` to resolve the change name, and does not fetch `change-picker.md`

#### Scenario: change name already provided is a no-op
- **WHEN** `/sai-status` is invoked with a non-empty trimmed `arguments_value`
- **THEN** `status-picker.md` is a no-op — no `openspec list --json` call and no user prompt — and the single-change panel is rendered for the provided change while forwarding `wrapper_echo_value` unchanged

#### Scenario: opaque wrapper value is not a name source
- **WHEN** `/sai-status` is invoked with an empty `arguments_value` and a non-empty `wrapper_echo_value`
- **THEN** the wrapper value is forwarded opaquely and the status-picker uses its 0/1/N fallback instead of resolving the wrapper value as a change name

### Requirement: status-picker 0-change and 1-change branches match change-picker

On the zero-changes and exactly-one-change branches, `status-picker.md` SHALL behave identically to `change-picker.md` when `arguments_value` is empty: zero changes SHALL stop and print the "No active changes found. Run `/sai-1-spec` to create one." message; exactly one change SHALL ask "Use change '{name}'?" with yes/no semantics and the same decline/stop behavior. Neither branch SHALL offer a "See all" option.

#### Scenario: zero active changes
- **WHEN** `status-picker.md` runs with an empty `arguments_value` and `openspec list --json` returns an empty `changes` array
- **THEN** it stops and prints "No active changes found. Run `/sai-1-spec` to create one." with no "See all" option

#### Scenario: exactly one active change
- **WHEN** `status-picker.md` runs with an empty `arguments_value` and `openspec list --json` returns exactly one change
- **THEN** it asks "Use change '{name}'?" with yes/no options, resolving to that change on yes and declining on anything else, with no "See all" option

### Requirement: status-picker 2+ branch offers "See all" as the first option

On the two-or-more-changes branch, `status-picker.md` SHALL present a closed-choice prompt whose FIRST option is "See all", followed by one option per active change name in the order returned by `openspec list --json`. Selecting a specific change SHALL resolve that change name and fall through to the standard single-change `sai-status` panel, identical to the change-picker N branch. Selecting "See all" SHALL print exactly `> BULK-MODE ACTIVE` and trigger the bulk status table. The prompt SHALL be presented through the harness's native option-picker where one exists, with a plain-text fallback listing "See all" as option 1 followed by the changes, identically across opencode and Claude Code.

#### Scenario: See all is the first option
- **WHEN** `status-picker.md` runs with an empty `arguments_value` and `openspec list --json` returns two or more changes
- **THEN** the prompt's first option is "See all" and the remaining options are the change names in list order

#### Scenario: selecting a specific change renders the single-change panel
- **WHEN** the user selects one of the change-name options
- **THEN** that change is resolved and the standard single-change `sai-status` panel is rendered, exactly as the change-picker N branch would produce

#### Scenario: selecting See all triggers the bulk table
- **WHEN** the user selects the "See all" option
- **THEN** the agent prints exactly `> BULK-MODE ACTIVE` and renders the bulk status table for all active changes instead of a single-change panel

#### Scenario: supported-harness presentation
- **WHEN** the 2+ prompt is presented under opencode or Claude Code
- **THEN** the option set and its semantics are identical across the two supported harnesses, using each harness's native option-picker with a plain-text fallback and no harness-specific branch

### Requirement: status-picker preserves the read-only invariant

`status-picker.md` SHALL NOT create, modify, or delete any file under `openspec/` or elsewhere. Its only side effects SHALL be read-only `openspec` CLI calls, local file reads, and presenting the picker prompt.

#### Scenario: no writes during resolution or See all
- **WHEN** `status-picker.md` runs any branch, including "See all"
- **THEN** no file under any `openspec/` path (nor `.openspec.yaml`) is created, modified, or deleted
