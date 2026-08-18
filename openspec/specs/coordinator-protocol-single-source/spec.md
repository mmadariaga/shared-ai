# Coordinator Protocol Single Source Specification

## Purpose

Define the single-sourced lifecycle and result-loop protocol consumed by the seven routed phase coordinators, so the shared closed-outcome, changed-file, reconstruction, and progress-event mechanics live in the shared Orchestration Core contracts instead of being restated per phase.

## Requirements

### Requirement: routed coordinators consume the shared lifecycle protocol

The seven routed phase coordinators SHALL consume the phase-neutral result-loop and lifecycle mechanics from `sai/orchestration/command-runner.md` and `sai/orchestration/worker-core.md` instead of restating those mechanics locally. The shared mechanics include closed lifecycle outcomes, changed-file unioning, continuation and replacement reconstruction, and progress-event handling.

#### Scenario: shared protocol is the single source

- **WHEN** a maintainer changes a shared result-loop, lifecycle outcome, changed-file union, reconstruction, or progress-event rule
- **THEN** the routed coordinators SHALL reference the updated shared contract without requiring equivalent normative protocol text to be edited in each phase coordinator

#### Scenario: all routed phase coordinators reference the contract

- **WHEN** the seven routed coordinator bodies are inspected
- **THEN** each body SHALL reference `sai/orchestration/command-runner.md` and `sai/orchestration/worker-core.md` for its common protocol
- **AND** no body SHALL locally redefine the common closed-outcome, changed-file, reconstruction, or progress-event mechanics

### Requirement: phase adapters retain phase-specific behavior

Each routed coordinator SHALL retain only its phase adapter behavior around the shared protocol, including its progress plan, artifact-feedback or artifact-gate parameters, phase-specific options and extensions, worker-specific reconstruction fields, and terminal navigation. Removing duplicated protocol text SHALL NOT remove or relocate those adapter responsibilities into the shared contract.

#### Scenario: spec adapter remains spec-specific

- **WHEN** the spec coordinator consumes the shared protocol
- **THEN** it SHALL retain the canonical three-step progress plan, spec artifact feedback handling, proposal/spec completion behavior, and spec terminal navigation
- **AND** it SHALL continue to dispatch exactly the two-string worker envelope and preserve the spec worker's no-design/no-tasks scope

#### Scenario: non-spec adapters remain phase-specific

- **WHEN** a design, implementation, review, security, performance, or accessibility coordinator consumes the shared protocol
- **THEN** it SHALL retain its own progress plan, permitted nonterminal extensions, phase gates or options, reconstruction fields, and terminal navigation
- **AND** it SHALL not inherit another phase's adapter behavior

### Requirement: shared lifecycle semantics remain closed and additive

The single-sourced protocol SHALL preserve the existing lifecycle semantics: terminal statuses SHALL remain exactly `completed`, `needs_input`, `failed`, and `cancelled`; design notices SHALL remain design-only; progress events SHALL remain additive and nonterminal; changed files SHALL remain an ordered duplicate-free union across all reported results; same-worker continuation SHALL precede at most one replacement reconstruction; and binding identifiers and artifact contents SHALL remain outside worker-authored payloads.

#### Scenario: terminal and nonterminal results remain distinguishable

- **WHEN** a routed worker returns a terminal result, design notice, or progress event
- **THEN** the coordinator SHALL validate and route it according to the shared lifecycle contract
- **AND** a notice or progress event SHALL never be treated as a terminal lifecycle status
- **AND** the run SHALL still close with exactly one terminal lifecycle status

#### Scenario: changed-file and reconstruction state survives continuation

- **WHEN** a worker reports changed files before feedback, progress, continuation, or replacement
- **THEN** the coordinator SHALL preserve every path in first-seen order through the terminal result
- **AND** a replacement worker SHALL receive only the original envelope and complete coordinator-supplied reconstruction fields, never the prior worker journal or artifact contents

### Requirement: coordinator safety literals remain unchanged

The single-sourcing refactor SHALL preserve the Isolation Mode block and each routed coordinator's MANDATORY STOP literal byte-for-byte. Removing duplicated protocol prose SHALL NOT alter, relocate, or reword either safety surface in any of the seven routed coordinator bodies.

#### Scenario: safety surfaces survive protocol extraction

- **WHEN** the common protocol prose is replaced with references to the shared contracts
- **THEN** the Isolation Mode block in each routed coordinator SHALL remain byte-identical to its pre-refactor content
- **AND** the MANDATORY STOP literal in each routed coordinator SHALL remain byte-identical to its pre-refactor content

### Requirement: routed behavior remains harness-parity safe

The shared coordinator protocol SHALL remain harness-neutral and SHALL be consumed identically by the Claude Code and opencode routed paths. This change SHALL NOT require manifest projection changes or introduce a second harness-specific copy of the common coordinator protocol.

#### Scenario: both harnesses use the same neutral protocol

- **WHEN** Claude Code and opencode invoke any of the seven routed phases
- **THEN** both paths SHALL obtain the same shared coordinator protocol and phase adapter semantics from the neutral SAI sources
- **AND** harness-specific bindings SHALL remain responsible only for their existing dispatch and continuation mechanics

#### Scenario: installation projection stays unchanged

- **WHEN** the single-source coordinator wording is updated
- **THEN** the install manifest and its harness projections SHALL require no change for this capability
- **AND** the existing install and routed-worker parity checks SHALL remain applicable
