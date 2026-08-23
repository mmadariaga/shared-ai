# implement-steps-library — Spec

## ADDED Requirements

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
