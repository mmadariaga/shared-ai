# Implement Progress Plan Specification

## Purpose

Define the canonical implementation progress plan: its five ordered steps, their one-to-one correspondence with the implementation-planning workflow, and the first-run skip-folding rule.

## Requirements

### Requirement: implement-adapter-declares-progress-plan

The implementation phase adapter (`sai/commands/implement/coordinator.md`) SHALL declare a `progress_plan` with exactly the following ordered progress steps:

    prereqs-resolution: "Prerequisites and change resolution"
    plan-simplification: "Existing plan simplification"
    artifact-analysis: "Artifact analysis and decision validation"
    documentation-review: "Required documentation review"
    plan-generation: "Implementation plan generation and verification"

The implementation-planning worker contract SHALL enumerate the same step ids in the same order. The adapter SHALL NOT omit, reorder, or rename these steps, and SHALL NOT add steps. The plan SHALL be fully known at dispatch and immutable for the invocation, per `progress-plan-declaration`.

#### Scenario: implementation plan is declared

- **WHEN** `/sai-3-implement` starts in Claude Code or opencode through the routed coordinator
- **THEN** the implementation adapter SHALL declare the five canonical progress steps in order and SHALL render them as a live task list before the first worker result, per the neutral policy `sai/policies/todo-structure.md`

#### Scenario: implementation worker contract mirrors the ids

- **WHEN** the implementation-planning worker contract is read
- **THEN** it SHALL enumerate exactly `prereqs-resolution`, `plan-simplification`, `artifact-analysis`, `documentation-review`, and `plan-generation`

#### Scenario: envelope stays closed

- **WHEN** the implementation adapter dispatches its worker with a declared plan
- **THEN** the dispatch SHALL pass only `wrapper_echo_value` and `arguments_value`, and SHALL NOT carry the plan

### Requirement: implement-plan-steps-match-workflow

The implementation plan steps SHALL correspond one-to-one to the implementation-planning workflow: `plan-simplification` covers Step 1 (simplify an existing `implementation.md`, skipped on a first run); `artifact-analysis` covers Steps 2–3 (parse the artifacts, classify audit findings, validate design decisions for ADR/DDR); `documentation-review` covers Step 4 (read required documentation one time only); `plan-generation` covers Step 5 (first-run generation or re-run preservation plus the audit-derived step append) and the worker's pre-delivery durable-artifact verification. The plan SHALL NOT include a `specs-approval` step: the specs approval gate belongs to the design phase.

#### Scenario: workflow steps map to plan steps

- **WHEN** `sai/commands/implement/instructions.md` Step 1 through Step 5 are executed
- **THEN** each step's completion SHALL be reportable under exactly one of the declared plan step ids

#### Scenario: no approval step in the implementation plan

- **WHEN** the implementation plan is inspected
- **THEN** it SHALL contain exactly the five declared steps and SHALL NOT contain a `specs-approval` step

### Requirement: implement-plan-first-run-skip-fold

On a first run the simplification step is skipped entirely (no existing `implementation.md`). The skip SHALL fold into the completed batch of the next completed plan step, reported in plan order with no separate `skipped` field, following the slice-1 skip-fold precedent for fast-track-skipped gate steps.

#### Scenario: first run reports the skip inside a batch

- **WHEN** a first run completes `artifact-analysis` with `plan-simplification` skipped
- **THEN** the progress event SHALL list both ids in plan order, `plan-simplification` first, with no separate skipped field

#### Scenario: re-run reports the step normally

- **WHEN** a re-run executes the simplification step because `implementation.md` exists
- **THEN** the worker SHALL emit `plan-simplification` in its own completed batch when it completes
