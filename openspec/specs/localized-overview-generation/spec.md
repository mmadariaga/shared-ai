# localized-overview-generation Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*
## Requirements
### Requirement: Route the effective language to overview generation

The design worker SHALL dispatch the budget-routed Change Overview generator only when the current design invocation carries an effective language selection: either an explicit `--overview-lang <language>` value or a language selected by `sai-explore` gate 9 and forwarded in the chained design envelope. When a language is present, the worker SHALL pass its exact value to the generator for the current initial materialization or regeneration attempt. When a direct design invocation has no flag, or an explore gate resolves do not create and therefore omits the flag from the chain, the worker SHALL not dispatch the generator, SHALL not manufacture an English generation value, and SHALL not start an overview generation-trigger continuation. The worker-owned value remains invocation-scoped and is not persisted. Whenever the generator is dispatched, its existing five-field result envelope SHALL remain unchanged.

#### Scenario: Selected language is used for initial generation

- **WHEN** a design invocation supplies `--overview-lang spanish` and the overview lifecycle reaches opted-in initial materialization
- **THEN** the generator receives `spanish`, writes only `change-overview.md`, and returns the existing result shape

#### Scenario: Explicit English is used for initial generation

- **WHEN** a design invocation supplies `--overview-lang English` and reaches initial materialization
- **THEN** the generator receives `English` and the overview is generated in English
- **AND** this is distinct from an invocation that omits the flag

#### Scenario: Default language is used for initial generation
- **WHEN** a design invocation omits `--overview-lang` and the overview lifecycle reaches initial materialization
- **THEN** the generator receives English and the existing overview state transitions and write scope are preserved

#### Scenario: Gate-selected language is used for chained generation

- **WHEN** `sai-explore` gate 9 selects `spanish` and forwards it as `--overview-lang spanish` to the chained design worker
- **THEN** the generator receives `spanish` for opted-in materialization
- **AND** the existing generator result shape and write scope remain unchanged

#### Scenario: Omitted flag skips initial generation

- **WHEN** a design invocation omits `--overview-lang` and reaches the feedback gate's Continue action
- **THEN** no generator dispatch occurs
- **AND** no overview-generation continuation or `materializing` transition is created by that action

### Requirement: Localize only the Change Overview projection

The selected language SHALL apply only to free-text prose in the human-oriented `change-overview.md` projection. Section headings, the Architecture Snapshot, requirements, scenarios, paths, commands, state values, and generator result keys SHALL remain verbatim English or source values as required by the existing Change Overview contract. The proposal, specs, design, tasks, interfaces, configuration, and other normative artifacts SHALL remain English and SHALL not be rewritten as part of overview generation.

#### Scenario: Normative artifacts remain unchanged

- **WHEN** overview generation is requested in a language other than English
- **THEN** only the overview projection is eligible for localized prose and no normative artifact or persisted language preference is modified

#### Scenario: Overview fidelity is preserved

- **WHEN** overview generation is requested in a language other than English
- **THEN** section headings, the Architecture Snapshot, requirements, scenarios, paths, commands, state values, and generator result keys remain verbatim English or source values while only free-text prose may be localized

### Requirement: Re-select language for every generation attempt

Every overview generation or regeneration attempt SHALL use an explicit language value from the current design invocation. The worker SHALL not read or persist a language selected by an earlier invocation. A later invocation without the flag SHALL skip generation or regeneration, even when an earlier overview was localized or an existing overview is stale; it SHALL not silently return to an implicit English generation path.

#### Scenario: Regeneration repeats the selected language

- **WHEN** a later source-modifying design request includes `--overview-lang spanish` and triggers opted-in regeneration
- **THEN** that regeneration uses `spanish` while preserving the existing exactly-once regeneration and overview-state lifecycle

#### Scenario: Regeneration without the flag is skipped

- **WHEN** a later source-modifying design request omits `--overview-lang` after a localized overview exists
- **THEN** no regeneration is dispatched
- **AND** the existing overview may remain stale without reusing the prior language or persisting a new preference

#### Scenario: Generation continuation carries the selected language

- **WHEN** the worker completes design planning with `spanish` explicitly selected and the coordinator triggers opted-in overview generation
- **THEN** the generation-trigger continuation carries the current invocation's `overview_language: spanish`
- **AND** the generator receives that value

#### Scenario: Regeneration without the flag returns to English
- **WHEN** a later source-modifying design request omits `--overview-lang` and triggers regeneration after a localized overview
- **THEN** that regeneration uses English and no prior language is reused or persisted

#### Scenario: Generation continuation carries the language field
- **WHEN** the worker completes design planning with `spanish` as its effective language and the coordinator triggers overview generation
- **THEN** the worker result and generation-trigger continuation payload both carry `overview_language: spanish`, and the generator receives that value

