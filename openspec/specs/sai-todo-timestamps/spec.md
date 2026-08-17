# Sai Todo Timestamps Specification

## Purpose

Define closure-only `HH:mm` milestone stamps on routed progress task lists, sourced from worker lifecycle payloads without coordinator clock access.

## Requirements

### Requirement: Stamp annotation is decorative

The neutral task-list policy SHALL define a milestone stamp as a decorative annotation that does not change a step's stable id, label, plan order, or derived state.

#### Scenario: A stamped step keeps its identity
- **WHEN** a completed step receives a milestone stamp
- **THEN** its declared id, label, order, and completed state remain unchanged.

### Requirement: All routed progress plans use payload-sourced closure stamps

Milestone stamps SHALL apply to every routed phase progress plan marked from worker progress events, including the spec, design, implementation, review, security, performance, and accessibility plans. The `sai-explore` Idea Progress List and `/sai-4-apply` run-start step projection SHALL remain unstamped.

#### Scenario: An audit plan renders a completed step
- **WHEN** a review, security, performance, or accessibility progress result marks a declared step
- **THEN** the completed step receives the marking result's `emitted_on` `HH:mm` value.

#### Scenario: Apply projection renders
- **WHEN** apply projects implementation headings at run start
- **THEN** the projection carries no milestone stamps even when RED or GREEN results are timestamped.

### Requirement: Stamps are attached only at completion

The coordinator SHALL attach exactly one `HH:mm` stamp only when a progress-plan step renders `completed`. The value SHALL be read directly from the `emitted_on` of the progress event or terminal completed result that marked the step, without timezone conversion, fallback, inheritance, or coordinator wall-clock acquisition.

#### Scenario: Progress event marks steps
- **WHEN** a progress event reports one or more declared step ids
- **THEN** each newly completed step receives the event's `HH:mm` value and no pending or in-progress step receives a stamp.

#### Scenario: Terminal reconciliation closes steps
- **WHEN** a terminal completed result closes remaining steps through reconciliation
- **THEN** each reconciled step receives that terminal result's `HH:mm` value.

### Requirement: Unsuccessful results preserve the rendered list

`needs_input`, `failed`, and `cancelled` results SHALL leave the progress list and its stamps exactly as last rendered, without clearing, adding, or recomputing stamps.

#### Scenario: Worker pauses or stops
- **WHEN** a worker returns `needs_input`, `failed`, or `cancelled`
- **THEN** the coordinator leaves all existing states and stamps unchanged.

### Requirement: Worker-authored timestamps replace coordinator clock plumbing

Every worker SHALL author `emitted_on` at closed-payload composition time in `YYYY-MM-DDTHH:MM:SS±HH:MM` form. Coordinators SHALL validate and forward it verbatim, and SHALL not call `date`, `Get-Date`, or any other wall-clock command for stamps.

#### Scenario: A routed wrapper is inspected
- **WHEN** a Claude planning wrapper or routed coordinator is inspected
- **THEN** it uses the common read-only tool scope without a `Bash(date:*)` exception because stamps come from payloads.
