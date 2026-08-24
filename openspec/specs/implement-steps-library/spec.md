# implement-steps-library — Spec

## Purpose

TBD - created by archiving change implement-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Step instruction files exist per progress-plan id

The implementation phase SHALL provide a step instruction library under `sai/commands/implement/steps/` containing one instruction file per declared progress-plan step id: `collapse-implemented-steps.md`, `artifact-analysis.md`, `documentation-review.md`, `plan-generation.md`, and `validation.md`, plus `common.md` as the always-active file. The `prereqs-resolution` step SHALL have no step file of its own and SHALL map to `none` in the coordinator's pointer map.

#### Scenario: Step files are named by plan id

- **WHEN** a consumer inspects `sai/commands/implement/steps/` for a declared progress-plan step id other than `prereqs-resolution`
- **THEN** an instruction file named `{step-id}.md` exists in that directory.

### Requirement: common.md is fetched at dispatch and stays in force

The implementation worker SHALL fetch `sai/commands/implement/steps/common.md` at dispatch and SHALL keep it in force for the entire run. The file SHALL carry the boundaries that outlive any single step: the step delivery meta-rule, communication mode, expertise profile contract, hard rules, code quality priority stack, and contextual intelligence.

#### Scenario: common.md is loaded at dispatch

- **WHEN** the implementation worker is dispatched
- **THEN** it loads `sai/commands/implement/steps/common.md` and the file's run-long boundaries remain in force for the whole run.

### Requirement: ADR/DDR validation content lives inside artifact-analysis.md

The ADR/DDR validation workflow content (Workflow Step 3) SHALL live inside `sai/commands/implement/steps/artifact-analysis.md`, which owns no milestone boundary of its own.

#### Scenario: Step 3 content is located in artifact-analysis.md

- **WHEN** a consumer looks for the implement phase's ADR/DDR validation instructions
- **THEN** they are found inside `sai/commands/implement/steps/artifact-analysis.md`.

### Requirement: Common baseline and just-in-time step delivery

`sai/commands/implement/steps/common.md` SHALL remain the run-long technical baseline for the implementation worker, and coordinator-selected step files SHALL provide just-in-time instructions for the active step. The step library SHALL be the active technical instruction source after the inactive `sai/commands/implement/invocation.md` surface is retired.

`steps/common.md` SHALL remain the run-long technical baseline for the implementation worker, and coordinator-selected step files SHALL provide the just-in-time instructions for the active step. Coordinator and worker lifecycle contracts MUST NOT override the technical authority of those files.

#### Scenario: Step-gated worker starts a step

- **WHEN** the coordinator delivers the pointer for the next implementation step
- **THEN** the worker uses `steps/common.md` and only the pointed step file as its technical instruction surface.

#### Scenario: Step-gated worker starts without the retired invocation card

- **WHEN** the implementation worker begins a routed run
- **THEN** it uses `steps/common.md` and the coordinator-named step file without loading `sai/commands/implement/invocation.md`.
