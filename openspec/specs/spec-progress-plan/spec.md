# Spec Progress Plan Specification

## Purpose

Define the canonical spec progress plan: its three ordered steps, their one-to-one correspondence with the spec-proposal phase sequence, and the exclusion of the specs-approval step.

## Requirements

### Requirement: spec-adapter-declares-progress-plan

The spec phase adapter (`sai/commands/spec/coordinator.md`) SHALL declare a `progress_plan` with exactly the following ordered progress steps:

    prereqs-and-change: "Check prerequisites and resolve the change"
    proposal: "Write proposal.md"
    specs: "Write specs/**"
    validation: "Validate artifacts and derive the decision summary"
    review: "Review artifacts"

The indented block above is illustrative of the ids and labels only; it is not the rendering the instruction files use. The declaration as written in `sai/commands/spec/coordinator.md` and in the spec-proposal worker contract (`sai/commands/spec/worker.md`) SHALL use those files' existing list rendering, and byte-identity SHALL be asserted between those two file renderings — not between either of them and this delta's block. The worker contract SHALL enumerate the same step ids with the same labels in the same order. The adapter SHALL NOT omit, reorder, or rename these steps, and SHALL NOT add steps. The plan SHALL be fully known at dispatch and immutable for the invocation, per `progress-plan-declaration`.

#### Scenario: spec plan is declared

- **WHEN** `/sai-1-spec` starts in Claude Code or opencode through the routed coordinator
- **THEN** the spec adapter SHALL declare the five canonical progress steps in order and SHALL render them as a live task list before the first worker result, per the neutral policy `sai/policies/todo-structure.md`

#### Scenario: spec worker contract mirrors the ids

- **WHEN** the spec-proposal worker contract is read
- **THEN** it SHALL enumerate exactly `prereqs-and-change`, `proposal`, `specs`, `validation`, and `review`, in that order, with the same labels the adapter declares
- **AND** its declaration block SHALL be byte-identical to the coordinator file's declaration block, both rendered in those files' existing list form

#### Scenario: envelope stays closed

- **WHEN** the spec adapter dispatches its worker with a declared plan
- **THEN** the dispatch SHALL pass only `wrapper_echo_value` and `arguments_value`, and SHALL NOT carry the plan

### Requirement: spec-plan-steps-match-phase-sequence

The spec plan steps SHALL correspond one-to-one to the spec-proposal phase sequence: `prereqs-and-change` covers prerequisite checks and change resolution; `proposal` covers writing `proposal.md`; `specs` covers writing the change's `specs/**/*.md` together with any permitted root `GLOSSARY.md` update and any consistency-driven re-edit of `proposal.md` made while writing the specs; `validation` covers the pre-completion artifact verification, self-consistency and source-grounding checks, and decision-summary derivation; `review` covers the worker-owned automated artifact review defined by `planning-artifact-review-loop`. The plan SHALL NOT include a `specs-approval` step: the specs approval gate belongs to the design phase.

Every step label SHALL be imperative (an instruction naming the act, e.g. `Write proposal.md`), not nominal.

#### Scenario: no approval step in the spec plan

- **WHEN** the spec plan is inspected
- **THEN** it SHALL contain exactly the five declared steps and SHALL NOT contain a `specs-approval` step

#### Scenario: validation step covers the completion phase

- **WHEN** the spec worker completes artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation
- **THEN** those acts SHALL be reported under `validation`

#### Scenario: consistency re-edit of the proposal belongs to the specs step

- **WHEN** writing `specs/**` forces a consistency correction to `proposal.md` in the same act
- **THEN** that write SHALL be reported in the `specs` batch's `changed_files`
- **AND** it SHALL NOT re-open, re-report, or revert the already-marked `proposal` step

#### Scenario: labels are imperative

- **WHEN** the declared labels are read
- **THEN** each SHALL be phrased as an imperative act rather than a noun phrase
