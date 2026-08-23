# performance-step-gated-delivery Specification

## Purpose
TBD - created by syncing change audit-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Performance Audit Carved Step Library

The performance command SHALL deliver its audit instruction mass through a
carved `sai/commands/performance/steps/` library — `common.md` plus one file
per non-fileless plan step (`map-stack-hot-paths`,
`audit-performance-tiers`, `resolve-diagnostics`,
`close-performance-outcome`) — while the original monolithic
`instructions.md` remains in place untouched beside it.

#### Scenario: Step files name their active step

- **WHEN** any file under `sai/commands/performance/steps/` other than `common.md` is read
- **THEN** it names exactly its own active step id in an `Active step:` declaration

### Requirement: Performance Coordinator Static Step Pointer Map

The performance coordinator SHALL declare a static optional
`step_pointer_map` covering exactly the five declared plan ids in plan
order, with the leading `resolve-performance-scope` entry marked fileless,
and the map SHALL NOT be carried in the dispatch envelope or any
reconstruction field.

#### Scenario: Map coverage matches the plan

- **WHEN** the coordinator's declared map rows are compared against the declared progress plan
- **THEN** every plan id appears exactly once in plan order with `resolve-performance-scope` mapped to none and the rest to their step files

### Requirement: Performance Coordinator Pointer Continuations

The performance coordinator SHALL send every progress-event continuation as
exactly two lines whose second line is the deterministic `Active step:`
pointer derived from the first declared step still unmarked in plan order,
SHALL deliver the terminal `Active step: none` line once the plan is fully
marked, and SHALL carry no pointer line on non-progress continuations;
replacement reconstruction fields SHALL include `active_step_id`.

#### Scenario: All-marked plan delivers the terminal pointer

- **WHEN** a progress event marks the last unmarked plan step
- **THEN** the next continuation's pointer line reads `Active step: none — complete remaining work and return your terminal result.`

### Requirement: Performance Worker Active Step Execution

The performance worker SHALL load `steps/common.md` at dispatch as part of
its sealed initial surface, run the fileless `resolve-performance-scope`
from that surface before the first pointer, and execute ONLY the step
named by the most recent `Active step:` pointer line — never prefetching,
opening, or following any other step instruction file.

#### Scenario: Worker ignores unnamed step files

- **WHEN** the current pointer names `audit-performance-tiers`
- **THEN** the worker does not open or follow any other step file in `sai/commands/performance/steps/`
