# orchestration-core Specification

## Purpose
TBD - created by archiving change extract-sai-orchestration-core. Update Purpose after archive.
## Requirements
### Requirement: Shared coordinator contract
The canonical orchestration source SHALL define one shared coordinator contract for lifecycle result validation, progress-event handling, changed-file aggregation — including every path reported on progress events, added in first-seen order and never reset by them — same-worker continuation, replacement-worker fallback, and terminal result reporting. Routed phase coordinators SHALL apply that contract rather than maintain independent copies of those mechanics. Each routed phase SHALL supply a phase adapter containing its initial worker envelope, binding dispatch and continuation operations, permitted nonterminal extensions and handlers, an optional static ordered progress plan declaration, replacement-worker reconstruction fields, and terminal navigation action. The adapter SHALL NOT reimplement payload validation, progress marking, changed-file union, continuation-first ordering, or fallback control flow.

#### Scenario: Routed phases use the shared contract
- **WHEN** the design or implementation planning coordinator receives a worker lifecycle result
- **THEN** it SHALL process the result through the same canonical coordinator contract
- **AND** the shared contract SHALL invoke the phase adapter only at the declared extension points
- **AND** phase-specific navigation SHALL remain in the adapter rather than a duplicated lifecycle loop

#### Scenario: Progress events flow through the contract

- **WHEN** a worker returns a nonterminal progress event
- **THEN** the shared contract SHALL mark the reported step ids in the adapter-declared plan and continue the same worker through the binding

#### Scenario: Progress changed files join the union

- **WHEN** a progress event reports changed files
- **THEN** the shared contract SHALL add every reported path to the invocation-scoped union in first-seen order
- **AND** SHALL never reset the union on a progress event

### Requirement: Separate phase worker contracts
The orchestration source SHALL retain separate design-worker and implementation-worker contracts that layer phase policy over the shared worker lifecycle. The workers SHALL NOT be merged into a conditional all-phase prompt.

#### Scenario: Phase behavior remains isolated
- **WHEN** a design-only or implementation-only rule is authored
- **THEN** it SHALL reside in the corresponding phase worker contract
- **AND** it SHALL NOT alter the other phase's worker behavior

### Requirement: Behavior-preserving extraction
Consuming the shared orchestration contracts SHALL preserve existing command inputs, lifecycle payload fields, terminal statuses, notices, continuation and fallback semantics, changed-file ordering, user gates, artifact writes, and completion messages. The extraction SHALL NOT change an OpenSpec artifact schema.

#### Scenario: Existing invocation crosses the new seam
- **WHEN** an existing routed planning invocation is executed after the extraction
- **THEN** its observable workflow behavior and durable artifacts SHALL match the behavior required before the extraction
- **AND** no new user decision or artifact field SHALL be introduced by the refactor

#### Scenario: Claude Code routed invocation is preserved
- **WHEN** a Claude Code design or implementation wrapper invokes a routed planning phase
- **THEN** its runtime skill SHALL resolve the canonical Claude binding, dispatch the existing named Claude planning agent, and continue by captured agent ID

#### Scenario: opencode routed invocation is preserved
- **WHEN** an opencode design or implementation wrapper invokes a routed planning phase
- **THEN** its runtime skill SHALL resolve the canonical opencode binding, dispatch the existing named planning worker through `task`, and continue by captured task ID

#### Scenario: Copilot inline invocation is preserved
- **WHEN** a GitHub Copilot design or implementation wrapper invokes a planning phase
- **THEN** it SHALL resolve the existing inline command body and SHALL NOT enter the routed coordinator lifecycle

