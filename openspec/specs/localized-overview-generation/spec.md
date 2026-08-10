# localized-overview-generation Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

### Requirement: Route the effective language to overview generation

The design worker SHALL pass the current invocation's effective overview language to the budget-routed Change Overview generator. When no language flag was supplied, the generator SHALL receive English. The worker-owned invocation state and the worker result returned to the coordinator SHALL carry an `overview_language` field, and the coordinator's generation-trigger continuation payload SHALL include that field. This transport field is invocation-scoped and is not persisted. The generator's existing five-field result envelope SHALL remain unchanged.

#### Scenario: Selected language is used for initial generation

- **WHEN** a design invocation supplies `--overview-lang spanish` and the overview lifecycle reaches initial materialization
- **THEN** the generator receives `spanish`, writes only `change-overview.md`, and returns the existing result shape

#### Scenario: Default language is used for initial generation

- **WHEN** a design invocation omits `--overview-lang` and the overview lifecycle reaches initial materialization
- **THEN** the generator receives English and the existing overview state transitions and write scope are preserved

### Requirement: Localize only the Change Overview projection

The selected language SHALL apply only to free-text prose in the human-oriented `change-overview.md` projection. Section headings, the Architecture Snapshot, requirements, scenarios, paths, commands, state values, and generator result keys SHALL remain verbatim English or source values as required by the existing Change Overview contract. The proposal, specs, design, tasks, interfaces, configuration, and other normative artifacts SHALL remain English and SHALL not be rewritten as part of overview generation.

#### Scenario: Normative artifacts remain unchanged

- **WHEN** overview generation is requested in a language other than English
- **THEN** only the overview projection is eligible for localized prose and no normative artifact or persisted language preference is modified

#### Scenario: Overview fidelity is preserved

- **WHEN** overview generation is requested in a language other than English
- **THEN** section headings, the Architecture Snapshot, requirements, scenarios, paths, commands, state values, and generator result keys remain verbatim English or source values while only free-text prose may be localized

### Requirement: Re-select language for every generation attempt

Overview generation and regeneration SHALL use the effective language of the current design invocation and SHALL not read or persist a language selected by an earlier invocation. A later invocation without the flag SHALL therefore use English, even when an earlier overview was localized.

#### Scenario: Regeneration repeats the selected language

- **WHEN** a later source-modifying design request includes `--overview-lang spanish` and triggers regeneration
- **THEN** that regeneration uses `spanish` while preserving the existing exactly-once regeneration and overview-state lifecycle

#### Scenario: Regeneration without the flag returns to English

- **WHEN** a later source-modifying design request omits `--overview-lang` and triggers regeneration after a localized overview
- **THEN** that regeneration uses English and no prior language is reused or persisted

#### Scenario: Generation continuation carries the language field

- **WHEN** the worker completes design planning with `spanish` as its effective language and the coordinator triggers overview generation
- **THEN** the worker result and generation-trigger continuation payload both carry `overview_language: spanish`, and the generator receives that value
