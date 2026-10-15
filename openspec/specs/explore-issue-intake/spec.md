# explore-issue-intake Specification

## Purpose
Give `/sai-explore` one defined, source-agnostic intake for any issue, bug, or ticket that enters the conversation, so an incoming issue becomes a candidate idea through a single work question instead of improvised turns.

## Requirements

### Requirement: Issue intake starts only on issue text or an explicit statement

`/sai-explore` SHALL start the issue intake when text in issue format (a description carrying the headings `## Problem`, `## Goal`, `## Scope`, `## Non-goals`, `## Open questions`, and `## Maturity`) enters the conversation, or when the user explicitly states that the text is an issue, and SHALL apply the intake before the direct-looking request rule to that text. The intake SHALL behave the same for every source (imported, pasted, read from a file, or passed as the `/sai-explore` argument) and SHALL name no skill. A link SHALL be ordinary content that triggers nothing, any other text SHALL enter through the direct-looking request rule, and hidden markers or HTML comments in the issue SHALL NOT carry block content. Claude Code and opencode SHALL follow the same intake.

#### Scenario: Issue passed as the command argument

- **WHEN** an issue-format text arrives as the `/sai-explore` argument
- **THEN** Explore follows the same intake as for an issue pasted into the conversation

#### Scenario: A link alone triggers nothing

- **WHEN** the user's message carries only a link to an issue and no issue text
- **THEN** no intake starts and the message is classified as ordinary input

#### Scenario: Explicit statement starts intake

- **WHEN** the user states that a text without the issue-format headings is an issue
- **THEN** Explore starts the issue intake for that text

### Requirement: The work question decides whether the issue becomes the candidate idea

Once the issue's complete content is in the conversation, Explore SHALL ask the work question through the harness-native picker (`AskUserQuestion` on Claude Code, `question` on opencode) with the options `work` and `context` in that order, and the question SHALL close that turn. When several unrelated issues arrive in one message, the question SHALL list one `work` option per issue plus `context`, falling back to numbered plain text beyond the picker capacity, and the user SHALL pick at most one issue to work on while the rest stay as context. A message that states the intent to work on the issue while bringing it SHALL answer the question with `work` without asking. When the issue's `Maturity` section reads `Ready to propose`, the question SHALL also show a kebab-case `Change name` proposed from the issue's `Goal`, correctable through the free-text answer. `--fast-track` SHALL NOT skip the work question.

#### Scenario: Work question closes the turn

- **WHEN** an issue-format text enters the conversation without a stated intent to work on it
- **THEN** Explore asks the work question with the options `work` and `context` through the native picker and ends the turn

#### Scenario: Stated intent answers work

- **WHEN** the user brings an issue with a message such as "let's tackle this issue"
- **THEN** Explore treats the work question as answered `work` and asks nothing

#### Scenario: Several unrelated issues

- **WHEN** one message carries several unrelated issues
- **THEN** the work question offers one `work` option per issue plus `context`, and at most one issue becomes the candidate idea

#### Scenario: Fast-track still asks

- **WHEN** `/sai-explore` runs with `--fast-track` and an issue enters the conversation
- **THEN** the work question is still asked of the user

### Requirement: A worked issue becomes the candidate idea with carried starting lists

On `work`, in the same turn and with no separate activation turn, the issue SHALL become the candidate idea with its stated content as starting content, and `Explore change` SHALL begin as for any candidate idea; the issue SHALL NOT be treated as an order to implement. The issue's `E#` and `I#` lists SHALL be the starting lists of `Review edge cases` and `Implementation details`, numbered `E1..En` and `I1..In`, and at each stage Explore MAY add only items that come from that stage's checks, with agreement and advancement unchanged. When the issue has related issues, Explore MAY explore them for context while the work stays limited to the issue mentioned first. On `context`, no candidate idea SHALL exist and the issue SHALL only inform the conversation.

#### Scenario: Carried edge cases start the edge-case stage

- **WHEN** an issue with an `E#` list was answered `work` and the user advances into `Review edge cases`
- **THEN** Explore presents the carried list as the starting list and adds only items from the stage's own checks

#### Scenario: Carried implementation details start their stage

- **WHEN** an issue with an `I#` list was answered `work` and the user advances into `Implementation details`
- **THEN** Explore presents the carried list as the starting list and adds only items from the stage's own checks

#### Scenario: Context creates no candidate idea

- **WHEN** the user answers the work question with `context`
- **THEN** no candidate idea is created and the next input is classified as usual
