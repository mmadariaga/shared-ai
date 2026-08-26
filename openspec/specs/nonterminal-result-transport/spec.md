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

### Requirement: Closed conflict extensions pause workers

A declared `event: conflict_detected` SHALL be transported as a closed nonterminal extension rather than a lifecycle status. The extension SHALL pause the worker, route its source to the coordinator handler, and resume only through the handler's same-worker continuation.

#### Scenario: Conflict detection pauses analysis

- **WHEN** a worker detects conflicted files
- **THEN** it returns the closed extension and ends its current turn before semantic analysis

#### Scenario: Extension resumes through the coordinator

- **WHEN** the coordinator has completed the language handoff or recorded strategy re-entry
- **THEN** it resumes the same worker with the coordinator-owned session state

### Requirement: Terminal result preservation

A merge worker stretch SHALL still close with exactly one terminal lifecycle status after zero or more conflict extensions or user-input pauses.

#### Scenario: Conflict extension precedes completion

- **WHEN** a conflicted merge completes after language selection and strategy confirmation
- **THEN** the run closes with exactly one terminal `completed`, `failed`, or `cancelled` result for that stretch
