# Spec Proposal Worker Specification

## Purpose

Define the spec-proposal worker's progress-event emission: carrying only the canonical spec plan step ids in plan order, the changed files, and the terminal-payload closing contract.

## Requirements

### Requirement: Spec worker emits progress events

The spec-proposal worker SHALL emit progress events, after prerequisite checks pass and change resolution completes, whenever one or more plan steps complete. Every event SHALL carry only the canonical step ids enumerated by `spec-progress-plan` (`prereqs-resolution`, `proposal-and-specs`, `verification-summary`), in plan order, plus the files changed since the preceding result. The worker SHALL NOT author, extend, or reorder the plan, SHALL NOT emit a progress event before resolution or in place of a terminal payload, and SHALL NOT emit a progress event during a feedback turn.

#### Scenario: startup act is one batch

- **WHEN** the worker completes prerequisite checks and change resolution as one act
- **THEN** it SHALL emit one progress event carrying `prereqs-resolution`

#### Scenario: authoring batch

- **WHEN** the worker completes the proposal/spec writes and permitted glossary updates
- **THEN** it SHALL emit one progress event carrying `proposal-and-specs`, with `changed_files` listing every path written since the preceding result

#### Scenario: verification batch

- **WHEN** the worker completes artifact verification, self-consistency and source-grounding checks, and decision-summary derivation
- **THEN** it SHALL emit one progress event carrying `verification-summary`

#### Scenario: feedback turns emit no progress

- **WHEN** the worker applies coordinator-forwarded artifact feedback after a `completed` result
- **THEN** it SHALL NOT emit a progress event, because no plan step completes during a feedback turn

#### Scenario: terminal payload still closes

- **WHEN** the worker completes the spec phase
- **THEN** it SHALL still return exactly one terminal lifecycle status and SHALL NOT close with a progress event
