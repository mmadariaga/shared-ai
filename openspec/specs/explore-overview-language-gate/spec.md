# explore-overview-language-gate Specification

## Purpose

TBD

## Requirements

### Requirement: Scope limited to sai-explore crystallization

The overview-language gate applies only within `sai-explore`, firing only on an explicit crystallize request — the same trigger list as the crystallization language gate: the user asks to crystallize, asks for the paste-ready block, or asks to create a proposal / run `/sai-1-spec`. It SHALL be evaluated after the crystallization language gate (item 8) and before any `Ready to Propose` block prints. Free-form exploration and idea-debate turns SHALL NOT trigger it, and no other `sai-*` command is affected.

#### Scenario: explicit crystallize request evaluates the gate

- **WHEN** the user explicitly requests crystallization and the turn's dominant language is not English
- **THEN** the overview-language gate fires after gate 8 and before any `Ready to Propose` block prints

#### Scenario: exploration does not trigger the gate

- **WHEN** a turn continues free-form exploration of the idea
- **THEN** no overview-language question is asked

### Requirement: English input skips the gate

When the crystallize turn's dominant natural language is English, `sai-explore` SHALL NOT ask the overview-language question; the overview language is English, the ambient language.

#### Scenario: English user gets no question

- **WHEN** the user crystallizes in English
- **THEN** no overview-language question is asked and the overview language defaults to English

### Requirement: Non-English input gates on a language choice with the ambient language recommended

When the crystallize turn's dominant natural language is not English, `sai-explore` SHALL ask exactly one question with exactly two options: the user's current language (its endonym written in that language, emitted first and carrying the `Recommended` marker) and the literal word `English` (emitted second, carrying no marker). The entire question prompt and the non-English option label SHALL be translated into the user's current language; only the literal word `English` is preserved verbatim. `sai-explore` SHALL NOT emit any `Ready to Propose` block until the user answers.

#### Scenario: ambient option is first and recommended

- **WHEN** a non-English user is asked the overview-language question
- **THEN** the two options are the user's language endonym first with the `Recommended` marker and the literal word `English` second without a marker

#### Scenario: English literal is preserved

- **WHEN** the gate question is rendered
- **THEN** the English-option label keeps the literal word `English` verbatim and the rest of the prompt is in the user's language

### Requirement: Input language determination

`Sai-explore` SHALL treat the dominant natural language of the crystallize turn as the current language; incidental code-switching, transliteration, or embedded technical terms SHALL NOT flip the determination. When the dominant language cannot be determined with reasonable confidence, `sai-explore` SHALL NOT ask the gate question and SHALL fall back to `sai/policies/remember.md`.

#### Scenario: mixed technical terms do not flip the language

- **WHEN** a non-English crystallize turn embeds English technical terms
- **THEN** the gate still fires with the non-English language as the current language

#### Scenario: unclear dominant language falls back to the default policy

- **WHEN** the dominant language of the turn cannot be determined with reasonable confidence
- **THEN** no gate question is asked and `sai/policies/remember.md` governs

### Requirement: Fast-track selects both language-gate defaults

When the fast-track signal is active, `sai-explore` SHALL ask neither the crystallization language gate nor the overview-language gate: the defaults for both are selected without a question — the block's prose in English (gate 8's default) and the overview in the ambient language (gate 9's default). The fast-track signal SHALL bypass only these two language gates and SHALL NOT skip, weaken, or auto-complete any stage.

#### Scenario: fast-track selects the defaults without questions

- **WHEN** `--fast-track` is active at an explicit crystallize request
- **THEN** no language question is asked, the block prose is produced in English, and the overview language is the ambient language

#### Scenario: fast-track never bypasses stages

- **WHEN** `--fast-track` is active
- **THEN** the staged progression — including the mandatory edge-case review — runs exactly as without fast-track

### Requirement: An explicit --overview-lang option suppresses the gate

When the user invoked `sai-explore` with the explicit `--overview-lang <language>` option, the overview-language gate SHALL NOT be asked; the option's value SHALL be the overview language for the whole exploration session, SHALL feed the same conversation-only `overview_language` state that the selector-dispatched supervised chain forwards, and SHALL be carried in every emitted block's `**Overview language**` line. The suppression SHALL apply even when the crystallize turn's dominant language is not English. The explicit option SHALL NOT suppress, alter, or pre-select the crystallization language gate (gate 8), which keeps its own fast-track and English-skip rules.

#### Scenario: an explicit option skips the gate

- **WHEN** the user invoked `sai-explore` with `--overview-lang <language>` and then explicitly requests crystallization
- **THEN** no overview-language question is asked
- **AND** every emitted block carries the option's value in its `**Overview language**` line
- **AND** the same value feeds the conversation-only state that the selector-dispatched supervised run forwards

#### Scenario: the option never affects gate 8

- **WHEN** `--overview-lang <language>` is active and the crystallize turn's dominant language is not English
- **THEN** the crystallization language gate still fires per its own rules
- **AND** the option neither suppresses it nor pre-selects its choice

### Requirement: Gate persistence tracks the crystallized idea

The overview-language gate SHALL fire once per crystallized idea (or slice set). The agent SHALL track the current crystallized idea or slice set in-conversation. When a materially new idea is crystallized, the agent SHALL re-ask the gate before printing its block(s). When the user re-crystallizes the same idea, the agent SHALL reuse the previously chosen overview language and SHALL NOT re-ask. Sliced crystallization SHALL fire the gate once for the whole slice set, and the chosen value SHALL apply to every per-slice block. Persistence is behavioral; the choice and the tracked target SHALL NOT be written to a file or config.

#### Scenario: re-crystallizing the same idea reuses the value

- **WHEN** the user re-crystallizes the same idea after the gate already resolved
- **THEN** the previously chosen overview language is reused and the gate is not re-asked

#### Scenario: sliced crystallization asks once

- **WHEN** a crystallize request emits multiple per-slice blocks
- **THEN** the overview-language gate fires once and the chosen value applies to every per-slice block's reminder

### Requirement: Decline or non-committal answer falls back to the default policy

When the user declines or answers non-committally, `sai-explore` SHALL fall back to `sai/policies/remember.md` for the overview language: the user's input language.

#### Scenario: non-committal answer uses the default policy

- **WHEN** the user answers the gate non-committally
- **THEN** the overview language falls back to the user's input language per `sai/policies/remember.md`

### Requirement: The value rides in the block and forwards only in selector-dispatched Auto

The chosen overview language SHALL be carried in every emitted `Ready to Propose` block as a durable reminder — a `**Overview language**: <value>` line with the English scaffold label and the chosen language value — and SHALL be held in conversation-only state. `sai-1-spec` SHALL NOT parse or forward `--overview-lang` or the block's reminder. Selector-dispatched `Auto` SHALL forward the value through the existing chained design envelope (`arguments_value: "{name} --fast-track --overview-lang {overview_language}"`); `Manual` SHALL forward nothing. The value SHALL be cleared when the active supervised invocation ends and SHALL never be written to any file, artifact, or configuration.

#### Scenario: the block carries the durable reminder

- **WHEN** a `Ready to Propose` block is emitted after the gate resolved
- **THEN** the block carries the `**Overview language**` line with the chosen value as English scaffolding

#### Scenario: sai-1-spec never parses the value

- **WHEN** the block is handed to `/sai-1-spec`
- **THEN** the spec phase neither parses nor forwards the reminder or any `--overview-lang` flag

#### Scenario: Auto chains design

- **WHEN** Auto chains the supervised spec phase into design
- **THEN** the chosen overview language is forwarded to the design worker through the existing chained design envelope and is cleared at the run's terminal outcome
