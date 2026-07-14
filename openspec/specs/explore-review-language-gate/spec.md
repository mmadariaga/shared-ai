## ADDED Requirements

### Requirement: Scope limited to sai-explore artifact reviews

The language gate SHALL apply only within `sai-explore`. No other `sai-*` command's behavior SHALL change. The gate SHALL fire only when an explore turn is a request to **review an existing OpenSpec artifact** — one of `proposal.md`, `design.md`, `tasks.md`, `specs/**/*.md`, `implementation.md`, `review.md`, `security.md`, `performance.md`, or `accessibility.md` under `openspec/changes/{name}/`, or an artifact under `openspec/specs/`, `openspec/changes/archive/`, or an equivalent existing-artifact location. The artifact MAY be identified however the user naturally refers to it — a literal path, a bare filename, or a change-name plus artifact mention (e.g. "review the oauth2-auth proposal", "qué te parecen los specs"); the specific detection heuristic is left to the implementation and is NOT fixed by this spec. Free-form debate of the original idea, exploratory discussion, and any turn that does not request a review of an existing artifact SHALL NOT trigger the gate.

#### Scenario: review of an existing artifact triggers the gate path

- **WHEN** a `sai-explore` turn asks the agent to review an existing artifact, identified by path, filename, or change-name-plus-artifact reference (e.g. "review the proposal", "mira el design")
- **THEN** the agent treats the turn as an artifact review and evaluates the language gate before producing review content

#### Scenario: free-form debate does not trigger the gate

- **WHEN** a `sai-explore` turn discusses or debates the original idea without referencing an existing OpenSpec artifact
- **THEN** the agent does not ask the language question and continues under the existing `remember.md` language policy

#### Scenario: other sai commands are unaffected

- **WHEN** any `sai-*` command other than `sai-explore` runs
- **THEN** its behavior is unchanged and no language gate question is asked

### Requirement: English input skips the gate

When the user's input language for the review turn is English, the agent SHALL NOT ask the language question and SHALL proceed directly to the review in English.

#### Scenario: English reviewer gets no question

- **WHEN** the user requests an artifact review while writing in English
- **THEN** the agent produces the review directly in English without asking which language to use

### Requirement: Non-English input gates the review on a language choice

When the review turn's input language is not English, the agent SHALL ask a single question offering exactly two options — `English` and the user's current language — and SHALL NOT emit any review content until the user answers.

#### Scenario: non-English reviewer is asked before any review content

- **WHEN** the user requests an artifact review while writing in a language other than English
- **THEN** the agent asks one 2-option question (`English` or the current language) and produces no review content in that turn until the user responds

#### Scenario: chosen language governs the review

- **WHEN** the user answers the gate question by selecting one of the two offered languages
- **THEN** the agent produces the review in the selected language

### Requirement: Input language determination

The agent SHALL treat the **dominant natural language** of the review turn as the user's current language when deciding whether to fire the gate. Incidental code-switching, transliteration, or embedded technical terms SHALL NOT by themselves change the determined language. When the dominant language cannot be determined with reasonable confidence, the agent SHALL NOT ask the gate question and SHALL fall back to the `sai/instructions/remember.md` policy (chat output in the user's input language).

#### Scenario: mixed-in technical terms do not flip the language

- **WHEN** the review request is dominantly non-English but contains embedded English technical terms or a trailing English word (e.g. "revisa el design, please")
- **THEN** the agent treats the turn as non-English and fires the gate

#### Scenario: unclear dominant language falls back to default policy

- **WHEN** the dominant natural language of the review request cannot be determined with reasonable confidence
- **THEN** the agent does not ask the gate question and proceeds under the `remember.md` policy

### Requirement: Gate question presentation

The gate SHALL present exactly two options. The question text and the non-English option label SHALL be rendered in the user's current language. The option representing English SHALL keep the literal word `English` to avoid ambiguity.

#### Scenario: labels are translated except English

- **WHEN** the gate question is shown to a user writing in a non-English language
- **THEN** the question prompt and the current-language option are expressed in that language
- **AND** the English option is labelled with the literal word `English`

### Requirement: Gate re-fires when the review target changes

The gate SHALL fire at the start of each review of a given artifact or set of artifacts. The agent SHALL track the artifact(s) referenced in the most recent review turn (by filename or path). WHEN the user starts a new review that references a different artifact or set of artifacts than the one(s) most recently reviewed, the agent SHALL re-ask the gate question before producing review content for the new target. WHEN the user asks follow-up questions about the same artifact(s) most recently reviewed, the agent SHALL reuse the previously chosen language and SHALL NOT re-ask. Persistence is behavioral (the agent holds the choice and the current review target in-conversation); it SHALL NOT be implemented as stored or config state.

#### Scenario: same review across multiple turns

- **WHEN** the user has chosen a review language for `proposal.md` and later asks a follow-up question about the same `proposal.md`
- **THEN** the agent reuses the previously chosen language and does not re-ask the gate question

#### Scenario: new review target re-asks the gate

- **WHEN** the user has chosen a review language for `proposal.md` and later starts a review of `design.md` (or any artifact other than the one(s) most recently reviewed)
- **THEN** the agent re-asks the gate question before producing review content for the new target

### Requirement: Decline or non-committal answer falls back to remember.md

If the user declines to answer or responds non-committally (e.g. "whatever"), the agent SHALL fall back to the existing `sai/instructions/remember.md` language policy — chat output in the user's input language.

#### Scenario: non-committal answer uses the default policy

- **WHEN** the user declines the gate question or answers non-committally
- **THEN** the agent proceeds under the `remember.md` policy and produces the review in the user's input language

### Requirement: Gate changes chat output only

The review language gate SHALL affect review chat output only. It SHALL NOT change any OpenSpec artifact's file format or content. It SHALL NOT alter the `Ready to Propose` block — neither its content nor its language: the block's prose language is governed **solely** by the crystallization language gate, not by this review gate.

#### Scenario: artifacts stay unchanged

- **WHEN** the review gate resolves to any language
- **THEN** no artifact file's format or content is altered by the review gate

#### Scenario: review gate does not govern the Ready to Propose block

- **WHEN** the review gate resolves to any language and the session later emits a `Ready to Propose` block
- **THEN** the review gate does not alter that block
- **AND** the block's prose language is determined solely by the crystallization language gate
