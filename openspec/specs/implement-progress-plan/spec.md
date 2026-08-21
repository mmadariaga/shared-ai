# Implement Progress Plan Specification

## Purpose

Define the canonical implementation progress plan: its five ordered steps, their one-to-one correspondence with the implementation-planning workflow, and the first-run skip-folding rule.

## Requirements

### Requirement: implement-adapter-declares-progress-plan

The implementation phase adapter (`sai/commands/implement/coordinator.md`) SHALL declare a `progress_plan` with exactly the following ordered progress steps:

    prereqs-resolution: "Check prerequisites"
    collapse-implemented-steps: "Collapse implemented steps"
    artifact-analysis: "Analyze artifacts and validate decisions"
    documentation-review: "Review required documentation"
    plan-generation: "Write implementation.md"
    validation: "Validate implementation.md and the audit append"

The indented block above is illustrative of the ids and labels only; it is not the rendering the instruction files use. The declaration as written in `sai/commands/implement/coordinator.md` and in the implementation-planning worker contract (`sai/commands/implement/worker.md`) SHALL use those files' existing list rendering, and the two rendered lists SHALL compare equal by ordered id/label content after per-line indentation normalization — not by comparing either file with this delta's block. The worker contract SHALL enumerate the same step ids with the same labels in the same order. The adapter SHALL NOT omit, reorder, or rename these steps, and SHALL NOT add steps. The plan SHALL be fully known at dispatch and immutable for the invocation, per `progress-plan-declaration`.

Every step label SHALL be imperative (an instruction naming the act, e.g. `Write implementation.md`), not nominal.

#### Scenario: implementation plan is declared

- **WHEN** `/sai-3-implement` starts in Claude Code or opencode through the routed coordinator
- **THEN** the implementation adapter SHALL declare the six canonical progress steps in order and SHALL render them as a live task list before the first worker result, per the neutral policy `sai/policies/todo-structure.md`
- **AND** the first step SHALL be labeled `Check prerequisites`

#### Scenario: implementation worker contract mirrors the ids

- **WHEN** the implementation-planning worker contract is read
- **THEN** it SHALL enumerate exactly `prereqs-resolution`, `collapse-implemented-steps`, `artifact-analysis`, `documentation-review`, `plan-generation`, and `validation`, in that order, with the same labels the adapter declares
- **AND** its declaration block SHALL compare equal to the coordinator file's declaration block by ordered id/label content after per-line indentation normalization, both rendered in those files' existing list form

#### Scenario: envelope stays closed

- **WHEN** the implementation adapter dispatches its worker with a declared plan
- **THEN** the dispatch SHALL pass only `arguments_value`, and SHALL NOT carry the plan

#### Scenario: labels are imperative

- **WHEN** the declared labels are read
- **THEN** each SHALL be phrased as an imperative act rather than a noun phrase

### Requirement: implement-plan-steps-match-workflow

The implementation plan steps SHALL correspond one-to-one to the implementation-planning workflow: `collapse-implemented-steps` covers Step 1 (collapse every fully applied `#### Step N` of an existing `implementation.md` to `*(already applied)*`, skipped on a first run); `artifact-analysis` covers Steps 2–3 (parse the artifacts, classify audit findings, validate design decisions for ADR/DDR); `documentation-review` covers Step 4 (read required documentation one time only); `plan-generation` covers Step 5's write (first-run generation or re-run preservation plus the audit-derived step append); `validation` covers the worker's pre-delivery durable-artifact verification — the `implementation.md` invariants and the audit-derived step append check, which remains a non-completion blocker: any failed check returns a non-completed lifecycle result and never a `completed` claim. The plan SHALL NOT include a `specs-approval` step: the specs approval gate belongs to the design phase.

#### Scenario: workflow steps map to plan steps

- **WHEN** `sai/commands/implement/instructions.md` Step 1 through Step 5 are executed
- **THEN** each step's completion SHALL be reportable under exactly one of the declared plan step ids

#### Scenario: no approval step in the implementation plan

- **WHEN** the implementation plan is inspected
- **THEN** it SHALL contain exactly the six declared steps and SHALL NOT contain a `specs-approval` step

#### Scenario: validation step covers the durable verification

- **WHEN** the worker completes the pre-delivery durable-artifact verification of `implementation.md` and the audit-derived step append check
- **THEN** those acts SHALL be reported under `validation`
- **AND** a failed verification SHALL NOT emit a `completed` claim — the run closes with a non-completed lifecycle result instead

### Requirement: implement-plan-first-run-skip-fold

On a first run the collapse step is skipped entirely (no existing `implementation.md`). The skip SHALL fold into the completed batch of the next completed plan step, reported in plan order with no separate `skipped` field, following the slice-1 skip-fold precedent for fast-track-skipped gate steps. On a re-run, `collapse-implemented-steps` completes as its own batch. The first-run skip-fold behavior is preserved unchanged from the retired `plan-simplification` id: the skipped id folds into the next completed batch in plan order with no separate `skipped` field.

#### Scenario: first run reports the skip inside a batch

- **WHEN** a first run completes `artifact-analysis` with `collapse-implemented-steps` skipped
- **THEN** the progress event SHALL list both ids in plan order, `collapse-implemented-steps` first, with no separate skipped field

#### Scenario: re-run reports the step normally

- **WHEN** a re-run executes the collapse step because `implementation.md` exists
- **THEN** the worker SHALL emit `collapse-implemented-steps` in its own completed batch when it completes
