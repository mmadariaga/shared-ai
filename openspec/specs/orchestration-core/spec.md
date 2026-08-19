# orchestration-core Specification

## Purpose
TBD - created by archiving change extract-sai-orchestration-core. Update Purpose after archive.
## Requirements
### Requirement: Shared coordinator contract
The canonical orchestration source SHALL define one shared coordinator contract for lifecycle result validation, progress-event handling, changed-file aggregation — including every path reported on progress events, added in first-seen order and never reset by them — same-worker continuation, bounded same-worker recovery, replacement-worker fallback, and terminal result reporting. Routed phase coordinators SHALL apply that contract rather than maintain independent copies of those mechanics. Each routed phase SHALL supply a phase adapter containing its initial worker envelope, binding dispatch and continuation operations, permitted nonterminal extensions and handlers, an optional static ordered progress plan declaration, an optional static `recovery_policy` declaration, replacement-worker reconstruction fields, and terminal navigation action. The shared runner SHALL own the fixed recovery acknowledgement `continue_after_recovery`; it SHALL not be an additional phase-adapter field. Recovery eligibility SHALL be limited by the `Recovery eligibility and worker veto` requirement in the `bounded-worker-recovery` capability, rather than by the mere presence of `recovery_policy`. The adapter SHALL NOT reimplement payload validation, progress marking, changed-file union, recovery budgeting, continuation-first ordering, or fallback control flow. When a supervising invocation declares an ordered sequence of phase adapters, the shared contract SHALL execute that sequence under the three rules of `Chained phase composition`; optional `progress_plan` and `recovery_policy` declarations are immutable for the active adapter segment and are rebound when the next adapter activates. A one-adapter invocation keeps segment scope identical to the pre-composition contract.

#### Scenario: Routed phases use the shared contract
- **WHEN** a routed coordinator receives a worker lifecycle result
- **THEN** it SHALL process the result through the same canonical coordinator contract
- **AND** the shared contract SHALL invoke the phase adapter only at the declared extension points
- **AND** phase-specific navigation SHALL remain in the adapter rather than a duplicated lifecycle loop

### Requirement: Chained phase composition
The shared coordinator contract SHALL permit one invocation to execute an ordered sequence of phase adapters without introducing a new orchestration file or relocating `sai/orchestration/command-runner.md`. The composition SHALL execute adapters strictly in list order, rebind segment fields on activation, scope each recovery pool to its active segment with a fresh three-attempt pool for each eligible segment, and preserve the invocation-scoped changed-files union across transitions. A non-final successful adapter SHALL transition only to the consecutive successor using its authorized envelope; it SHALL not infer successors from worker output. Chained Isolation Mode SHALL preserve supervisor state, while worker input remains phase-isolated. A final or sole adapter SHALL provide the invocation-closing terminal behavior; failed, cancelled, malformed payloads, and malformed transitions SHALL close without advancing.

#### Scenario: Ordered sequence runs through the shared runner
- **WHEN** a supervising invocation declares two or more phase adapters in order
- **THEN** the shared contract SHALL execute each adapter segment in declaration order and rebind that segment's fields
- **AND** it SHALL preserve the changed-files union across transitions

#### Scenario: Non-final completion transitions only to the successor
- **WHEN** a non-final adapter completes successfully with an authorized transition
- **THEN** the shared contract SHALL activate only the adapter at position `i + 1`
- **AND** it SHALL not print the non-final adapter's standalone completion or infer a successor from worker text

#### Scenario: Segment recovery pools are independent
- **WHEN** two consecutive segments both declare `recovery_policy: true`
- **THEN** each segment SHALL receive its own fresh three-attempt recovery pool
- **AND** the later segment SHALL not inherit a depleted budget

#### Scenario: Single-phase invocation remains unchanged
- **WHEN** an invocation supplies exactly one phase adapter
- **THEN** shared runner behavior and standalone terminal navigation SHALL match the pre-composition one-phase contract

#### Scenario: Progress events flow through the contract

- **WHEN** a worker returns a nonterminal progress event
- **THEN** the shared contract SHALL mark the reported step ids in the adapter-declared plan and continue the same worker through the binding

#### Scenario: Progress changed files join the union

- **WHEN** a progress event reports changed files
- **THEN** the shared contract SHALL add every reported path to the invocation-scoped union in first-seen order
- **AND** SHALL never reset the union on a progress event

#### Scenario: Recovery flows through the contract

- **WHEN** an adapter declares `recovery_policy` and a worker returns an eligible failed outcome under the `bounded-worker-recovery` capability
- **THEN** the shared contract SHALL announce and budget same-worker recovery
- **AND** SHALL continue the worker with the fixed `continue_after_recovery` acknowledgement
- **AND** SHALL never dispatch a replacement worker from that recovery path

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
