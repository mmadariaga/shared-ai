# backlog-skill-confirmations Specification

## Purpose
TBD - created by archiving change enforce-native-picker-closed-questions. Update Purpose after archive.

## Requirements

### Requirement: to-backlog publication confirmation uses the native picker

The `to-backlog` skill SHALL offer the publication confirmation choices confirm, edit, and cancel through the harness-native picker (`AskUserQuestion` on Claude Code, `question` on opencode), and SHALL wait for an explicit answer. On a mismatch or a missing answer, the standalone re-ask with the section 3 prompt SHALL also be presented through the harness-native picker. This applies both inside Explore and when the skill runs standalone.

#### Scenario: publication confirmation is offered through the picker

- **WHEN** `to-backlog` asks the user to confirm publication of a prepared draft
- **THEN** confirm, edit, and cancel are offered through the harness-native picker

#### Scenario: standalone re-ask uses the picker

- **WHEN** a supplied confirmation answer mismatches or is missing
- **THEN** `to-backlog` re-asks with the section 3 standalone prompt through the harness-native picker

### Requirement: from-backlog unresolved question channel follows question shape

After loading and assessing an item, when the `from-backlog` skill asks the first substantive unresolved question, a question with a closed option set SHALL go through the native picker (`AskUserQuestion` on Claude Code, `question` on opencode), and an open question SHALL use the ordinary conversation.

#### Scenario: closed-option unresolved question uses the picker

- **WHEN** `from-backlog` asks an unresolved question that has a closed option set
- **THEN** the question is presented through the native picker

#### Scenario: open unresolved question uses conversation

- **WHEN** `from-backlog` asks an unresolved question with no option set
- **THEN** the question is asked in the ordinary conversation
