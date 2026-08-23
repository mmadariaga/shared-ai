# accessibility-step-gated-delivery Specification

## Purpose
TBD - created by syncing change audit-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Accessibility Audit Carved Step Library

The accessibility command SHALL deliver its audit instruction mass through
a carved `sai/commands/accessibility/steps/` library — `common.md` plus one
file per non-fileless plan step (`map-ui-framework`,
`resolve-static-audit`, `resolve-runtime-audit`,
`close-accessibility-outcome`) — while the original monolithic
`instructions.md` remains in place untouched beside it.

#### Scenario: Step files name their active step

- **WHEN** any file under `sai/commands/accessibility/steps/` other than `common.md` is read
- **THEN** it names exactly its own active step id in an `Active step:` declaration

### Requirement: Accessibility Coordinator Static Step Pointer Map

The accessibility coordinator SHALL declare a static optional
`step_pointer_map` covering exactly the five declared plan ids in plan
order, with the leading `resolve-accessibility-scope` entry marked
fileless, and the map SHALL NOT be carried in the dispatch envelope or any
reconstruction field.

#### Scenario: Map coverage matches the plan

- **WHEN** the coordinator's declared map rows are compared against the declared progress plan
- **THEN** every plan id appears exactly once in plan order with `resolve-accessibility-scope` mapped to none and the rest to their step files

### Requirement: Accessibility Coordinator Pointer Continuations

The accessibility coordinator SHALL send every progress-event continuation as
exactly two lines whose second line is the deterministic `Active step:`
pointer derived from the first declared step still unmarked in plan order,
and SHALL carry no pointer line on continuations that are not
progress-event continuations; replacement reconstruction fields SHALL
include `active_step_id`.

#### Scenario: Replacement reconstruction restores the active step

- **WHEN** a departing accessibility worker is replaced mid-run
- **THEN** the replacement reconstruction fields include the departed worker's `active_step_id` and the replacement's first continuation carries the correct pointer line for that step

### Requirement: Accessibility Worker Active Step Execution

The accessibility worker SHALL load `steps/common.md` at dispatch as part
of its sealed initial surface, run the fileless
`resolve-accessibility-scope` step from that surface before the first pointer,
and execute ONLY the step named by the most recent `Active step:` pointer
line — never prefetching, opening, or following any other step instruction
file; a legitimately skipped runtime-audit gate SHALL still report its
milestone and advance past its step.

#### Scenario: Runtime gate skip advances the pointer

- **WHEN** the applicability gate resolves the runtime check as legitimately skipped
- **THEN** the worker reports the `resolve-runtime-audit` milestone completed and the next delivered pointer names `close-accessibility-outcome`
