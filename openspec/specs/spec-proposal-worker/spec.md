# Spec Proposal Worker Specification

## Purpose

Define the spec-proposal worker's progress-event emission: carrying only the canonical spec plan step ids in plan order, the changed files, and the terminal-payload closing contract.

## Requirements

### Requirement: Spec worker emits progress events

The spec-proposal worker SHALL emit progress events, after prerequisite checks pass and change resolution completes, whenever one or more plan steps complete. Every event SHALL carry worker-authored `emitted_on`, only the canonical step ids enumerated by `spec-progress-plan` (`prereqs-and-change`, `proposal`, `specs`, `validation`, `review`), in plan order, plus the files changed since the preceding result. The worker SHALL NOT author, extend, or reorder the plan, and SHALL NOT emit a progress event before resolution or in place of a terminal payload.

The worker SHALL report one batch per completed act: the startup act (prerequisite checks plus change resolution) carries `prereqs-and-change`; writing `proposal.md` carries `proposal`; writing the change's `specs/**/*.md` carries `specs`; artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation carry `validation`; a completed review pass reporting `High=0` carries `review` per `review-step-evidence-marking`.

A feedback turn SHALL NOT emit a progress event, except that a feedback turn which runs a review pass reporting `High=0` while the `review` step is still unmarked SHALL emit exactly one progress event carrying `review`. No feedback turn SHALL emit a progress event carrying any other step id.

#### Scenario: startup batch

- **WHEN** the spec worker passes prerequisite checks and resolves the change
- **THEN** it SHALL emit one progress event carrying `prereqs-and-change`

#### Scenario: proposal batch

- **WHEN** the spec worker has written `proposal.md`
- **THEN** it SHALL emit one progress event carrying `proposal`, with `changed_files` listing every path written since the preceding result

#### Scenario: specs batch

- **WHEN** the spec worker has written the change's `specs/**/*.md`
- **THEN** it SHALL emit one progress event carrying `specs`, with `changed_files` listing every path written since the preceding result, including any permitted root `GLOSSARY.md` update and any consistency-driven re-edit of `proposal.md`

#### Scenario: validation batch

- **WHEN** the spec worker completes artifact verification and derives the decision summary
- **THEN** it SHALL emit one progress event carrying `validation`

#### Scenario: review batch

- **WHEN** a worker-owned review pass completes and reports `High=0`
- **THEN** the worker SHALL emit one progress event carrying `review`

#### Scenario: ordinary feedback turns emit no progress

- **WHEN** the spec worker processes coordinator-forwarded artifact feedback that runs no review pass
- **THEN** it SHALL NOT emit a progress event, because no plan step completes during that turn

#### Scenario: a user-requested review pass during a feedback turn may mark review

- **WHEN** a feedback turn runs a user-requested review pass that reports `High=0` and the `review` step is not yet marked
- **THEN** the worker SHALL emit exactly one progress event carrying `review`
- **AND** it SHALL carry no other step id

#### Scenario: progress never closes the run

- **WHEN** the spec worker finishes the phase
- **THEN** it SHALL still return exactly one terminal lifecycle status and SHALL NOT close with a progress event
