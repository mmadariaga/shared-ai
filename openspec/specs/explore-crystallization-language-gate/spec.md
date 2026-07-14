## ADDED Requirements

### Requirement: Scope limited to sai-explore crystallization

The crystallization language gate SHALL apply only within `sai-explore`. No other `sai-*` command's behavior SHALL change. The gate SHALL fire only when the turn is an **explicit crystallize request** — the user asks to crystallize, asks for the paste-ready block, or asks to create a proposal / run `/sai-1-spec` — and SHALL be evaluated before any `Ready to Propose` block is printed. Free-form exploration, idea debate, and readiness-signal turns that do not print a block SHALL NOT trigger the gate.

#### Scenario: explicit crystallize request evaluates the gate

- **WHEN** a `sai-explore` turn is an explicit crystallize request (e.g. "crystallize", "give me the paste-ready block")
- **THEN** the agent evaluates the crystallization language gate before printing any `Ready to Propose` block

#### Scenario: inline-proposal request also fires the gate

- **WHEN** the user asks to create a proposal or run `/sai-1-spec` inline during `sai-explore` (the inline-proposal-refusal path that still prints the paste-ready block)
- **THEN** the agent evaluates the crystallization language gate before printing the paste-ready block(s)

#### Scenario: exploration does not trigger the gate

- **WHEN** a `sai-explore` turn explores or debates the idea without an explicit crystallize request
- **THEN** the agent does not ask the language question and prints no `Ready to Propose` block

#### Scenario: other sai commands are unaffected

- **WHEN** any `sai-*` command other than `sai-explore` runs
- **THEN** its behavior is unchanged and no crystallization language gate question is asked

### Requirement: English input skips the gate

When the crystallize turn's dominant natural language is English, the agent SHALL NOT ask the language question and SHALL print the `Ready to Propose` block(s) directly in English.

#### Scenario: English user gets no question

- **WHEN** the user issues an explicit crystallize request while writing in English
- **THEN** the agent prints the block(s) in English without asking which language to use

### Requirement: Non-English input gates crystallization on a language choice

When the crystallize turn's dominant input language is not English, the agent SHALL ask a single question offering exactly two options — `English` and the user's current language — and SHALL NOT emit any `Ready to Propose` block until the user answers.

#### Scenario: non-English user is asked before any block

- **WHEN** the user issues an explicit crystallize request while writing in a language other than English
- **THEN** the agent asks one 2-option question and prints no `Ready to Propose` block in that turn until the user responds

#### Scenario: chosen language governs the block prose

- **WHEN** the user answers the gate question by selecting one of the two offered languages
- **THEN** the agent prints the block(s) with their free-text prose in the selected language

### Requirement: Input language determination

The agent SHALL treat the **dominant natural language** of the crystallize turn as the user's current language when deciding whether to fire the gate. Incidental code-switching, transliteration, or embedded technical terms SHALL NOT by themselves change the determined language. When the dominant language cannot be determined with reasonable confidence, the agent SHALL NOT ask the gate question and SHALL fall back to the `sai/instructions/remember.md` policy.

#### Scenario: mixed-in technical terms do not flip the language

- **WHEN** the crystallize request is dominantly non-English but contains embedded English technical terms (e.g. "crystaliza el bloque, please")
- **THEN** the agent treats the turn as non-English and fires the gate

#### Scenario: unclear dominant language falls back to default policy

- **WHEN** the dominant natural language of the crystallize request cannot be determined with reasonable confidence
- **THEN** the agent does not ask the gate question and proceeds under the `remember.md` policy

### Requirement: Gate question presentation

The gate SHALL present exactly two options. The question prompt and the non-English option label SHALL be rendered in the user's current language. The option representing English SHALL be emitted **first**, SHALL keep the literal word `English` verbatim, and SHALL carry a `Recommended` marker appended alongside that literal word (e.g. `English (Recommended)`).

#### Scenario: English option is first, recommended, and verbatim

- **WHEN** the gate question is shown to a user writing in a non-English language
- **THEN** the question prompt and the current-language option are expressed in that language
- **AND** the English option appears first, labelled with the literal word `English` plus the `Recommended` marker

### Requirement: Translation scoping — prose translated, scaffolding English

When a non-English language is chosen, the chosen language SHALL govern only the block's **free-text prose**: the `What`, `Why`, capability descriptions, `Decisions & Rationale`, `Alternatives`, `Trade-offs`, `Model / Re-framings`, `Key constraints`, and any slice headers. The following **scaffolding** SHALL remain in English regardless of the chosen language: the bold field labels, the kebab-case Change name value, the `/sai-1-spec` command, and the "Open a new chat" line. The gate SHALL NOT alter any OpenSpec artifact file's format or content.

#### Scenario: mixed-language block on a non-English choice

- **WHEN** the user selects a non-English language at the gate
- **THEN** the block's free-text prose is rendered in that language
- **AND** the bold field labels, the kebab-case Change name value, the `/sai-1-spec` command, and the "Open a new chat" line remain in English

#### Scenario: no artifact file is altered

- **WHEN** the gate resolves to any language
- **THEN** no OpenSpec artifact file's format or content is changed by the gate

### Requirement: Gate persistence tracks the crystallized idea

The gate SHALL fire once per crystallized idea (or slice set). The agent SHALL track the current crystallized idea/slice set in-conversation. WHEN a materially new idea is crystallized, the agent SHALL re-ask the gate before printing its block(s). WHEN the user re-crystallizes the same idea, the agent SHALL reuse the previously chosen language and SHALL NOT re-ask. Persistence is behavioral; the choice and the tracked target SHALL NOT be written to a file or config.

#### Scenario: re-crystallizing the same idea reuses the language

- **WHEN** the user has chosen a crystallization language for an idea and later re-crystallizes the same idea
- **THEN** the agent reuses the previously chosen language and does not re-ask the gate question

#### Scenario: a materially new idea re-asks the gate

- **WHEN** the user crystallizes an idea materially different from the one most recently crystallized
- **THEN** the agent re-asks the gate question before printing the new block(s)

### Requirement: Decline or non-committal answer falls back to remember.md

If the user declines to answer or responds non-committally, the agent SHALL fall back to the existing `sai/instructions/remember.md` language policy for the block's free-text prose.

#### Scenario: non-committal answer uses the default policy

- **WHEN** the user declines the gate question or answers non-committally
- **THEN** the agent proceeds under the `remember.md` policy for the block's prose

### Requirement: Sliced crystallization fires the gate once for the whole set

When crystallization is sliced into multiple `Ready to Propose` blocks, the gate SHALL fire once for the whole slice set, and the chosen language SHALL apply to the free-text prose of every emitted block. Per-slice scaffolding SHALL remain in English.

#### Scenario: one gate governs every slice block

- **WHEN** the user issues an explicit crystallize request that resolves to a sliced set of `Ready to Propose` blocks in a non-English language
- **THEN** the agent asks the gate question once for the whole set
- **AND** applies the chosen language to the free-text prose of every emitted block while keeping each block's scaffolding in English
