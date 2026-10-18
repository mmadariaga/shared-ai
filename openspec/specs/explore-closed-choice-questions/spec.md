# explore-closed-choice-questions Specification

## Purpose
TBD - created by archiving change enforce-native-picker-closed-questions. Update Purpose after archive.

## Requirements

### Requirement: Explore closed-choice questions use the native picker at every stage

At every Explore stage, a question whose answer is one of a finite set of options the asker lists, including a discovery question that offers options, SHALL go through the harness-native picker per the "Closed-choice prompts" rule in `sai/policies/remember.md`, with free text still available. The rule SHALL be stated in `sai/commands/explore/steps/common.md` as a stage-independent paragraph, not scoped to a single stage, and that paragraph SHALL name `AskUserQuestion` on Claude Code and `question` on opencode locally. This general paragraph SHALL NOT replace the local picker instructions at individual Explore question definitions.

#### Scenario: discovery question with options uses the picker

- **WHEN** Explore asks a discovery question that offers a finite set of options
- **THEN** the question is presented through `AskUserQuestion` on Claude Code or `question` on opencode, and free text remains available

#### Scenario: closed-choice question at a later stage uses the picker

- **WHEN** Explore asks a closed-choice question at any stage after the first
- **THEN** the question is presented through the harness-native picker

### Requirement: Explore closed-choice overflow and open-question exceptions

When a closed option set is larger than the picker capacity, Explore SHALL fall back to plain text that keeps every option in order. A question with no option set SHALL stay plain text.

#### Scenario: option set exceeds picker capacity

- **WHEN** Explore asks a closed-choice question with more options than the picker holds
- **THEN** the question is presented as plain text listing every option in its original order

#### Scenario: open question stays plain text

- **WHEN** Explore asks an open question that has no option set
- **THEN** the question is presented as plain conversation text without the picker

### Requirement: Explore stage-navigation questions keep their plain text form

Stage-navigation questions — the maturity question that offers moving to `Review edge cases`, and the `List stages` agreement questions — SHALL keep their plain text form and SHALL NOT be converted by the closed-choice rule into native pickers. The optional native stage selectors SHALL remain governed by their own existing rule in `sai/commands/explore/steps/common.md`, as optional supplements presented after the unchanged text questions.

#### Scenario: maturity question stays text

- **WHEN** Explore asks the maturity question that offers moving to `Review edge cases`
- **THEN** the question keeps its plain text form and any native maturity selector follows only under the optional native stage selectors rule

#### Scenario: list-stage agreement question stays conversational

- **WHEN** Explore asks an agreement question in a `List stages` stage
- **THEN** the question keeps its plain text form and is not presented as a native agreement picker

### Requirement: Explore loads the question-context policy at start

The Explore load sequence in `sai/commands/explore/body.md` SHALL fetch `sai/policies/question-context.md` after `sai/policies/remember.md` and before the `sai-state spawn` step, so the question-format policy is in context before Explore's first question.

#### Scenario: policy is loaded before the first question

- **WHEN** `/sai-explore` completes its load sequence
- **THEN** `sai/policies/question-context.md` has been fetched before Explore asks its first question
