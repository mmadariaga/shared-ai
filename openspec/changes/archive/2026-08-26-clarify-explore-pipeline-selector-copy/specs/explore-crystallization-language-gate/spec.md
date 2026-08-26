## MODIFIED Requirements

### Requirement: Localize selector question and descriptions while retaining English titles

The crystallization language gate SHALL render the selector question and all option descriptions in the user's language. The option titles MUST remain exactly `Plan - Unattended`, `Direct build - Unattended`, and `Manual`. The literals `review-loop`, `/sai-1-spec`, `/sai-1-spec <change-name>`, and `/sai-2-design` SHALL remain verbatim English.

#### Scenario: Localized selector presentation preserves stable literals

- **WHEN** a crystallization close is rendered for a user-selected language
- **THEN** the question and descriptions use that language while the fixed option titles, route identities, and command literals remain unchanged.
