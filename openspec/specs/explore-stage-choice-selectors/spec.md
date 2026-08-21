# explore-stage-choice-selectors Specification

## Purpose

Define optional native selectors that supplement `sai-explore`'s existing maturity, edge-case, and implementation-detail questions without weakening explicit progression, agreement, reset, localization, or overview-language rules.

## Requirements

### Requirement: Native selectors supplement the existing text questions

After the existing maturity question, `sai-explore` MAY present a harness-native maturity selector. After the existing edge-case and implementation-detail questions have run in their established order, `sai-explore` MAY present a later harness-native stage selector. The existing maturity, edge-case, and implementation-detail questions SHALL remain text questions, SHALL be emitted with their existing context and wording rules, and SHALL remain authoritative; a selector SHALL NOT replace, shorten, or convert any of those questions into a native agreement picker. When the active harness cannot provide the optional native selector with its free-text path, the existing text question remains the only interaction and the progression semantics are unchanged.

#### Scenario: maturity selector follows the existing question

- **WHEN** the existing maturity question has been presented for an active idea and the optional native selector is supported
- **THEN** the maturity selector is presented after that text question
- **AND** the existing maturity question remains present and unchanged

#### Scenario: later selector follows both existing list questions

- **WHEN** the existing edge-case and implementation-detail questions have been processed in order and the optional native selector is supported
- **THEN** the later stage selector is presented after those text questions
- **AND** neither text question is replaced by the selector

#### Scenario: native selector is unavailable

- **WHEN** the harness cannot present the optional native selector with a free-text path
- **THEN** `sai-explore` preserves the existing text-question flow without presenting a replacement selector
- **AND** no stage advances merely because the selector is unavailable

### Requirement: The maturity selector offers localized review or iteration choices

The maturity selector SHALL offer, in this order, a choice equivalent to `Revisar edge cases`, a choice equivalent to `Seguir iterando`, and a free-text path. In a Spanish conversation, the labels SHALL be `Revisar edge cases` and `Seguir iterando`; in every other conversation, the labels and selector prose SHALL be translated to the conversation language while retaining the same meanings and order. The selector SHALL be conversation-only and SHALL not itself agree to any edge-case list.

#### Scenario: Spanish maturity selector has the required options

- **WHEN** the conversation language is Spanish and the maturity selector is shown
- **THEN** it offers `Revisar edge cases`, `Seguir iterando`, and free text in that order

#### Scenario: selector language follows the conversation

- **WHEN** the conversation language is not Spanish
- **THEN** the maturity selector's question, labels, and surrounding prose follow that conversation language
- **AND** the option meanings and order remain equivalent to review-edge-cases, keep-iterating, and free text

### Requirement: Reviewing edge cases exits ask mode and waits for explicit advancement

Selecting the maturity choice equivalent to `Revisar edge cases` SHALL exit ask mode and enter the existing edge-case prompt for the current idea. It SHALL not auto-agree to the proposed list, auto-run implementation details, crystallize, or advance beyond the existing edge-case question. After the edge-case prompt has been handled, ask mode SHALL resume only at the next explicit `next-step` request or equivalent natural-language advancement; the selector response and the edge-case discussion alone SHALL NOT resume it or advance the progression. Selecting the maturity choice equivalent to `Seguir iterando`, or submitting free text through the maturity selector, SHALL remain in ask mode and SHALL not advance the progression automatically.

#### Scenario: review choice enters edge-case prompting

- **WHEN** the user selects `Revisar edge cases` from the maturity selector
- **THEN** ask mode ends for that interaction and the existing edge-case prompt is presented
- **AND** the edge-case list remains subject to the existing semantic agreement gate
- **AND** no implementation-detail or crystallization work starts automatically

#### Scenario: edge-case discussion waits for the next explicit advancement

- **WHEN** the edge-case prompt has been handled after the user selected the review choice
- **THEN** the staged flow does not advance or resume ask mode automatically
- **AND** only the next explicit `next-step` or equivalent natural-language advancement resumes the staged ask-mode flow

#### Scenario: maturity iteration and free text do not advance

- **WHEN** the user selects the iteration choice or submits free text through the maturity selector
- **THEN** `sai-explore` remains in ask mode
- **AND** the current stage, edge-case agreement, implementation-detail agreement, and crystallization request remain unchanged

### Requirement: The later selector preserves discussion or performs exact next-step advancement

The later selector SHALL offer, in this order, a choice equivalent to `Ir al siguiente step`, a choice equivalent to `Discutir ideas / dar feedback`, and a free-text path. In a Spanish conversation, the labels SHALL be `Ir al siguiente step` and `Discutir ideas / dar feedback`; in every other conversation, the labels and selector prose SHALL follow the conversation language while retaining the same meanings and order. The `Ir al siguiente step` choice SHALL be exactly equivalent to the existing literal `next-step` token, including its intent recognition, stage transition, empty-list behavior, and crystallization behavior when entering `Crystallize`. The discussion choice and free text SHALL stay in ask mode and SHALL not advance automatically.

#### Scenario: Spanish later selector has the required options

- **WHEN** the conversation language is Spanish and the later selector is shown
- **THEN** it offers `Ir al siguiente step`, `Discutir ideas / dar feedback`, and free text in that order

#### Scenario: next-step choice matches the literal token

- **WHEN** the user selects `Ir al siguiente step`
- **THEN** `sai-explore` performs exactly the same progression transition as a bare literal `next-step`
- **AND** it applies the same explicit-intent, empty-list, edge-case, implementation-detail, and crystallization rules

#### Scenario: discussion and free text remain non-advancing

- **WHEN** the user selects `Discutir ideas / dar feedback` or submits free text through the later selector
- **THEN** `sai-explore` remains in ask mode
- **AND** it does not advance the stage, agree a list, or crystallize without a later explicit advancement

### Requirement: Material idea changes reset selector progression and agreed lists

When the explored idea materially changes into a new stable idea, `sai-explore` SHALL reset the selector and staged-progression state to `Explore change`, discard the previously agreed edge-case and implementation-detail lists, clear any pending selector response or crystallization request, and begin a new active-uncrystallized lifecycle. The reset SHALL re-render the stage state according to the existing stage-panel contract and SHALL not start an edge-case review, show a later selector, or advance the new idea without explicit user intent.

#### Scenario: material change clears prior selector state

- **WHEN** the current idea materially changes into a new stable idea after a selector was shown or a list was agreed
- **THEN** progression resets to `Explore change`
- **AND** prior selector state and both agreed lists are discarded
- **AND** the stage TODO shows only the new idea's progression state

#### Scenario: reset does not auto-run review

- **WHEN** a material idea change resets progression
- **THEN** no edge-case question or later selector is shown solely because of the reset
- **AND** the new idea waits for an explicit `next-step` or equivalent natural-language advancement

### Requirement: Selector localization does not opt into overview generation

The selector question, option labels, and selector-adjacent prose SHALL follow the conversation language. The literal `next-step` token SHALL remain unchanged wherever the existing contract names that token. Selector interaction SHALL not select or infer an overview language. Unless a separately supported explicit overview-language opt-in is supplied outside this selector flow, the overview language carried by a resulting `Ready to Propose` block SHALL be the literal `None`, and the selector SHALL not authorize overview generation.

#### Scenario: selector prose is localized without translating the token

- **WHEN** a selector is presented in a non-English conversation
- **THEN** its question, labels, and surrounding prose use the conversation language
- **AND** any explicit reference to the advancement token remains the literal `next-step`

#### Scenario: selector flow defaults overview language to None

- **WHEN** the selector flow eventually emits a `Ready to Propose` block without a separate explicit overview-language opt-in
- **THEN** the block carries `**Overview language**: None`
- **AND** no overview-generation authorization is inferred from either selector
