# Coordinator Protocol Single Source Specification

## Purpose

Define the single-sourced lifecycle and result-loop protocol consumed by the seven routed phase coordinators, so the shared closed-outcome, changed-file, reconstruction, and progress-event mechanics live in the shared Orchestration Core contracts instead of being restated per phase.

## Requirements

### Requirement: routed coordinators consume the shared lifecycle protocol

The seven routed phase coordinators SHALL consume the phase-neutral result-loop and lifecycle mechanics from `sai/orchestration/command-runner.md` and `sai/orchestration/worker-core.md` instead of restating those mechanics locally. The shared mechanics include closed lifecycle outcomes, changed-file unioning, continuation and replacement reconstruction, and progress-event handling. The routed coordinator bodies themselves SHALL NOT carry a Fetch directive for either orchestration contract: the harness boot adapter loads `@sai/orchestration/command-runner.md` once before card selection, and worker-authored lifecycle content is loaded by the routed workers through their bindings, keeping coordinator bodies artifact-blind dispatch routers.

#### Scenario: shared protocol is the single source

- **WHEN** a maintainer changes a shared result-loop, lifecycle outcome, changed-file union, reconstruction, or progress-event rule
- **THEN** the routed coordinators SHALL reference the updated shared contract without requiring equivalent normative protocol text to be edited in each phase coordinator

#### Scenario: all routed phase coordinators reference the contract

- **WHEN** any of the nine routed coordinator bodies is inspected (the seven phase coordinators plus apply and build)
- **THEN** no body SHALL contain its own Fetch directive for `sai/orchestration/command-runner.md` or `sai/orchestration/worker-core.md`
- **AND** no body SHALL locally redefine the common closed-outcome, changed-file, reconstruction, or progress-event mechanics

#### Scenario: boot owns the runner fetch

- **WHEN** a routed invocation boots under either supported harness
- **THEN** the boot adapter loads `@sai/orchestration/command-runner.md` exactly once, before card selection, and the selected coordinator card adds no second fetch of it

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

### Requirement: Shared result loop routes declared extensions

The shared coordinator protocol SHALL validate each adapter-declared nonterminal extension, add its `changed_files` to the invocation union, invoke the declared coordinator handler, and resume only through the handler's authorized same-worker continuation.

#### Scenario: Merge extension uses the shared loop

- **WHEN** the merge adapter declares `conflict_detected`
- **THEN** the runner validates and routes that extension without making the merge coordinator duplicate common lifecycle mechanics

#### Scenario: Extension does not invent interaction

- **WHEN** the shared loop receives a nonterminal extension
- **THEN** it does not infer a question, answer, or mutation from the extension payload

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

Each routed coordinator's MANDATORY STOP literal SHALL remain byte-for-byte identical. Clean-session enforcement SHALL NOT live in the coordinator bodies: the per-card `# Isolation Mode` block is retired from every routed coordinator body (the seven phase coordinators plus apply and build), including the spec coordinator's inline "Preserve Isolation Mode." sentence, and each harness boot adapter's clean-session preamble is the sole mechanism that discards prior conversational context at invocation start.

#### Scenario: safety literals survive protocol extraction

- **WHEN** the common protocol prose is replaced with references to the shared contracts
- **THEN** the MANDATORY STOP literal in each routed coordinator SHALL remain byte-identical to its pre-refactor content

#### Scenario: isolation enforcement lives in the boot preamble only

- **WHEN** any routed coordinator card under `sai/commands/` is read after this change
- **THEN** it contains no `# Isolation Mode` block and no inline clean-session sentence
- **AND** both harness boot adapters carry the byte-identical clean-session preamble line immediately before the command-runner fetch

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

### Requirement: Single-source technical instruction ownership

The coordinator cards SHALL retain only routing and adapter responsibilities, while `worker.md`, `steps/common.md`, and the coordinator-selected step file SHALL provide the authoritative technical instruction surface without duplicated lifecycle or planning guidance.

#### Scenario: Active worker instruction surface is loaded

- **WHEN** the routed implementation worker begins technical execution
- **THEN** it follows the common baseline and selected step instructions while the coordinator handles lifecycle routing separately.
