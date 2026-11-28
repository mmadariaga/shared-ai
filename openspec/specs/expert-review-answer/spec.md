# expert-review-answer Specification

## Purpose

Define the adversarial expert review answer of `/sai-plan` and `/sai-build`, the run-state fields that record it, and the reconciliation modes and questions the three offering commands share.

## Requirements

### Requirement: Answer sources and precedence

`/sai-plan` and `/sai-build` SHALL hold one expert review answer of `no`, `auto`, or `ask`, resolved once at Start after the input checks and before the first worker exists, from the `--expert-review [no|auto|ask]` argument, where a bare flag is `auto`, then from the `expert_review` field recorded in `plan-run@1` or `implement-run@1`, then from one native question.

#### Scenario: Recorded answer after resumption

- **WHEN** a run resumes and its run state records `expert_review: auto`
- **THEN** the run SHALL use `auto` and SHALL ask no expert review question.

### Requirement: Closed flag value

An `--expert-review` value other than `no`, `auto`, or `ask`, or a second `--expert-review`, SHALL end the run before anything is written with `Cannot start {command}: --expert-review takes no, auto or ask.`

#### Scenario: Invalid flag value

- **WHEN** the invocation carries `--expert-review always`
- **THEN** the run SHALL end before anything is written and print `Cannot start {command}: --expert-review takes no, auto or ask.`

### Requirement: Recorded fields in the run state

`plan-run@1` and `implement-run@1` SHALL provide the closed-choice fields `expert_review`, with the values `no`, `auto`, and `ask`, and `expert_review_checkpoint`, with the values `done` and `skipped`; the shared run core SHALL accept a `choices` declaration that creates one state field, one event, and one `run` view field per declared field.

#### Scenario: Checkpoint runs once

- **WHEN** a resumed run finds `expert_review_checkpoint` recorded as `done`
- **THEN** it SHALL NOT run the checkpoint again.

### Requirement: Start question

The Start question SHALL be presented through the harness's native picker with the options `No`, `Yes, decide the corrections`, and `Yes, ask me before keeping them`, in that order, with the stable values `no`, `auto`, and `ask`, and a cancelled question SHALL count as `no`.

#### Scenario: Start question cancelled

- **WHEN** the user cancels the Start question
- **THEN** the answer SHALL be `no` and the run SHALL create no worker, no report directory, and no write.

### Requirement: Reconciliation modes

In `auto` mode the coordinator SHALL decide the fate of each finding itself; in `ask` mode, and at every explore checkpoint, it SHALL ask the reconciliation question once before keeping any correction.

#### Scenario: Auto mode decides without asking

- **WHEN** the recorded answer is `auto`
- **THEN** the coordinator SHALL keep or revert each correction by itself, state each decision with its reason, and ask no reconciliation question.

### Requirement: Reconciliation question options

The reconciliation question SHALL offer `Keep the recommended corrections`, `Keep all corrections`, and `Discard all corrections`, in that order, with the stable values `recommended`, `keep-all`, and `discard-all`; a free-text answer SHALL request exactly the corrections its identifiers name.

#### Scenario: Findings sharing a path

- **WHEN** two findings' corrections change the same path
- **THEN** they SHALL be kept or reverted together, and the closing report SHALL name them together.

### Requirement: Dismissed reconciliation question

A dismissed reconciliation question SHALL keep no correction: mutations mode SHALL revert every worker change, document mode SHALL leave the stored documents unchanged, and the run SHALL continue as after a `no` answer; when every finding comes without a correction, the question SHALL NOT be asked.

#### Scenario: Dismissed question in ask mode

- **WHEN** the user dismisses the reconciliation question of an `ask` run
- **THEN** every worker change SHALL be reverted, no document SHALL be amended, and the run SHALL continue as after `no`.

### Requirement: Exempt callers

`/sai-explore` SHALL keep no recorded answer and SHALL ask a yes/no question once per crystallized set; the Plan - Unattended route SHALL pass `--expert-review no` because the documents already passed explore's checkpoint; and `/sai-3-implement` SHALL strip and ignore the argument.

#### Scenario: Plan route disables the plan checkpoint

- **WHEN** the Plan - Unattended route invokes `/sai-plan`
- **THEN** its `arguments_value` SHALL carry `--expert-review no`, and the plan run SHALL ask no expert review question and create no expert review worker.

### Requirement: Explore checkpoint question

The explore checkpoint SHALL ask, through the native picker, whether to review the crystallized documents with an independent expert before choosing a route, with the options `Yes` and `No` in that order; `No` and a cancelled question SHALL create no worker, open no report directory, and write nothing.

#### Scenario: Explore question declined

- **WHEN** the user answers `No` to the explore checkpoint question
- **THEN** no worker SHALL start, no report directory SHALL be opened, and the flow SHALL continue to round 1.
