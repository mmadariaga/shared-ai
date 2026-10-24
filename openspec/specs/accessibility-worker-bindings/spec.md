# accessibility-worker-bindings Specification

## Purpose
TBD

## Requirements

### Requirement: Claude Code and opencode bindings route the accessibility worker

The Claude Code and opencode accessibility-worker bindings SHALL render from the standalone worker template and carry only the create and continue calls for `sai-7-accessibility-worker`: Claude Code creates it with `Agent` and continues it with `SendMessage` to the captured agent ID, and opencode creates it with `task` and continues it with the captured `task_id`. The creation dispatch SHALL carry only the ready prompt. The shared audit coordinator that fetches the binding SHALL own the lifecycle, including replacement under its obstacle budget, and a replacement SHALL receive only the coordinator's hand-over note and no prior worker history or artifact contents.

#### Scenario: Routed worker is dispatched
- **WHEN** the audit coordinator starts an accessibility run on Claude Code or opencode
- **THEN** its matching binding creates the accessibility worker with the ready prompt alone
- **AND** the binding does not substitute a different phase worker or inline technical workflow

#### Scenario: Same-worker continuation succeeds
- **WHEN** the worker returns a `question` and the coordinator answers it
- **THEN** the answer is sent to the same worker through the binding's continue call
- **AND** no replacement worker is created

#### Scenario: Continuation fails
- **WHEN** the worker returns no ready, stays silent, or drifts
- **THEN** the coordinator may create a replacement with the same binding call, within its attempt budget
- **AND** the replacement receives no prior history or artifact contents

### Requirement: Runtime authorization is forwarded through the closed lifecycle

The accessibility runtime scanners SHALL be authorized by `--runtime` alone: neither the worker nor its binding SHALL forward a runtime authorization question, and the binding SHALL never execute, authorize, skip, or synthesize a runtime command response on the worker's behalf. The only runtime-related question SHALL be the dev-server URL input that the audit coordinator asks before the worker starts, when `--runtime` arrives without `--url`; Claude Code SHALL ask it through `AskUserQuestion` and opencode through the native `question` picker.

#### Scenario: Worker asks to authorize a scanner
- **WHEN** the worker reaches `resolve-runtime-audit` with `--runtime` and a dev-server URL
- **THEN** it runs the scanners without returning any authorization question
- **AND** no authorization picker is presented

#### Scenario: User declines runtime authorization
- **WHEN** the user declines the coordinator's dev-server URL question
- **THEN** the worker receives `--runtime` with no URL
- **AND** the worker records the runtime part as unavailable and continues the static audit

### Requirement: Replacement recovery resets runtime evidence and authorization state

When the audit coordinator replaces an accessibility worker after runtime commands may have executed, the replacement SHALL audit from the first step with the original options, receiving only the coordinator's hand-over note and no prior worker history, runtime command results, tools-used state, or artifact contents. `--runtime` SHALL still be its whole authorization, so it SHALL ask no authorization question, and it SHALL report only runtime evidence it executes or observes itself; prior worker side effects SHALL be treated as unknown.

#### Scenario: Continuation fails after an authorized scanner
- **WHEN** the active worker fails after executing one or more runtime scanner commands
- **THEN** the replacement worker starts from the first step and runs the applicable scanners itself without any authorization question
- **AND** it does not assume that a previously executed command remains evidenced

#### Scenario: Replacement completes after runtime recovery
- **WHEN** the replacement worker produces a verified accessibility report
- **THEN** its runtime-tools-used statement includes only commands and outcomes observed by the replacement worker
- **AND** it does not claim evidence from runtime activity whose result was lost with the failed worker

### Requirement: Worker result payloads remain lifecycle-compatible

The bindings SHALL return only the worker's closed results `step-done`, `question`, `completed`, and `failed` to the coordinator, preserving `step_ids`, `question`, `summary`, `changed_files`, `report_path`, and `counts`. They SHALL not add continuation identifiers, binding metadata, runtime command payloads, report contents, or other technical fields to worker-authored results. Bindings SHALL be limited to Claude Code and opencode and SHALL not add a compatibility caller or binding.

#### Scenario: Worker returns a malformed outcome
- **WHEN** an accessibility worker result is none of the closed results or has an invalid field shape
- **THEN** the coordinator treats it as an obstacle of the run without inventing missing data
- **AND** the binding executes no technical recovery of its own

#### Scenario: Non-routed compatibility path receives no binding
- **WHEN** supported accessibility bindings are inspected
- **THEN** they contain only Claude Code and opencode worker bindings
- **AND** no compatibility caller or inline asset is loaded
