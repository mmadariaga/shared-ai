# implement-steps-library — Spec

## Purpose

Deliver the `/sai-3-implement` worker's instructions one progress-plan step at a time from a step library, with a small always-active baseline.

## Requirements

### Requirement: Step instruction files exist per progress-plan id

The implementation library SHALL retain collapse-implemented-steps.md, artifact-analysis.md, documentation-review.md, plan-generation.md, validation.md, and common.md under sai/commands/implement/steps/. Conditional decision-record-index.md, audit-ingestion.md, and rerun-preservation.md SHALL retain their existing applicability gates. Resolution SHALL run inline in the coordinator without its own step file. The coordinator SHALL use this library for common work and final validation; category workers SHALL use common and plan-generation rules for assigned Step content.

#### Scenario: Step files are named by plan id

- **WHEN** a consumer inspects a declared milestone other than prereqs-resolution
- **THEN** the corresponding same-named instruction file exists in the implementation library.

### Requirement: common.md is fetched at dispatch and stays in force

The coordinator and category workers SHALL retain common.md as their run-long technical baseline. Its role, expertise, hard rules, planning-evidence rules, and code-quality-priority-stack fetch SHALL remain authoritative, with delivery adapted to coordinator common work and complete category tasks.

#### Scenario: common.md is loaded at dispatch

- **WHEN** a category worker is dispatched
- **THEN** common.md and its code-quality-priority-stack policy are loaded and remain in force throughout the worker task.

### Requirement: ADR/DDR validation content lives inside artifact-analysis.md

The ADR/DDR validation workflow content SHALL live inside `sai/commands/implement/steps/artifact-analysis.md`, which owns no milestone boundary of its own. Record relationship lines and per-family index maintenance SHALL live in `sai/commands/implement/steps/decision-record-index.md`, fetched by artifact-analysis before it writes the first record of a run.

#### Scenario: ADR/DDR validation content is located in artifact-analysis.md

- **WHEN** a consumer looks for the implement phase's ADR/DDR validation instructions
- **THEN** they are found inside `sai/commands/implement/steps/artifact-analysis.md`.

### Requirement: Common baseline and just-in-time step delivery

The implementation step library SHALL remain the sole technical planning-rule source. The coordinator SHALL load common-work files at their point of use; category workers SHALL follow common.md plus plan-generation.md for the full assigned-Step task. Lifecycle cards SHALL not override those technical rules, and no live worker active-step pointer or retired invocation card SHALL be required.

#### Scenario: Step-gated worker starts a step

- **WHEN** a category worker receives its complete assignment
- **THEN** it uses common.md and plan-generation Step-content rules for all assigned Steps rather than following one active-step pointer.

#### Scenario: Step-gated worker starts without the retired invocation card

- **WHEN** a category planning worker begins its task
- **THEN** it uses the shared baseline and planning rules without loading sai/commands/implement/invocation.md.
