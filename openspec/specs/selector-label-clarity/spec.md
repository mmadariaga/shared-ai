# selector-label-clarity Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

### Requirement: Crystallization-close selector presents fixed mode titles

The sai-explore crystallization-close selector MUST present exactly three options in this order: `Plan - Unattended`, `Build - Unattended`, and `Manual`. The option descriptions remain the localized surface; the titles remain fixed English literals.

#### Scenario: Selector presents the available execution modes

- **WHEN** sai-explore presents the selector after a crystallization turn
- **THEN** the selector shows `Plan - Unattended`, `Build - Unattended`, and `Manual` in that order.
