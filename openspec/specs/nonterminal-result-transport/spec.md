# Nonterminal Result Transport Specification

## Purpose
Define how workers return intermediate progress while preserving a terminal lifecycle result.

## Requirements

### Requirement: returned-nonterminal-results

Workers SHALL return progress events and design notices as closed nonterminal results. Text written inside a worker session SHALL not be treated as transport to the coordinator.

#### Scenario: progress event pauses the worker
- **WHEN** a worker completes one or more newly completed progress-plan steps
- **THEN** it SHALL return a progress event containing `event: "progress"`, `step_ids`, and `changed_files`
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

### Requirement: Worker turn ends with every started command finished

The shared worker contract SHALL state, through `sai/policies/worker-lifecycle.md` § Worker side, that a worker's turn ends with its message: when the worker sends a result, a step report, or a question, every command it launched has finished. The agent worker templates and the `budget-subagent` agent files on both harnesses SHALL fetch that section, and `sai/policies/executor-agent.md` SHALL point to it instead of restating the rule. A worker SHALL await a command that ends on its own, or end a background command it started, before it sends the message. A worker SHALL stop a process that never ends on its own, such as a development server started for the worker's own checks, before sending, and SHALL report a command it ended because it did not terminate as a failed command in that same message. The cache-warm wait that the worker arms after a response under `sai/policies/cache-warming.md` SHALL be exempt, because it is armed after the message by design. The rule applies to nonterminal and terminal results alike and adds no result route.

#### Scenario: Finite command is awaited

- **WHEN** a worker has started a command that ends on its own and that command is still running
- **THEN** the worker waits for it to finish and returns its result once the outcome is known

#### Scenario: Long-lived process is stopped

- **WHEN** a worker has started a process that never ends on its own for its own checks
- **THEN** the worker stops that process before it returns its result

#### Scenario: Hung command is reported as failed

- **WHEN** a command the worker launched does not terminate and the worker ends it before sending its message
- **THEN** the worker reports that command as a failed command in that same message

#### Scenario: Question waits for launched commands

- **WHEN** a worker is about to return a `needs_input` question while a command it launched is still running
- **THEN** it awaits or ends that command before it sends the question

#### Scenario: Warm wait is exempt

- **WHEN** a worker arms its cache-warm wait after sending a response
- **THEN** that background wait does not violate the rule and the worker does not await it before the message
