## MODIFIED Requirements

### Requirement: Route the effective language to overview generation
The design worker SHALL dispatch the budget-routed Change Overview generator only when the current design invocation carries an effective language selection: either an explicit `--overview-lang <language>` value or a language selected by `sai-explore` gate 9 and forwarded in the chained design envelope. When a language is present, the worker SHALL pass its exact value to the generator for the current initial materialization or regeneration attempt. When a direct design invocation has no flag, or an explore gate resolves do not create and therefore omits the flag from the chain, the worker SHALL not dispatch the generator, SHALL not manufacture an English generation value, and SHALL not start an overview generation-trigger continuation. The worker-owned value remains invocation-scoped and is not persisted. Whenever the generator is dispatched, its existing five-field result envelope SHALL remain unchanged.

#### Scenario: Selected language is used for initial generation
- **WHEN** a design invocation supplies `--overview-lang spanish` and the overview lifecycle reaches opted-in initial materialization
- **THEN** the generator receives `spanish`, writes only `change-overview.md`, and returns the existing result shape

#### Scenario: Explicit English is used for initial generation
- **WHEN** a design invocation supplies `--overview-lang English` and reaches initial materialization
- **THEN** the generator receives `English` and the overview is generated in English
- **AND** this is distinct from an invocation that omits the flag

#### Scenario: Gate-selected language is used for chained generation
- **WHEN** `sai-explore` gate 9 selects `spanish` and forwards it as `--overview-lang spanish` to the chained design worker
- **THEN** the generator receives `spanish` for opted-in materialization
- **AND** the existing generator result shape and write scope remain unchanged

#### Scenario: Omitted flag skips initial generation
- **WHEN** a design invocation omits `--overview-lang` and reaches the feedback gate's Continue action
- **THEN** no generator dispatch occurs
- **AND** no overview-generation continuation or `materializing` transition is created by that action

#### Scenario: omitted-language-generation-is-skipped
- **WHEN** a direct design invocation omits `--overview-lang` and reaches Continue
- **THEN** no generator dispatch, overview-generation continuation, materializing transition, or implicit English value is created.

## REMOVED Requirements

### Requirement: Default language is used for initial generation
**Reason:** The staged contract removes implicit English generation when the overview-language flag is absent.
**Migration:** Require explicit `--overview-lang <language>` for every overview generation attempt and leave omitted-language runs on the no-generation route.
#### Scenario: omitted-language-default-is-retired
- **WHEN** a design invocation omits `--overview-lang`
- **THEN** it does not enter an English default-generation path.

### Requirement: Regeneration without the flag returns to English
**Reason:** Regeneration must not silently reuse or manufacture English when no current language is selected.
**Migration:** Skip regeneration without the flag and allow the existing overview to remain stale until an explicit language is supplied.

#### Scenario: omitted-language-regeneration-is-retired
- **WHEN** a later design request omits `--overview-lang` after a localized overview exists
- **THEN** no English regeneration is dispatched.

