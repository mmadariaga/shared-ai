# worker-active-step-execution Specification

## Purpose
TBD - created by archiving change spec-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Worker executes only the coordinator-named active step

The spec-proposal worker SHALL execute only the step file named by the coordinator's most recent `Active step:` pointer line, following that file exactly, and SHALL never prefetch, open, or follow any other step instruction file; step-file paths exist solely as coordinator continuation lines, making the worker contract plus `steps/common.md` the sealed initial surface.

#### Scenario: no prefetch is possible

- **WHEN** the worker begins a run
- **THEN** its initial surface references only `sai/commands/spec/steps/common.md`, and every other step path first appears inside a coordinator continuation line

#### Scenario: steps execute in pointer order

- **WHEN** consecutive progress continuations name different active steps
- **THEN** the worker executes each named step exactly when its pointer arrives, without loading future step files early

### Requirement: prereqs-and-change runs before any pointer

The `prereqs-and-change` step SHALL have no step file of its own: it runs from the worker card plus `common.md` before the first progress event, and the first delivered pointer targets `research`.

#### Scenario: first delivered pointer targets research

- **WHEN** prerequisite checks pass and change resolution completes, and the worker returns the startup progress event for `prereqs-and-change`
- **THEN** the next continuation carries the first pointer line of the run, naming the `research` step

### Requirement: The design worker executes only the coordinator-named active step

The design worker SHALL execute only the step file named by the coordinator's most recent `Active step:` pointer line, following that file exactly, and SHALL never prefetch, open, or follow any other step instruction file; step-file paths exist solely as coordinator continuation lines, and a continuation without a pointer line SHALL leave the active step unchanged in the continuous session.

#### Scenario: steps execute in pointer order

- **WHEN** consecutive progress continuations name different design steps
- **THEN** the worker executes each named step exactly when its pointer arrives, without loading future step files early

#### Scenario: prereqs-resolution precedes the first pointer

- **WHEN** prerequisite checks pass and change resolution completes on the design worker's sealed initial surface
- **THEN** the worker returns the startup progress event for `prereqs-resolution` and the next continuation carries the first pointer line, naming research

### Requirement: The review worker executes only the coordinator-named active step

The review worker SHALL execute only the step file named by the coordinator's most recent `Active step:` pointer line, following that file exactly, and SHALL never prefetch, open, or follow any other step instruction file; step-file paths exist solely as coordinator continuation lines, making the worker contract plus `sai/commands/review/steps/common.md` the sealed initial surface. `resolve-change` SHALL have no step file of its own and SHALL run from that sealed surface before the first progress event, with the first delivered pointer targeting `establish-diff-scope`. A gated stage resolved by legitimate skip SHALL still report its milestone, and the next delivered pointer advances past it without that step file executing.

#### Scenario: review steps execute in pointer order

- **WHEN** consecutive progress continuations name different review steps
- **THEN** the review worker executes each named step exactly when its pointer arrives, without loading future step files early

#### Scenario: legitimately skipped gated stage advances the pointer

- **WHEN** the Pass 11 activation gate resolves as a legitimate skip
- **THEN** the worker reports the `resolve-mutation-analysis` milestone completed and the next delivered pointer names `close-review-outcome` without the mutation protocol executing

### Requirement: The security worker executes only the coordinator-named active step

The security worker SHALL execute only the step file named by the coordinator's most recent `Active step:` pointer line, following that file exactly, and SHALL never prefetch, open, or follow any other step instruction file; step-file paths exist solely as coordinator continuation lines, making the worker contract plus `sai/commands/security/steps/common.md` the sealed initial surface. `resolve-security-scope` SHALL have no step file of its own and SHALL run from that sealed surface before the first progress event, with the first delivered pointer targeting `discover-module-map`. A gated stage resolved by legitimate skip SHALL still report its milestone, and the next delivered pointer advances past it without that step file executing.

#### Scenario: legitimately skipped gated stage advances the pointer

- **WHEN** the manifest-change gate resolves SCA as a legitimate skip
- **THEN** the worker reports the `resolve-sca` milestone completed and the next delivered pointer names `close-security-outcome` without `resolve-sca.md` executing

### Requirement: The performance worker executes only the coordinator-named active step

The performance worker SHALL execute only the step file named by the coordinator's most recent `Active step:` pointer line, following that file exactly, and SHALL never prefetch, open, or follow any other step instruction file; step-file paths exist solely as coordinator continuation lines, making the worker contract plus `sai/commands/performance/steps/common.md` the sealed initial surface. `resolve-performance-scope` SHALL have no step file of its own and SHALL run from that sealed surface before the first progress event, with the first delivered pointer targeting `map-stack-hot-paths`.

#### Scenario: performance steps execute in pointer order

- **WHEN** consecutive progress continuations name different performance steps
- **THEN** the worker executes each named step exactly when its pointer arrives, without loading future step files early

### Requirement: The accessibility worker executes only the coordinator-named active step

The accessibility worker SHALL execute only the step file named by the coordinator's most recent `Active step:` pointer line, following that file exactly, and SHALL never prefetch, open, or follow any other step instruction file; step-file paths exist solely as coordinator continuation lines, making the worker contract plus `sai/commands/accessibility/steps/common.md` the sealed initial surface. `resolve-accessibility-scope` SHALL have no step file of its own and SHALL run from that sealed surface before the first progress event, with the first delivered pointer targeting `map-ui-framework`.

#### Scenario: accessibility steps execute in pointer order

- **WHEN** consecutive progress continuations name different accessibility steps
- **THEN** the worker executes each named step exactly when its pointer arrives, without loading future step files early
