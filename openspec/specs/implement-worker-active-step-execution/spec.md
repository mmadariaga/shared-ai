# implement-worker-active-step-execution — Spec

## Purpose

TBD - created by archiving change implement-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Worker executes only the coordinator-named active step

A category planning worker SHALL receive all assigned Steps in one complete task and SHALL apply the shared plan-generation rules to those Steps only. It SHALL not use an Active step pointer schedule, perform common preparation, or generate unassigned Steps.

#### Scenario: Only the named step file executes

- **WHEN** the coordinator discloses the complete category assignment
- **THEN** the worker executes common and plan-generation rules for every assigned Step without requiring per-Step continuations.

### Requirement: Wholesale instruction chain replaced by common.md at dispatch

Category workers SHALL load common.md at dispatch, return ready before task disclosure, and then consume the complete task containing change, run, agent, inputs, ordered steps, artifact, and common_context. Resolution and common preparation SHALL remain coordinator-owned. Workers SHALL emit no progress events or combined resolution/collapse milestone.

#### Scenario: Prereqs resolution runs before the first pointer

- **WHEN** the coordinator prepares category tasks
- **THEN** it resolves the change and completes required common preparation before disclosure, without transferring resolution or a first pointer to workers.

### Requirement: Steps never widen the worker contract

Assigned-Step planning SHALL preserve closed status returns, ordered changed_files accounting, failure classification, and the exact temporary-part write boundary. It SHALL not grant final-plan, shared-input, production-code, or git-mutation authority.

#### Scenario: Contract behavior is unchanged during step execution

- **WHEN** a worker plans or corrects any assigned Step
- **THEN** its lifecycle, failure, accounting, and temporary-artifact boundaries remain in force.

### Requirement: Active-step instruction authority

Category workers SHALL treat common.md and plan-generation Step-content rules as authoritative for their complete assignments. Shared documents MAY supply necessary dependency context but SHALL not expand output ownership.

#### Scenario: Worker receives an active pointer

- **WHEN** the coordinator provides planning work to a category worker
- **THEN** work is a complete assigned-Step task, not a progress pointer, and the worker follows the common baseline and planning rules without assuming phase-wide ownership.
