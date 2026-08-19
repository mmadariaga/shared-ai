# apply-phase-adapter-extraction Specification

## Purpose
Extract reusable apply phase behavior from the standalone invocation shell while preserving direct apply behavior and enabling chained composition.

## Requirements

### Requirement: Apply standalone shell owns invocation-only concerns
The apply standalone shell SHALL own prerequisite checks, change-picker resolution, standalone `--fast-track` parsing and normalized signal activation, and the pinned standalone completion action. Chained activation SHALL skip those shell concerns and receive the resolved change and fast-track signal from the supervising composition.

#### Scenario: Chained activation skips shell concerns
- **WHEN** a consumer loads the reusable apply adapter for a chained activation
- **THEN** it SHALL skip prerequisite checks, change-picker resolution, and fast-track parsing
- **AND** it SHALL retain access to the shell-owned standalone completion action

### Requirement: Apply phase adapter owns reusable behavior
The reusable adapter SHALL own the phase-adapter field set, Step projection, change-name injection, routing, dispatch-plan selection, scratch cleanup, coordinator verification, recovery diagnosis, reports, appendices, commit authorization, and fast-track branch behavior. Shared lifecycle validation, progress marking, changed-file aggregation, recovery budgeting, and continuation control SHALL remain in the shared runner.

#### Scenario: Phase-owned behavior is available
- **WHEN** the apply adapter is active for a resolved change
- **THEN** its declared phase behaviors and parameterized terminal navigation SHALL be available
- **AND** shared lifecycle mechanics SHALL remain runner-owned

### Requirement: Parameterized apply terminal navigation
Apply `terminal_navigation` SHALL bind positionally to standalone completion for direct or final apply and to the authorized composition transition for non-final apply. Completion gates SHALL remain unchanged.

#### Scenario: Non-final apply transitions
- **WHEN** apply is a non-final phase in an ordered composition and its gates pass
- **THEN** it SHALL invoke only the authorized transition
- **AND** it SHALL not print the standalone completion message

#### Scenario: Final apply closes the invocation
- **WHEN** direct or final chained apply satisfies all completion conditions
- **THEN** it SHALL print exactly `Implementation applied. Run `/sai-5-review {name}` in a new chat when ready.`
- **AND** the invocation SHALL stop

### Requirement: Single normative adapter surface
Normative apply routing, dispatch-plan selection, checklist execution, and scratch-cleanup rules SHALL have one normative home on the reusable adapter surface; duplicate equal-authority copies SHALL not remain across the apply cards.

#### Scenario: Routing and cleanup have one home
- **WHEN** extraction is complete
- **THEN** the routing STOP and exact scratch-cleanup trace rules SHALL each have one normative home

### Requirement: Behavior-preserving standalone commands
The extraction SHALL preserve direct `/sai-4-apply` and `/sai-3-implement` inputs, gates, lifecycle behavior, artifacts, worker blindness rules, and completion messages. It SHALL not modify explore's inline transition or relocate the shared runner.

#### Scenario: Direct apply remains unchanged
- **WHEN** a user invokes direct apply after extraction
- **THEN** prerequisite handling, execution, gates, commits, and completion SHALL remain unchanged

#### Scenario: Direct implement remains unchanged
- **WHEN** a user invokes direct implement after extraction
- **THEN** its inputs, lifecycle, artifacts, and completion SHALL remain unchanged

### Requirement: Existing apply tests gate preservation
Existing apply-referencing and shared-runner harness tests SHALL remain the primary verification gate; refactor-only tests SHALL not replace them.

#### Scenario: Existing harness remains the gate
- **WHEN** implementers validate extraction
- **THEN** they SHALL run the existing apply and shared-runner tests
