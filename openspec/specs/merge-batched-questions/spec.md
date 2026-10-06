# merge-batched-questions Specification

## Purpose
Defines how `/sai-merge` groups its closed decisions into batched user trips (Batch 1 before the launch, Batch 2 on the first conflict) and the batch shape the worker-report validator accepts.

## Requirements

### Requirement: Pre-merge Batch 1 batches dirty, method, and branch in one trip
Batch 1 SHALL present dirty (only when dirty), three-option method, and branch together in normal mode and dirty plus branch in fast-track with method pinned to `merge`, with all-or-nothing semantics where Dirty=no discards the batch other answers and closes without mutating, and SHALL declare no conditional items and no squash gate outside batches.
#### Scenario: Batch 1 carries three-option method without squash gate
- **WHEN** Batch 1 renders in normal mode with the three method labels available
- **THEN** method and branch answers arrive together in one trip with no post-batch squash question
#### Scenario: Dirty-no aborts the batch
- **WHEN** the user answers Dirty=no in Batch 1
- **THEN** the run discards method and branch answers and closes without mutation

### Requirement: Conflict Batch 2 batches language and scope in one trip

Batch 2 SHALL present only the coordinator-owned canonical language question in both normal and fast-track modes. The worker SHALL perform three-version inspection and category classification before the language hand-off, and SHALL author the global strategy over every affected conflict file in the selected language. No scope item, eligible-scope set, or scope-selection answer SHALL be produced.

#### Scenario: Batch 2 resolves in one trip

- **WHEN** a conflict is detected and Batch 2 is presented
- **THEN** the language answer arrives in one same-worker continuation and analysis proceeds over the full affected conflict set without a scope answer

### Requirement: Batch v1 shape keeps singular valid
A needs_input carrying questions:[{id, question, options}] SHALL be treated as a batch with stable ordered ids and closed questions only with no conditional items, while absence of questions SHALL keep the singular question/options form valid for backward compatibility.
#### Scenario: Singular still validates
- **WHEN** a worker returns singular question/options with no questions field
- **THEN** validation accepts it as before

### Requirement: Validator dually validates singular and batch v1
The worker-report validator SHALL accept the singular form and the batch v1 form, SHALL reject duplicate ids, empty questions arrays, and empty options arrays (batch v1 carries closed questions only), and SHALL preserve order and exact values.
#### Scenario: Duplicate batch ids rejected
- **WHEN** a batch carries duplicated scope ids
- **THEN** validation fails with a duplicated-id error

### Requirement: Picker fallback and abandonment preserve order
When a batch exceeds the harness picker capacity the coordinator SHALL render it as plain text preserving every item's order and exact values, and a partial abandonment SHALL forward nothing.
#### Scenario: Oversize batch falls back
- **WHEN** a batch exceeds picker capacity
- **THEN** it renders as plain text with order and values intact

### Requirement: Strategy, squash, and authorization stay in own trips

In normal mode, the global strategy confirmation SHALL remain its own trip with apply/revise/decline choices, and open revision requests SHALL run in their own rounds. No separate squash gate SHALL exist in any mode. Fast-track SHALL retain language selection but SHALL validate and present each complete strategy before automatic application without a strategy-confirmation trip or fabricated answer. Local finalization SHALL execute under command-local invocation authorization without an authorization trip in either mode.

#### Scenario: No squash trip remains

- **WHEN** a merge run completes Batch 1 with any method in any mode
- **THEN** the flow proceeds without a squash trip or local-finalization approval trip, retaining a separate strategy-confirmation trip only in normal mode

#### Scenario: Fast-track keeps language mandatory

- **WHEN** fast-track is active on a conflicted merge
- **THEN** Batch 2 carries language only, full resolution scope is fixed, and each validated complete strategy is presented before automatic application without a confirmation question
