# Spec Progress Plan Specification

## Purpose

Define the canonical spec progress plan: its three ordered steps, their one-to-one correspondence with the spec-proposal phase sequence, and the exclusion of the specs-approval step.

## Requirements

### Requirement: spec-adapter-declares-progress-plan

The spec phase adapter (`sai/commands/spec/coordinator.md`) SHALL declare a `progress_plan` with exactly the following ordered progress steps:

    prereqs-resolution: "Prerequisites and change resolution"
    proposal-and-specs: "Proposal and specs authoring"
    verification-summary: "Verification and decision summary"

The spec-proposal worker contract SHALL enumerate the same step ids in the same order. The adapter SHALL NOT omit, reorder, or rename these steps, and SHALL NOT add steps. The plan SHALL be fully known at dispatch and immutable for the invocation, per `progress-plan-declaration`.

#### Scenario: spec plan is declared

- **WHEN** `/sai-1-spec` starts in Claude Code or opencode through the routed coordinator
- **THEN** the spec adapter SHALL declare the three canonical progress steps in order and SHALL render them as a live task list before the first worker result, per the neutral policy `sai/policies/todo-structure.md`

#### Scenario: spec worker contract mirrors the ids

- **WHEN** the spec-proposal worker contract is read
- **THEN** it SHALL enumerate exactly `prereqs-resolution`, `proposal-and-specs`, and `verification-summary`

#### Scenario: envelope stays closed

- **WHEN** the spec adapter dispatches its worker with a declared plan
- **THEN** the dispatch SHALL pass only `wrapper_echo_value` and `arguments_value`, and SHALL NOT carry the plan

### Requirement: spec-plan-steps-match-phase-sequence

The spec plan steps SHALL correspond one-to-one to the spec-proposal phase sequence: `prereqs-resolution` covers prerequisite checks and change resolution; `proposal-and-specs` covers the spec work act (proposal/spec writes, permitted root `GLOSSARY.md` updates); `verification-summary` covers the pre-completion artifact verification, self-consistency and source-grounding checks, and decision-summary derivation. The plan SHALL NOT include a `specs-approval` step: the specs approval gate belongs to the design phase.

#### Scenario: no approval step in the spec plan

- **WHEN** the spec plan is inspected
- **THEN** it SHALL contain exactly the three declared steps and SHALL NOT contain a `specs-approval` step

#### Scenario: verification step covers the completion phase

- **WHEN** the spec worker completes artifact verification and decision-summary derivation
- **THEN** those acts SHALL be reported under `verification-summary`, the plan's final step
