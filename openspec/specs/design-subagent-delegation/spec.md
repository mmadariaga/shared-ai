# Design Subagent Delegation Specification

## Purpose

Define the subagent delegation rules for the routed design coordinator and worker, ensuring the coordinator performs no I/O and the worker delegates source-code discovery to its explore binding.

## Requirements

### Requirement: The design coordinator SHALL NOT perform file I/O
For routed design, the coordinator SHALL perform no file I/O, including OpenSpec artifacts, source code, configuration, documentation, or git state, on the clean lifecycle route. The design worker SHALL own all design-phase I/O and MUST delegate all source-code discovery to budget-explorer through its harness binding; it SHALL not call Read, Glob, or Grep directly on source code. After resolution, a failed result, a coordinator-disproved completed result, or a completed result carrying a STOP opens the shared non-clean diagnosis exception: the coordinator MAY read only the declared planning artifacts and read-only prior-phase inputs needed to identify cause, but SHALL not perform source discovery, write artifacts, or repair the worker's files. The sole milestone-stamp rule remains unchanged.

#### Scenario: Routed design needs source evidence
- **WHEN** the clean coordinator receives a result or user answer that requires source inspection
- **THEN** it SHALL continue or replace the design worker and SHALL NOT call Read, Glob, Grep, shell, OpenSpec, or git tools itself
- **AND** the single wall-clock shell call per render act for milestone-stamp acquisition under `coordinator-wall-clock-permission-grant` of `sai-todo-timestamps` SHALL NOT count as a violation of this scenario

#### Scenario: Design worker needs source evidence
- **WHEN** the routed design worker needs to inspect source code
- **THEN** it SHALL dispatch budget-explorer through the configured Claude binding or opencode `explore` task and SHALL act on that report rather than reading source code directly

#### Scenario: Inline Copilot design needs source evidence
- **WHEN** the inline Copilot design path needs to understand source files outside `proposal.md` and `specs/**/*.md`
- **THEN** it SHALL delegate discovery through its existing research-subagent path

### Requirement: The design worker SHALL be the source of truth for codebase facts presented to the coordinator
The coordinator SHALL use the design worker's technical findings as the source of truth for codebase facts and SHALL not re-read source files. On the clean route it SHALL not re-read change artifacts. On the non-clean diagnosis route it MAY independently read only the declared planning artifacts and prior-phase inputs to verify the closure and determine cause locus; this is authoritative lifecycle verification, not a competing source-discovery path. The worker SHALL remain responsible for resolving technical ambiguity through its research helper or a structured user question and SHALL not bypass that helper by reading source files itself.

#### Scenario: Worker reports a surprising pattern
- **WHEN** the design worker reports a codebase pattern the coordinator did not anticipate
- **THEN** the coordinator SHALL relay or act on the lifecycle result without opening the file or making a competing technical decision

#### Scenario: Worker cannot resolve conflicting evidence
- **WHEN** the design worker finds ambiguous or conflicting codebase evidence
- **THEN** the worker SHALL continue research or return `needs_input`; the coordinator SHALL not inspect the evidence itself

#### Scenario: Coordinator verifies a non-clean artifact closure
- **WHEN** the coordinator must decide whether a failed or disproven design result is in scope
- **THEN** it SHALL inspect only the declared planning artifacts and prior-phase inputs
- **AND** its verified cause-locus judgment SHALL control recovery while the worker remains the correction owner

### Requirement: Non-clean artifact reads do not broaden design delegation

The non-clean diagnosis exception SHALL be phase-scoped and terminal-route-scoped. It SHALL not grant the coordinator general repository search, source browsing, web access, OpenSpec command execution, artifact write access, or permission to bypass the design worker's research-subagent contract. The exception SHALL be identical across Claude Code and opencode except for their binding mechanics.

#### Scenario: A non-clean read remains phase-scoped
- **WHEN** the design coordinator diagnoses a failed main-path result
- **THEN** it SHALL read only the declared design/prior-phase artifacts needed for the cause decision
- **AND** it SHALL not glob or search unrelated project files

#### Scenario: Clean and non-clean permissions do not leak
- **WHEN** the non-clean route ends or the same invocation returns to normal input/feedback handling
- **THEN** the coordinator SHALL resume the clean-route prohibition
- **AND** later lifecycle turns SHALL not use the exception unless a new non-clean closure occurs

### Requirement: Design research delegation MUST declare an output contract
Every research subagent spawned by the design worker or the Copilot inline design path MUST receive an output contract specifying exact response fields, a hard length cap, and whether raw file contents are forbidden. Research subagents SHALL return evidence to the technical owner and SHALL NOT write design artifacts.

#### Scenario: Design worker delegates codebase research
- **WHEN** the design worker launches a research subagent
- **THEN** the prompt SHALL define exact fields, a hard cap, and no-raw-content discipline, and the design worker SHALL retain responsibility for technical decisions and artifact writes

### Requirement: Payload-sourced stamps remove coordinator clock access

The routed design coordinator SHALL source milestone stamps from worker-authored `emitted_on` and SHALL perform no wall-clock shell call; source discovery remains delegated to the design worker.

#### Scenario: Design renders a completed step
- **WHEN** a design result marks a progress step completed
- **THEN** the coordinator reads the result's `emitted_on` and performs no shell operation.
