# implement-worker-active-step-execution — Spec

## Purpose

TBD - created by archiving change implement-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Worker executes only the coordinator-named active step

The implementation worker SHALL execute only the step instruction file named by the `Active step: <id> — follow <path>` pointer line on a progress-event continuation, SHALL follow that file exactly, and SHALL never prefetch, open, or follow any other step instruction file. Step-file paths SHALL exist solely as coordinator continuation lines; the worker contract plus `steps/common.md` is the sealed initial surface.

#### Scenario: Only the named step file executes

- **WHEN** a progress-event continuation carries one pointer line naming a step file
- **THEN** the worker executes that named step file exactly and does not open any other step instruction file.

### Requirement: Wholesale instruction chain replaced by common.md at dispatch

The implementation worker SHALL replace the wholesale fetch of the invocation chain with a fetch of `sai/commands/implement/steps/common.md` at dispatch, followed by execute-only-the-active-step delivery. `prereqs-resolution` SHALL run from the worker contract plus `common.md` before the first progress event, and the first delivered pointer SHALL target `collapse-implemented-steps`.

#### Scenario: Prereqs resolution runs before the first pointer

- **WHEN** the implementation worker is dispatched
- **THEN** `prereqs-resolution` runs from the worker contract plus `common.md` before the first progress event, and the first delivered pointer names `collapse-implemented-steps`.

### Requirement: Steps never widen the worker contract

Step execution SHALL NOT widen the worker contract: status returns, progress reporting, changed_files accounting, and failure classification SHALL apply unchanged while any step executes.

#### Scenario: Contract behavior is unchanged during step execution

- **WHEN** any step instruction file executes
- **THEN** the worker's status returns, progress reporting, changed_files accounting, and failure classification behave exactly as the worker contract defines.

### Requirement: Active-step instruction authority

The implementation worker SHALL treat `steps/common.md` together with exactly the coordinator-named active step file as the authoritative technical instruction surface for step execution. The worker SHALL NOT prefetch or follow another step instruction file.

#### Scenario: Worker receives an active pointer

- **WHEN** a progress continuation names one active step file
- **THEN** the worker follows the common baseline and that named step file for technical execution.
