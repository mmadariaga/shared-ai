# security-step-gated-delivery Specification

## Purpose
TBD - created by syncing change audit-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Security Audit Carved Step Library

The security command SHALL deliver its audit instruction mass through a
carved `sai/commands/security/steps/` library — `common.md` plus one file
per non-fileless plan step (`discover-module-map`, `resolve-sast-analysis`,
`resolve-sca`, `close-security-outcome`) — while the original monolithic
`instructions.md` remains in place untouched beside it.

#### Scenario: Step files name their active step

- **WHEN** any file under `sai/commands/security/steps/` other than `common.md` is read
- **THEN** it names exactly its own active step id in an `Active step:` declaration

### Requirement: Security Coordinator Static Step Pointer Map

The security coordinator SHALL declare a static optional `step_pointer_map`
covering exactly the five declared plan ids in plan order, with the leading
`resolve-security-scope` entry marked fileless, and the map SHALL NOT be
carried in the dispatch envelope or any reconstruction field.

#### Scenario: Map coverage matches the plan

- **WHEN** the coordinator's declared map rows are compared against the declared progress plan
- **THEN** every plan id appears exactly once in plan order with `resolve-security-scope` mapped to none and the rest to their step files

### Requirement: Security Coordinator Pointer Continuations

The security coordinator SHALL send every progress-event continuation as
exactly two lines whose second line is the deterministic `Active step:`
pointer derived from the first declared step still unmarked in plan order,
and SHALL carry no pointer line on continuations that are not
progress-event continuations; replacement reconstruction fields SHALL
include `active_step_id`.

#### Scenario: Non-progress continuation keeps the active step

- **WHEN** a picker answer is forwarded as a non-progress continuation
- **THEN** the payload carries no pointer line and the worker retains its previously named active step

### Requirement: Security Worker Active Step Execution

The security worker SHALL load `steps/common.md` at dispatch as part of its
sealed initial surface, run the fileless `resolve-security-scope` from that
surface before the first pointer, and execute ONLY the step named by the
most recent `Active step:` pointer line — never prefetching, opening, or
following any other step instruction file; a legitimately skipped gated
stage SHALL still report its milestone and advance past its step without
executing the step file.

#### Scenario: Gated SCA skip advances the pointer

- **WHEN** no dependency manifest changed in the diff and the SCA gate resolves as legitimately skipped
- **THEN** the worker reports the `resolve-sca` milestone completed and the next delivered pointer names the following step without `resolve-sca.md` executing
