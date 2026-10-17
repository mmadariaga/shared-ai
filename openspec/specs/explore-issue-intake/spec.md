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

Once the issue's complete content is in the conversation, Explore SHALL ask the work question through the harness-native picker (`AskUserQuestion` on Claude Code, `question` on opencode) with the options `work` and `context` in that order, and the question SHALL close that turn. When several unrelated issues arrive in one message, the question SHALL list one `work` option per issue plus `context`, falling back to numbered plain text beyond the picker capacity, and the user SHALL pick at most one issue to work on while the rest stay as context. A message that states the intent to work on the issue while bringing it SHALL answer the question with `work` without asking. The issue SHALL have the Ready to Propose form when its `Maturity` section reads `Ready to propose`, and Explore SHALL read that from the conversion tool's `ready_to_propose_form`, never from its own judgment. For such an issue the question SHALL also show a kebab-case `Change name` proposed from the issue's `Goal`, starting from the tool's `proposed_change_name`, correctable through the free-text answer. `--fast-track` SHALL NOT skip the work question.

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

#### Scenario: The form comes from the conversion tool

- **WHEN** an issue enters the conversation
- **THEN** Explore runs the conversion tool and takes the Ready to Propose form and the proposed `Change name` from its `ready_to_propose_form` and `proposed_change_name`

### Requirement: A worked issue becomes the candidate idea with carried starting lists

On `work`, in the same turn and with no separate activation turn, the issue SHALL become the candidate idea with its stated content as starting content, and `Explore change` SHALL begin as for any candidate idea; the issue SHALL NOT be treated as an order to implement. The issue's `E#` and `I#` lists SHALL be the starting lists of `Review edge cases` and `Implementation details`, numbered `E1..En` and `I1..In`, and at each stage Explore MAY add only items that come from that stage's checks, with agreement and advancement unchanged. When the issue has related issues, Explore MAY explore them for context while the work stays limited to the issue mentioned first. When the issue has the Ready to Propose form, the drift check SHALL follow. On `context`, no candidate idea SHALL exist and the issue SHALL only inform the conversation; when the user later chooses that issue for work, Explore SHALL resume at the drift check if the issue has the Ready to Propose form, or at `Explore change` otherwise, and SHALL NOT ask the work question again.

#### Scenario: Carried edge cases start the edge-case stage

- **WHEN** an issue with an `E#` list was answered `work` and the user advances into `Review edge cases`
- **THEN** Explore presents the carried list as the starting list and adds only items from the stage's own checks

#### Scenario: Carried implementation details start their stage

- **WHEN** an issue with an `I#` list was answered `work` and the user advances into `Implementation details`
- **THEN** Explore presents the carried list as the starting list and adds only items from the stage's own checks

#### Scenario: Context creates no candidate idea

- **WHEN** the user answers the work question with `context`
- **THEN** no candidate idea is created and the next input is classified as usual

#### Scenario: A context issue later chosen for work resumes the intake

- **WHEN** an issue kept as `context` is later chosen for work
- **THEN** Explore resumes at the drift check when the issue has the Ready to Propose form, or at `Explore change` otherwise, without asking the work question again

### Requirement: The drift check gates the shortcut for a Ready to Propose issue

Explore SHALL ask the drift check only for an issue with the Ready to Propose form, once `work` is answered, through the harness-native picker with the options `validate` and `declared-clean` in that order. No earlier assessment of the issue SHALL replace it. `validate` SHALL compare the issue's agreed behaviors, constraints, and implementation notes with the current code read-only and report each mismatch with its path. The outcome SHALL be exactly one of `clean` (validation found no mismatch), `drift` (validation found a mismatch, or the user states that the issue has drifted, which answers the question without asking), or `declared-clean` (the user skipped validation). On `drift`, no shortcut SHALL be offered and the mismatches SHALL become starting content for `Explore change`. `declared-clean` SHALL keep the shortcut available. `--fast-track` SHALL NOT skip the drift check.

#### Scenario: Drift removes the shortcut

- **WHEN** `validate` reports a mismatch between the issue and the current code
- **THEN** no shortcut question is asked and the mismatches become starting content for `Explore change`

#### Scenario: Declared-clean keeps the shortcut

- **WHEN** the user answers the drift check with `declared-clean`
- **THEN** the shortcut question remains available when the conversion succeeds

#### Scenario: Issue without the form gets no drift check

- **WHEN** an issue whose `Maturity` does not read `Ready to propose` is answered `work`
- **THEN** no drift check is asked and the issue continues in `Explore change`

### Requirement: The conversion tool owns the issue-to-block mapping in the intake

Explore SHALL NOT write the block from the issue itself. It SHALL run `ready-to-propose.js convert` with the issue text exactly as it entered the conversation on stdin, without options when the issue arrives and again after the drift check with the confirmed `--change-name`, adding `--declared-clean` for the `declared-clean` outcome. A `converted: false` result with `rejections` SHALL be a conversion rejection: Explore SHALL show each reason in one line in the ambient conversation language, SHALL NOT ask the shortcut question, and SHALL continue with the planned Explore steps.

#### Scenario: Conversion rejection continues with the planned steps

- **WHEN** the conversion tool rejects the block derived from a Ready to Propose issue
- **THEN** Explore shows each rejection reason in one line and continues with the planned Explore steps without asking the shortcut question

#### Scenario: Open questions reject the conversion

- **WHEN** an issue with the Ready to Propose form still has entries in `Open questions`
- **THEN** the conversion is rejected

### Requirement: The shortcut question offers the shortcut or the planned steps

After a `clean` or `declared-clean` outcome with a successful conversion, Explore SHALL ask the shortcut question through the harness-native picker with the options `shortcut` and `planned-steps` in that order. When the issue carries no implementation notes (the conversion's `implementation_details` is empty), the question's context SHALL show `- None` as the implementation-details list; accepting `shortcut` SHALL count as the user's confirmation of that `- None` and SHALL send the empty list as `[]` with the `issue-shortcut` intent, and declining it SHALL take the normal path through `Implementation details`. `planned-steps` SHALL continue as on `work`, with the issue's lists preloaded; after `declared-clean`, the block composed at `Crystallize` SHALL carry the same `Request Additional Notes` line produced by a `convert --declared-clean` run. `--fast-track` SHALL NOT skip the shortcut question.

#### Scenario: Planned steps keep the preloaded lists

- **WHEN** the user answers the shortcut question with `planned-steps`
- **THEN** Explore follows the planned Explore steps with the issue's `E` and `I` lists as starting lists

#### Scenario: Declared-clean is recorded on the block

- **WHEN** the drift check outcome was `declared-clean`
- **THEN** the block carries a `Request Additional Notes` line stating that the user declared no drift without validating it

#### Scenario: An issue without implementation notes shows None

- **WHEN** the converted issue carries no implementation notes and the shortcut question is asked
- **THEN** the question shows `- None` as the implementation-details list, and answering `shortcut` records the empty list as confirmed and enters `Crystallize`

### Requirement: The shortcut reviews the draft under fixed invariants and enters Crystallize

On `shortcut`, Explore SHALL review the tool's draft and correct it only under four invariants: every field comes from the issue text and a field without a source reads `- None`; the `E` and `I` lists stay literal in identifiers, wording, and order; the block keeps the issue's language; and every correction is shown with its reason before the route choice. Explore SHALL then send the `issue-shortcut` intent with the tool's `edge_cases` and `implementation_details` verbatim to `explore-idea@1` and follow the returned `next.follow` into `Crystallize`; on a rejection it SHALL report it in one line and continue with the planned Explore steps. The slicing assessment SHALL still run, and a sliced set SHALL distribute the `I` items across slices with their literal text. Immediately before the block set prints, Explore SHALL print the corrections it made, or one line saying the draft needed none. Claude Code and opencode SHALL follow the same shortcut.

#### Scenario: Shortcut enters Crystallize with the issue's lists

- **WHEN** the user answers the shortcut question with `shortcut`
- **THEN** Explore records the issue's literal `E` and `I` lists through the `issue-shortcut` intent and enters `Crystallize`

#### Scenario: Slicing distributes literal implementation items

- **WHEN** the slicing assessment splits a shortcut issue into several slices
- **THEN** each `I` item reaches its slice with its literal text

#### Scenario: Corrections are shown before the route choice

- **WHEN** Explore corrected a field of the draft
- **THEN** the field, the change, and its reason print immediately before the block set and before the route choice
