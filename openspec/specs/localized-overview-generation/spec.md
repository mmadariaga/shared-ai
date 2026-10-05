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

### Requirement: Localize only the Change Overview projection

The selected invocation language SHALL apply only to explanatory prose in the human-oriented `change-overview.md` projection. Explanatory prose SHALL be translated only when required, preserving its meaning, complete content, and Markdown formatting. Text already in the selected language SHALL be copied verbatim apart from permitted heading-depth adjustment and Files Affected block wrapping.

All actual Markdown headings, including complete source Step titles, and structural field labels SHALL remain verbatim English regardless of the selected language. The structural wrappers Proposal, Design, Step N, Interfaces, and Tasks SHALL remain English. Structural field labels SHALL mean section or field names such as Goals, Provenance, Interfaces, Test assertions, and Files Affected, not every emphasized explanatory phrase. Heading-like text inside code SHALL remain code rather than be treated as a heading.

Code, public signatures, paths, identifiers, test expressions, commands, state values, source artifact names, result keys, and other technical literals SHALL remain unchanged, including inline code and code blocks. Files Affected wrapper normalization SHALL preserve the entry contents exactly.

Proposal, specs, design, tasks, interfaces, configuration, and other normative artifacts SHALL remain English and SHALL NOT be rewritten by overview generation. Language selection SHALL remain invocation-scoped, with no persisted preference. Existing dispatch selection, five-field result, single-file scope, and re-selection rules SHALL remain unchanged.

#### Scenario: Normative artifacts remain unchanged
- **WHEN** overview generation is requested in a language other than English
- **THEN** only eligible overview explanatory prose is translated and no normative artifact or persisted language preference is modified

#### Scenario: Overview fidelity is preserved
- **WHEN** overview generation is requested in a language other than English
- **THEN** explanatory prose translates faithfully while all actual headings, complete Step titles, structural labels, wrappers, code, signatures, paths, identifiers, test expressions, commands, state values, artifact names, and result keys remain unchanged

#### Scenario: text already uses the selected language
- **WHEN** selected source text already uses the effective overview language
- **THEN** the generator copies it verbatim except for permitted Markdown heading-depth adjustment and Files Affected block wrapping

#### Scenario: technical code is embedded in translated prose
- **WHEN** selected prose contains inline code or fenced or indented code blocks
- **THEN** translation preserves their exact technical content and whitespace inside blocks, including heading-like code text

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

#### Scenario: Generation continuation carries the language field
- **WHEN** the worker completes design planning with `spanish` as its effective language and the coordinator triggers overview generation
- **THEN** the worker result and generation-trigger continuation payload both carry `overview_language: spanish`, and the generator receives that value
