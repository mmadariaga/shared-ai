# Nonterminal Result Transport Specification

## Purpose
Define how workers return intermediate progress while preserving a terminal lifecycle result.

## Requirements

### Requirement: returned-nonterminal-results

Workers SHALL return progress events and design notices as closed nonterminal results. Text written inside a worker session SHALL not be treated as transport to the coordinator.

#### Scenario: progress event pauses the worker
- **WHEN** a worker completes one or more newly completed progress-plan steps
- **THEN** it SHALL return a progress event containing `event: "progress"`, `emitted_on`, `step_ids`, and `changed_files`
- **AND** its turn SHALL end until the coordinator resumes it

#### Scenario: coordinator resumes progress
- **WHEN** the coordinator receives a returned progress event
- **THEN** it SHALL mark the reported steps and resume the same worker with exactly `continue_after_progress`

### Requirement: terminal-result-preservation

Workers SHALL close their run with exactly one terminal lifecycle status, preceded by zero or more returned nonterminal results.

#### Scenario: progress precedes completion
- **WHEN** a worker returns one or more progress events and later completes successfully
- **THEN** the run SHALL still close with exactly one `completed` terminal result
