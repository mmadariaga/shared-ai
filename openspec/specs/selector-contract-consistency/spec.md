# selector-contract-consistency Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

### Requirement: Active selector references use the canonical build title

Active crystallization-close selector references in the selector contract, language-gate contract, question-context exemption, and preservation tests MUST use `Build - Unattended` instead of `Direct build - Unattended`.

#### Scenario: Active references and assertions agree

- **WHEN** the active selector contract and its preservation assertions are evaluated
- **THEN** each changed reference and assertion names the canonical `Build - Unattended` title.
