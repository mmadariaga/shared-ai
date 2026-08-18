# explore-pipeline-selector Specification

## Purpose

Define the crystallization-close selector that explicitly authorizes supervised pipeline execution.

## Requirements

### Requirement: Emit the crystallization-close selector

`sai-explore` SHALL emit exactly one native two-option selector after every crystallization handoff and keep-window reminder. `Auto` MUST precede `Manual` and SHALL be the sole supervised pipeline entry.

#### Scenario: crystallization closes

- **WHEN** single, sliced, or inline-refusal crystallization emits its final handoff block
- **THEN** the turn ends with one localized selector offering Auto delegation or Manual continuation without a literal pipeline-token trigger

### Requirement: Authorize Auto dispatch

Selecting `Auto` SHALL authorize the existing supervised `sai-1` and `sai-2` lifecycle using `last_crystallization_set` while preserving worker-owned writes, review rounds, chaining, and retries.

#### Scenario: Auto is selected

- **WHEN** the user selects Auto from the crystallization-close selector
- **THEN** the supervisor selects at most one eligible latest-turn change and dispatches the existing phase machinery without expanding write scope

### Requirement: Define Manual behavior

Selecting `Manual` SHALL dispatch nothing or change supervision state. An unmapped free-text answer MUST be treated as Manual, and Manual SHALL remain re-invocable without a cap.

#### Scenario: Manual is selected

- **WHEN** the user selects Manual or provides an answer that maps to neither option
- **THEN** the turn closes with the keep-window reminder naming `review-loop` and no pipeline worker is dispatched

### Requirement: Preserve explicit gating

`--fast-track` SHALL NOT auto-select Auto or suppress the selector. Selector text SHALL follow language localization while `review-loop`, `/sai-1-spec`, and `/sai-2-design` MUST remain English literals.

#### Scenario: fast-track reaches selector presentation

- **WHEN** `--fast-track` is active or the crystallization turn is non-English
- **THEN** the selector is still explicitly asked with localized prose and unchanged command literals
