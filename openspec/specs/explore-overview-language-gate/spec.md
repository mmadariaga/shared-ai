# explore-overview-language-gate Specification

## Purpose

TBD
## Requirements
### Requirement: Scope limited to sai-explore supervised Auto activation
The overview-language gate applies only within `sai-explore`, firing once per crystallized idea or slice set immediately after deterministic selection confirms a dispatchable change in a supervised Auto run and before the first spec-worker dispatch. It SHALL NOT fire at crystallization emission, mid-run at the spec-to-design transition, on free-form exploration turns, on Manual selection, on the Auto (fast implementation) branch, or when the selection outcome is non-dispatchable (empty set, no uncompleted entry, `Cancel`, or an already-active run rejected by active supervision); those outcomes end before the gate. No other `sai-*` command is affected.

#### Scenario: Auto activation evaluates the gate
- **WHEN** deterministic selection confirms a dispatchable change in a supervised Auto run without explicit `--overview-lang`, active fast-track, or a stored value
- **THEN** gate 9 asks exactly once before any spec-worker dispatch
- **AND** no question ran when the block was emitted at crystallization

#### Scenario: exploration and non-Auto selections never fire the gate
- **WHEN** a turn continues free-form exploration or the user selects Manual or Auto (fast implementation)
- **THEN** no overview-language question is asked and no overview opt-in decision is created

#### Scenario: non-dispatchable outcomes end before the gate
- **WHEN** deterministic selection finds an empty set, no uncompleted entry, a Cancel pick, or an already-active run to reject
- **THEN** gate 9 does not fire

### Requirement: English input skips the gate

When the overview-language ask fires at a supervised Auto activation and the chat's ambient language is English or cannot be determined with reasonable confidence, `sai-explore` SHALL ask exactly two options in order: do not create, then the literal word `English`. No option SHALL carry a `Recommended` marker. The question and the do-not-create option's surrounding prose SHALL use the current conversation language, while the literal `English` option remains verbatim. Selecting do not create SHALL resolve the overview language to `None`; selecting `English` SHALL opt in with the value `English`.

#### Scenario: English input receives no recommended option
- **WHEN** the overview-language ask fires at a supervised Auto activation with English as the current language
- **THEN** exactly two options are presented in order: do not create and `English`
- **AND** neither option carries a `Recommended` marker

#### Scenario: English user opts out
- **WHEN** the user selects do not create in the English two-option form
- **THEN** the gate resolves to `None`
- **AND** the run does not opt into overview generation

#### Scenario: English user opts in
- **WHEN** the user selects `English` in the English two-option form
- **THEN** the gate resolves to `English`
- **AND** the chained design phase opts into English overview generation

### Requirement: Non-English input gates on a language choice with the ambient language recommended

When the overview-language ask fires at a supervised Auto activation and the chat's ambient language is not English, `sai-explore` SHALL ask exactly three options in order: do not create, the literal word `English`, then the user's current language written as its endonym. No option SHALL carry a `Recommended` marker. The question and all nonliteral option prose, including the do-not-create option and the endonym label, SHALL be rendered in the user's current language; only the literal word `English` remains verbatim. Selecting do not create SHALL resolve to `None`; selecting either language SHALL resolve to that language.

#### Scenario: Non-English input receives all three choices
- **WHEN** the overview-language ask fires at a supervised Auto activation whose ambient language is not English
- **THEN** exactly three options are presented in the order do not create, `English`, and the current-language endonym
- **AND** no option carries a `Recommended` marker

#### Scenario: Non-English user chooses the ambient language
- **WHEN** the user selects the endonym option
- **THEN** the gate resolves to that language value
- **AND** the same value applies to the entire supervised run's chained design dispatch

#### Scenario: Non-English user chooses English
- **WHEN** the user selects the literal `English` option
- **THEN** the gate resolves to `English`
- **AND** the literal option label remains exactly `English`

### Requirement: Input language determination

`sai-explore` SHALL treat the dominant natural language of the explore conversation at the moment of the Auto activation as the current language; incidental code-switching, transliteration, or embedded technical terms SHALL NOT flip the determination. When the dominant language cannot be determined with reasonable confidence, `sai-explore` SHALL still ask gate 9 using the two-option form: do not create followed by the literal `English`, with no `Recommended` marker. This gate-9 rule intentionally differs from the `sai/policies/remember.md` fallback used by gate 3 and gate 8.

#### Scenario: mixed technical terms do not flip the language
- **WHEN** a conversation whose ambient language is not English embeds English technical terms and gate 9 fires at an Auto activation
- **THEN** the three-option form still uses the non-English language as the current language

#### Scenario: Unclear dominant language uses the two-option form
- **WHEN** the dominant language of the conversation cannot be determined with reasonable confidence at an Auto activation
- **THEN** gate 9 asks the two-option do-not-create/`English` form
- **AND** it does not silently apply `sai/policies/remember.md` or skip the decision

### Requirement: Fast-track selects both language-gate defaults

When the fast-track signal is active, `sai-explore` SHALL not ask either language question: the crystallization language gate keeps its own fast-track behavior, and the overview-language value SHALL resolve to the literal `None` without asking — including at a supervised Auto activation. If an explicit `--overview-lang <language>` value is present, that value SHALL win over the fast-track default. Fast-track SHALL never turn an absent flag into a generation request and SHALL NOT skip, weaken, or auto-complete any stage.

#### Scenario: Fast-track at Auto activation without the flag opts out
- **WHEN** `--fast-track` is active at a supervised Auto activation without `--overview-lang`
- **THEN** gate 9 asks no question
- **AND** the overview-language value resolves to `None` without overview generation

#### Scenario: Fast-track with an explicit flag opts in
- **WHEN** `--fast-track` and `--overview-lang spanish` are both active
- **THEN** gate 9 asks no question
- **AND** the overview-language value resolves to `spanish`

#### Scenario: fast-track never bypasses stages
- **WHEN** `--fast-track` is active
- **THEN** the staged progression, including mandatory edge-case review, runs exactly as without fast-track

### Requirement: An explicit --overview-lang option suppresses the gate

When the invocation carried an explicit `--overview-lang <language>` option, the overview-language gate SHALL NOT be asked in any mode — including at a supervised Auto activation; the option's value SHALL be the overview-language value for the whole exploration session and SHALL feed the same conversation-only state that the selector-dispatched supervised chain forwards. Under the Auto (fast implementation) branch the explicit option is a documented no-op, because auto-fast generates no change-overview. The explicit option SHALL NOT suppress, alter, or pre-select the crystallization language gate (gate 8), which keeps its own fast-track and English-skip rules.

#### Scenario: an explicit option skips the gate everywhere
- **WHEN** the invocation carried `--overview-lang spanish` and a supervised Auto activation confirms a dispatchable change
- **THEN** no overview-language question is asked
- **AND** the stored value feeds the conversation-only state the supervised chain forwards

#### Scenario: explicit option under auto-fast is a documented no-op
- **WHEN** the invocation carried `--overview-lang spanish` and the user selects Auto (fast implementation)
- **THEN** gate 9 never asks and no change-overview generation occurs

#### Scenario: the option never affects gate 8
- **WHEN** `--overview-lang spanish` is active and the crystallize turn's dominant language is not English
- **THEN** the crystallization language gate still fires per its own rules
- **AND** the option neither suppresses it nor pre-selects its choice

### Requirement: Gate persistence tracks the crystallized idea

The resolved overview-language value SHALL persist chat-scoped per crystallized idea or slice set and SHALL survive the end of a supervised attempt — including a failed or cancelled one — so that a design-phase retry and a later Auto activation over the same set reuse it without asking again. A materially new idea SHALL reset the stored value, and its first eligible Auto activation SHALL ask again. Sliced crystallization SHALL resolve the gate once for the whole slice set. Explicit `--overview-lang` suppression remains invocation-scoped. All gate state SHALL remain in conversation only and SHALL NOT be written to a file, artifact, or configuration.

#### Scenario: re-crystallizing the same idea reuses the value
- **WHEN** the user re-crystallizes the same idea after gate 9 resolved
- **THEN** the previous language or `None` decision is reused
- **AND** gate 9 is not re-asked

#### Scenario: resolution survives a failed attempt
- **WHEN** a supervised attempt fails after gate 9 resolved, and a later Auto activation selects the same crystallized idea
- **THEN** the stored value is reused without asking again
- **AND** its envelope form is reused for any chained design dispatch

#### Scenario: A materially new idea resets the value
- **WHEN** the active idea materially changes and is later crystallized and dispatched
- **THEN** the prior stored value is discarded
- **AND** gate 9 asks again at that idea's first eligible Auto activation

#### Scenario: sliced crystallization resolves once
- **WHEN** an Auto activation covers a slice set crystallized from one idea
- **THEN** gate 9 resolved once for the whole slice set
- **AND** the same language or `None` value applies to every slice's dispatch

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

The resolved overview-language value is held in conversation-only state without file persistence. Rendering that decision in emitted blocks is owned by and specified in the `explore-crystallization-block` capability. `sai-1-spec` SHALL NOT parse or forward the reminder. Selector-dispatched `Auto` SHALL forward a non-`None` value through the existing chained design envelope (`arguments_value: "{name} --fast-track --supervised --overview-lang {overview_language}"`); when the value is `None`, Auto SHALL omit `--overview-lang`. `Manual` SHALL forward nothing. The stored value is NOT cleared at a run's terminal outcome while the same crystallized idea remains active in the chat: a design-phase retry reuses it and its envelope form without asking again, and it SHALL never be injected into a design invocation outside this explore chat's supervised chain.

#### Scenario: Selected language reaches Auto design
- **WHEN** gate 9 selected `spanish` or an explicit flag supplied it and Auto chains design
- **THEN** the chained design envelope includes `--overview-lang spanish` alongside `--fast-track` and `--supervised`
- **AND** the design phase is opted in for overview generation

#### Scenario: Do-not-create reaches Auto design
- **WHEN** gate 9 resolved do not create and Auto chains design
- **THEN** the chained design envelope contains no `--overview-lang` token or value

#### Scenario: sai-1-spec never parses the value
- **WHEN** the block is handed to `/sai-1-spec`
- **THEN** the spec phase neither parses nor forwards the reminder or any `--overview-lang` flag

#### Scenario: design-phase retry reuses the stored value
- **WHEN** a design-phase retry runs after a failed attempt in the same chat over the same crystallized idea
- **THEN** the retry uses the same one-string envelope including the stored language form without asking gate 9 again

