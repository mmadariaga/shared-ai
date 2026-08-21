# explore-overview-language-gate Specification

## Purpose

TBD
## Requirements
### Requirement: Scope limited to sai-explore crystallization

The overview-language gate applies only within `sai-explore`, firing on every explicit crystallization request after the crystallization language gate (item 8) and before any `Ready to Propose` block prints. An explicit `--overview-lang <language>` option suppresses this gate because the parser already supplied the answer. Without the explicit option, gate 9 SHALL present the opt-in selector and resolve either a language or do-not-create. Free-form exploration and idea-debate turns SHALL NOT trigger it, and no other `sai-*` command is affected.

#### Scenario: English crystallization evaluates the selector

- **WHEN** an English `sai-explore` turn explicitly requests crystallization without `--overview-lang`
- **THEN** gate 9 fires after gate 8 and before the handoff block
- **AND** it presents the two-option English-language form defined below

#### Scenario: explicit crystallize request evaluates the gate
- **WHEN** an explicit crystallization request reaches the overview-language stage without the flag
- **THEN** gate 9 fires after gate 8 and before the handoff block

#### Scenario: exploration does not trigger the gate
- **WHEN** a turn continues free-form exploration of the idea
- **THEN** no overview-language question is asked and no overview opt-in decision is created

#### Scenario: Non-English crystallization evaluates the selector

- **WHEN** a non-English `sai-explore` turn explicitly requests crystallization without `--overview-lang`
- **THEN** gate 9 fires after gate 8 and before the handoff block
- **AND** it presents the three-option ambient-language form defined below

#### Scenario: Explicit language suppresses gate 9

- **WHEN** a crystallization turn belongs to an invocation with `--overview-lang spanish`
- **THEN** gate 9 asks no question and uses `spanish` as the invocation's selected language

#### Scenario: Exploration does not trigger gate 9

- **WHEN** a turn continues free-form exploration of the idea
- **THEN** no overview-language question is asked and no overview opt-in decision is created

### Requirement: English input skips the gate

When the crystallize turn's dominant natural language is English and no explicit `--overview-lang` value was supplied, `sai-explore` SHALL ask exactly two options in order: do not create, then the literal word `English`. No option SHALL carry a `Recommended` marker. The question and the do-not-create option's surrounding prose SHALL use the current conversation language, while the literal `English` option remains verbatim. Selecting do not create SHALL resolve the overview language to `None`; selecting `English` SHALL opt in with the value `English`.

#### Scenario: English input receives no recommended option

- **WHEN** an English crystallization turn reaches gate 9 without the flag
- **THEN** exactly two options are presented in order: do not create and `English`
- **AND** neither option carries a `Recommended` marker

#### Scenario: English user opts out

- **WHEN** the user selects do not create in the English two-option form
- **THEN** the gate resolves to `None`
- **AND** the handoff does not opt into overview generation

#### Scenario: English user opts in

- **WHEN** the user selects `English` in the English two-option form
- **THEN** the gate resolves to `English`
- **AND** the handoff opts into English overview generation

#### Scenario: English user gets no question
- **WHEN** the user crystallizes in English
- **THEN** no overview-language question is asked and the overview language is English

### Requirement: Non-English input gates on a language choice with the ambient language recommended

When the crystallize turn's dominant natural language is not English and no explicit `--overview-lang` value was supplied, `sai-explore` SHALL ask exactly three options in order: do not create, the literal word `English`, then the user's current language written as its endonym. No option SHALL carry a `Recommended` marker. The question and all nonliteral option prose, including the do-not-create option and the endonym label, SHALL be rendered in the user's current language; only the literal word `English` remains verbatim. Selecting do not create SHALL resolve to `None`; selecting either language SHALL resolve to that language.

#### Scenario: Non-English input receives all three choices

- **WHEN** a non-English crystallization turn reaches gate 9 without the flag
- **THEN** exactly three options are presented in the order do not create, `English`, and the current-language endonym
- **AND** no option carries a `Recommended` marker

#### Scenario: Non-English user chooses the ambient language

- **WHEN** the user selects the endonym option
- **THEN** the gate resolves to that language value
- **AND** the same value applies to the entire crystallization handoff

#### Scenario: Non-English user chooses English

- **WHEN** the user selects the literal `English` option
- **THEN** the gate resolves to `English`
- **AND** the literal option label remains exactly `English`

#### Scenario: ambient option is first and recommended
- **WHEN** a non-English user is asked the overview-language question
- **THEN** the current-language option is first and the literal word `English` is second

#### Scenario: English literal is preserved
- **WHEN** the gate question is rendered
- **THEN** the English-option label keeps the literal word `English` verbatim

### Requirement: Input language determination

`sai-explore` SHALL treat the dominant natural language of the crystallize turn as the current language; incidental code-switching, transliteration, or embedded technical terms SHALL NOT flip the determination. When the dominant language cannot be determined with reasonable confidence, `sai-explore` SHALL still ask gate 9 using the two-option form: do not create followed by the literal `English`, with no `Recommended` marker. This gate-9 rule intentionally differs from the `sai/policies/remember.md` fallback used by gate 3 and gate 8.

#### Scenario: mixed technical terms do not flip the language

- **WHEN** a non-English crystallize turn embeds English technical terms
- **THEN** the three-option form still uses the non-English language as the current language

#### Scenario: Unclear dominant language uses the two-option form

- **WHEN** the dominant language of the turn cannot be determined with reasonable confidence
- **THEN** gate 9 asks the two-option do-not-create/`English` form
- **AND** it does not silently apply `sai/policies/remember.md` or skip the decision

#### Scenario: Mixed technical terms do not flip the language
- **WHEN** a non-English crystallize turn embeds English technical terms
- **THEN** the gate still fires with the non-English language as the current language

#### Scenario: unclear dominant language falls back to the default policy
- **WHEN** the dominant language cannot be determined with reasonable confidence
- **THEN** the gate behavior follows the current language-policy fallback

### Requirement: Fast-track selects both language-gate defaults

When the fast-track signal is active, `sai-explore` SHALL not ask gate 9. If an explicit `--overview-lang <language>` value is present, gate 9's result SHALL be that value. If the flag is absent, gate 9's result SHALL be do not create (`None`). Fast-track SHALL never turn an absent flag into a generation request. The crystallization language gate's own fast-track behavior remains governed by the `explore-crystallization-language-gate` capability; this requirement SHALL NOT redefine it. Fast-track SHALL NOT skip, weaken, or auto-complete any stage.

#### Scenario: Fast-track without the flag opts out

- **WHEN** `--fast-track` is active at an explicit crystallize request without `--overview-lang`
- **THEN** gate 9 asks no question
- **AND** the overview decision resolves to `None` without overview generation

#### Scenario: Fast-track with an explicit flag opts in

- **WHEN** `--fast-track` and `--overview-lang spanish` are active at an explicit crystallize request
- **THEN** gate 9 asks no question
- **AND** the overview decision resolves to `spanish`

#### Scenario: fast-track never bypasses stages

- **WHEN** `--fast-track` is active
- **THEN** the staged progression, including mandatory edge-case review, runs exactly as without fast-track

#### Scenario: fast-track selects the defaults without questions
- **WHEN** `--fast-track` is active at an explicit crystallize request
- **THEN** no language question is asked and the staged progression still runs

### Requirement: An explicit --overview-lang option suppresses the gate

When the user invoked `sai-explore` with the explicit `--overview-lang <language>` option, the overview-language gate SHALL NOT be asked; the option's value SHALL be the overview language for the whole exploration session and SHALL feed the same conversation-only state that the selector-dispatched supervised chain forwards. The block's rendering of that state is governed by the `explore-crystallization-block` capability. The suppression SHALL apply even when the crystallize turn's dominant language is not English. The explicit option SHALL NOT suppress, alter, or pre-select the crystallization language gate (gate 8), which keeps its own fast-track and English-skip rules.

#### Scenario: an explicit option skips the gate

- **WHEN** the user invoked `sai-explore` with `--overview-lang spanish` and then explicitly requests crystallization
- **THEN** no overview-language question is asked
- **AND** the same value feeds the conversation-only state that the selector-dispatched supervised run forwards
- **AND** the block renders that state according to `explore-crystallization-block`

#### Scenario: the option never affects gate 8

- **WHEN** `--overview-lang spanish` is active and the crystallize turn's dominant language is not English
- **THEN** the crystallization language gate still fires per its own rules
- **AND** the option neither suppresses it nor pre-selects its choice

### Requirement: Gate persistence tracks the crystallized idea

The overview-language gate SHALL resolve once per crystallized idea or slice set. A materially new idea SHALL cause the gate to ask again before its block prints. Re-crystallizing the same idea SHALL reuse the prior gate answer without asking again. Sliced crystallization SHALL evaluate the gate once for the whole slice set, and the selected language or `None` SHALL apply to every per-slice block. Explicit `--overview-lang` suppression remains invocation-scoped. All gate state SHALL remain in conversation only and SHALL not be written to a file or configuration.

#### Scenario: re-crystallizing the same idea reuses the value

- **WHEN** the user re-crystallizes the same idea after gate 9 resolved
- **THEN** the previous language or `None` decision is reused
- **AND** gate 9 is not re-asked

#### Scenario: A materially new idea re-asks

- **WHEN** the active idea materially changes before crystallization
- **THEN** the prior gate result is discarded
- **AND** gate 9 evaluates the new idea before its block prints

#### Scenario: sliced crystallization asks once

- **WHEN** a crystallize request emits multiple per-slice blocks
- **THEN** gate 9 is evaluated once for the whole slice set
- **AND** the same language or `None` value appears in every per-slice block

### Requirement: Decline or non-committal answer falls back to the default policy

When the user declines or answers non-committally to gate 9, `sai-explore` SHALL resolve the overview decision to do not create (`None`). It SHALL not apply the `sai/policies/remember.md` ambient-language fallback used by the other language gates. An undeterminable dominant language is not a decline: it SHALL use the two-option selector required by `Input language determination`.

#### Scenario: Decline opts out

- **WHEN** the user's gate-9 answer declines overview generation
- **THEN** the decision resolves to `None`
- **AND** the handoff remains otherwise complete and does not generate an overview

#### Scenario: Non-committal answer opts out

- **WHEN** the user's gate-9 answer is non-committal
- **THEN** the decision resolves to `None`
- **AND** no ambient-language default is substituted

#### Scenario: non-committal answer uses the default policy
- **WHEN** the user answers the overview-language question non-committally
- **THEN** the current language-policy fallback is applied

### Requirement: The value rides in the block and forwards only in selector-dispatched Auto

The resolved overview decision SHALL be held in conversation-only state without persistence. Rendering that decision in every `Ready to Propose` block is owned by and specified in the `explore-crystallization-block` capability. `sai-1-spec` SHALL NOT parse or forward the reminder. Selector-dispatched `Auto` SHALL forward a selected language through the existing chained design envelope (`arguments_value: "{name} --fast-track --overview-lang {overview_language}"`); when the decision is `None`, Auto SHALL omit `--overview-lang`. `Manual` SHALL forward nothing. The value SHALL be cleared when the active supervised invocation ends and SHALL never be written to any file, artifact, or configuration.

#### Scenario: Selected language reaches Auto design

- **WHEN** gate 9 selected `spanish` or an explicit flag supplied it and Auto chains design
- **THEN** the chained design envelope includes `--overview-lang spanish` alongside its existing flags
- **AND** the block renders the decision according to `explore-crystallization-block`
- **AND** the design phase is opted in for overview generation

#### Scenario: Do-not-create reaches Auto design

- **WHEN** gate 9 resolved do not create and Auto chains design
- **THEN** the chained design envelope contains no `--overview-lang` token or value
- **AND** the block renders `**Overview language**: None` according to `explore-crystallization-block`

#### Scenario: sai-1-spec never parses the value

- **WHEN** the block is handed to `/sai-1-spec`
- **THEN** the spec phase neither parses nor forwards the reminder or any `--overview-lang` flag

#### Scenario: the block carries the durable reminder
- **WHEN** a `Ready to Propose` block is emitted after the gate resolved
- **THEN** the block carries the `**Overview language**` line with the chosen value as English scaffolding

#### Scenario: Auto chains design
- **WHEN** Auto chains the supervised spec phase into design
- **THEN** the chosen overview language is forwarded to the design worker through the existing chained design envelope and is cleared at the run's terminal outcome

