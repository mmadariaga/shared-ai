# implement-conditional-step-loading Specification

## Purpose
Keep rare implement content out of the always-loaded step surface: audit ingestion and re-run preservation load from their own files only when their condition holds.

## Requirements

### Requirement: Audit ingestion SHALL load only when an audit artifact exists
The audit-ingestion content (Judgment Rubric for Audit Findings, escalation detection, Ready to Propose handoff, and the audit-step interface contract rule, which both the first-run and re-run append paths use) SHALL live in `sai/commands/implement/steps/audit-ingestion.md`. The `artifact-analysis` step SHALL fetch it only when at least one of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exists in `openspec/changes/{change-name}/` at run start, and SHALL skip it silently otherwise.

#### Scenario: Audit artifact present at run start
- **WHEN** `artifact-analysis` runs and an audit artifact exists
- **THEN** it fetches `audit-ingestion.md` and follows it for classification and escalation handoff

#### Scenario: No audit artifact at run start
- **WHEN** `artifact-analysis` runs and no audit artifact exists
- **THEN** it does not load `audit-ingestion.md` and emits no notice about the skip

### Requirement: Re-run preservation SHALL load only when implementation.md exists
The re-run preservation content (classify, preserve, and append audit-derived steps, applying the audit-step interface contract rule from `audit-ingestion.md`) SHALL live in `sai/commands/implement/steps/rerun-preservation.md`. The `plan-generation` step SHALL fetch it only when `implementation.md` already exists in `openspec/changes/{change-name}/` at run start, and SHALL skip it silently on a first run.

#### Scenario: implementation.md exists at run start
- **WHEN** `plan-generation` runs and `implementation.md` already exists
- **THEN** it fetches `rerun-preservation.md` and follows it instead of regenerating from the template

#### Scenario: First run
- **WHEN** `plan-generation` runs and `implementation.md` does not exist
- **THEN** it does not load `rerun-preservation.md`

#### Scenario: Both conditions hold
- **WHEN** an audit artifact exists and `implementation.md` already exists at run start
- **THEN** both `audit-ingestion.md` and `rerun-preservation.md` are loaded

### Requirement: Conditional loading SHALL add no machine state and SHALL leave ADR/DDR validation in place
Loading the two conditional files SHALL NOT add a progress-plan step id or change the implement step machine, and the implementation worker SHALL still never talk to `sai-state`. The ADR/DDR validation part of `sai/commands/implement/steps/artifact-analysis.md` SHALL stay in that file.

#### Scenario: No new step id
- **WHEN** the implement progress plan and step machine are inspected
- **THEN** they contain no id for `audit-ingestion` or `rerun-preservation`

#### Scenario: ADR/DDR validation stays in artifact-analysis
- **WHEN** a consumer looks for the ADR/DDR validation workflow
- **THEN** it is found in `sai/commands/implement/steps/artifact-analysis.md`
