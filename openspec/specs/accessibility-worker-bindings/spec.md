# accessibility-worker-bindings Specification

## Purpose
TBD

## Requirements

### Requirement: Claude Code and opencode bindings route the accessibility worker

The Claude Code and opencode accessibility-worker bindings SHALL each dispatch exactly one matching accessibility worker, preserve the harness-specific continuation reference, support same-worker continuation, and permit at most one replacement reconstruction when continuation fails. Claude Code SHALL use its managed worker dispatch and opencode SHALL use its numbered task dispatch. The bindings SHALL preserve the complete opaque original envelope, resolved input history, changed-file union, and required reconstruction fields without sending the prior worker journal or artifact contents to a replacement.

#### Scenario: Routed worker is dispatched
- **WHEN** Claude Code or opencode starts a routed accessibility invocation
- **THEN** its matching binding dispatches the accessibility worker with the complete original envelope
- **AND** the binding does not substitute a different phase worker or inline technical workflow

#### Scenario: Same-worker continuation succeeds
- **WHEN** the worker returns `needs_input` and the user selects an option
- **THEN** the active binding continues the same worker with only the selected value and preserved lifecycle state
- **AND** it does not start a replacement worker

#### Scenario: Continuation fails
- **WHEN** same-worker continuation fails after the coordinator has preserved the required reconstruction state
- **THEN** the binding dispatches no more than one replacement worker
- **AND** the replacement receives no prior journal or artifact contents

### Requirement: Runtime authorization is forwarded through the closed lifecycle

The bindings SHALL forward runtime authorization as the worker's own `needs_input` question and ordered options. Claude Code SHALL expose the question through `AskUserQuestion`, and opencode SHALL expose it through the native `question` picker. The binding SHALL forward the selected value to the worker and SHALL never execute, authorize, skip, or synthesize a runtime command response on the worker's behalf.

#### Scenario: Worker asks to authorize a scanner
- **WHEN** the worker returns a command-specific `needs_input` payload
- **THEN** the binding presents the exact worker-authored question and ordered options in the active harness picker
- **AND** it does not add a side-channel command or metadata field

#### Scenario: User declines runtime authorization
- **WHEN** the user selects the worker's skip option
- **THEN** the binding forwards that exact selected value
- **AND** the worker, rather than the binding, decides how to continue without executing the command

### Requirement: Replacement recovery resets runtime evidence and authorization state

When same-worker continuation fails after runtime commands may have executed, a replacement worker SHALL restart the accessibility workflow from the original envelope with fresh runtime authorization state. It SHALL not receive or reuse the failed worker's runtime authorizations, command results, tools-used state, journal, or artifact contents. The replacement SHALL re-request authorization for each applicable runtime command and SHALL report only runtime evidence it executes or observes itself; prior worker side effects SHALL be treated as unknown.

#### Scenario: Continuation fails after an authorized scanner
- **WHEN** the active worker fails after executing one or more authorized runtime scanner commands
- **THEN** the replacement worker starts runtime processing from the first applicable scanner with fresh authorization questions
- **AND** it does not assume that a previously authorized or executed command remains authorized or evidenced

#### Scenario: Replacement completes after runtime recovery
- **WHEN** the replacement worker produces a verified accessibility report
- **THEN** its runtime-tools-used statement includes only commands and outcomes observed by the replacement worker
- **AND** it does not claim evidence from runtime activity whose result was lost with the failed worker

### Requirement: Worker result payloads remain lifecycle-compatible

The bindings SHALL accept and forward only the closed lifecycle outcomes `completed`, `needs_input`, `failed`, and `cancelled`, preserving `summary`, `changed_files`, `question`, `options`, and `resolved_change_name` according to the shared lifecycle contract. They SHALL not add continuation identifiers, binding metadata, runtime command payloads, report contents, or other technical fields to worker-authored outcomes. Routed bindings SHALL be limited to Claude Code and opencode and SHALL not add a compatibility caller or binding.

#### Scenario: Worker returns a malformed outcome
- **WHEN** a routed accessibility worker result has an unknown status or invalid lifecycle field shape
- **THEN** the binding reports the lifecycle failure without inventing missing data
- **AND** it does not execute technical recovery

#### Scenario: Non-routed compatibility path receives no binding
- **WHEN** supported accessibility bindings are inspected
- **THEN** they contain only Claude Code and opencode worker bindings
- **AND** no compatibility caller or inline asset is loaded
