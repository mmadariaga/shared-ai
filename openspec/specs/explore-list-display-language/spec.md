# explore-list-display-language Specification

## Purpose
TBD - created by archiving change explore-open-sections-chat-language. Update Purpose after archive.

## Requirements

### Requirement: Explore displays list items in the conversation language

`/sai-explore` SHALL display every item of an `E`/`I` list in the conversation language, which is the `explore.chatPublicLanguage` setting when it holds a value and otherwise the language the user writes in. An item whose starting text is in another language SHALL be translated for the display, on the first presentation and on every revision, which SHALL be displayed again in full. Identifiers, item order, paths, code, and technical literals MUST stay verbatim and untranslated. Confirming the displayed list SHALL agree the displayed version, and the language of the `Ready to Propose` block SHALL stay decided by the crystallization language gate.

#### Scenario: Issue list in another language is translated for display
- **WHEN** an `E` or `I` list whose starting text comes from an issue written in another language is displayed for discussion
- **THEN** every item is displayed in the conversation language, with its `E`/`I` identifier, order, paths, code, and technical literals unchanged

#### Scenario: Item already in the conversation language
- **WHEN** a list item's starting text is already in the conversation language
- **THEN** the item is displayed as written, with no translation or rewording

#### Scenario: Revision is displayed again in full
- **WHEN** an open list is revised after its first presentation
- **THEN** the complete revised list is displayed again in the conversation language

#### Scenario: Mixed-language source
- **WHEN** the starting text of a list mixes languages across its items
- **THEN** every item is displayed in the conversation language

#### Scenario: Domain term with no faithful translation
- **WHEN** an item contains a domain term with no faithful translation into the conversation language
- **THEN** the term keeps its original form and is explained once, briefly, in the conversation language at its first appearance

#### Scenario: Non-issue source text
- **WHEN** a list's starting text comes from pasted text or a file in another language
- **THEN** the same display rule translates its items for the display

#### Scenario: Confirmation does not decide the block language
- **WHEN** the user confirms a list displayed in translation
- **THEN** the displayed version is agreed and the crystallization language gate, with its current levels, decides the language of the `Ready to Propose` block

### Requirement: Issue intake displays an open What and Why in the conversation language

When a seeded issue resumes at an open section, `/sai-explore` SHALL display an open `What`/`Why` in the conversation language through the same display rule that governs the `E`/`I` lists, and the issue-intake instruction SHALL point to that rule in `sai/commands/explore/list-writing.md` § Display language instead of restating it.

#### Scenario: Open What and Why from an issue in another language
- **WHEN** issue intake presents the stage of an open `What`/`Why` whose starting content comes from an issue written in another language
- **THEN** the `What`/`Why` is displayed in the conversation language under the `list-writing.md` § Display language rule
