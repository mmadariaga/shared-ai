# Progress Plan Declaration Specification

## Purpose

Define the phase-adapter progress plan declaration, the canonical per-phase step ids, and the coordinator's rendering-only role over the declared plan.

## Requirements

### Requirement: phase-adapter-declares-progress-plan

A routed phase adapter MAY declare a static, ordered progress plan as a new phase-adapter field `progress_plan`, alongside the closed phase-adapter field set at `sai/orchestration/coordinator-contract.md:34-42`. The plan SHALL be a fixed, ordered array of progress steps, each carrying a stable `id` and a user-facing `label`. The plan SHALL be fully known at dispatch time and SHALL NOT change during the invocation.

#### Scenario: adapter declares a plan

- **WHEN** a phase adapter supplies a `progress_plan`
- **THEN** the coordinator SHALL treat it as the authoritative progress plan for the invocation
- **AND** SHALL NOT alter its order, ids, or labels

#### Scenario: adapter declares no plan

- **WHEN** a phase adapter supplies no `progress_plan`
- **THEN** the coordinator SHALL run the invocation without rendering any task list and SHALL NOT synthesize a plan

### Requirement: plan-ids-canonical-in-phase-contracts

The step ids of a progress plan SHALL be canonical per phase: every phase's worker contract whose adapter declares a `progress_plan`, including the review, security, performance, and accessibility audit workers, SHALL enumerate the step ids the worker may report, and the phase adapter's `progress_plan` SHALL declare exactly those ids in the same order. Neither side learns the plan through the dispatch envelope, which SHALL remain the closed two-string envelope (`wrapper_echo_value`, `arguments_value`). The worker SHALL NOT add, remove, reorder, or rename steps; an adapter whose ids diverge from the worker contract's enumeration produces unknown ids that the coordinator SHALL ignore.

#### Scenario: audit worker reports canonical ids

- **WHEN** an audit worker is dispatched for a phase whose adapter declares a plan
- **THEN** the worker SHALL report only the step ids its audit phase contract enumerates
- **AND** the adapter's plan SHALL declare the same ids in the same order

#### Scenario: planning and audit envelopes stay closed

- **WHEN** any phase with a declared plan dispatches its worker
- **THEN** the dispatch SHALL pass only `wrapper_echo_value` and `arguments_value`
- **AND** the plan SHALL NOT be carried in the envelope

#### Scenario: any worker invents a step

- **WHEN** a planning or audit worker emits a progress event whose `step_ids` contain a value not declared in the plan
- **THEN** the coordinator SHALL ignore that value
- **AND** it SHALL NOT extend or amend the plan

### Requirement: coordinator-rendering-only

The coordinator SHALL render the declared progress plan as a live task list and mark progress steps only from worker progress events. It SHALL never derive, infer, or extend the plan: no step is added, removed, renamed, reordered, or re-labelled by the coordinator. Deriving each rendered step's state (`pending`, `in_progress`, `completed`) from plan order and the marked set is a rendering action over declared content, not plan derivation.

#### Scenario: coordinator never derives plan content

- **WHEN** the coordinator renders the task list
- **THEN** every rendered progress step SHALL come from the declared plan and no step SHALL be invented by the coordinator
