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
Batch 2 SHALL present language (coordinator-owned canonical question) + scope (worker-provided eligible set, English/ambient wording) in normal mode and language only in fast-track with scope auto-full, with early three-version classification performed before the language hand-off only to filter scope options and the global strategy authored once for the chosen scope in the chosen language.
#### Scenario: Batch 2 resolves in one trip
- **WHEN** a conflict is detected and Batch 2 is presented
- **THEN** language and scope answers arrive together in one same-worker continuation

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
The global strategy confirmation and authorization SHALL each stay in their own trip, no squash gate SHALL exist in any mode, open requests SHALL run in their own rounds, and fast-track SHALL still require language and strategy confirmation while never auto-selecting ours, theirs, or synthesis.
#### Scenario: No squash trip remains
- **WHEN** a merge run completes Batch 1 with any method in any mode
- **THEN** the flow proceeds without a squash trip and keeps strategy and authorization each in their own trip
#### Scenario: Fast-track keeps language mandatory
- **WHEN** fast-track is active on a conflicted merge
- **THEN** Batch 2 carries language only with scope auto-full and strategy confirmation remains required
