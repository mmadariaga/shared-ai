# Implementation Coordinator Specification

## Purpose

Define the coordination boundary, I/O isolation, and user-facing result handling responsibilities of the implementation coordinator that dispatches work to the implementation-planning worker.

## Requirements

### Requirement: Harness adapter dispatch seam
The Claude Code and opencode command wrappers SHALL select the shared coordinator entry path, while the Copilot command wrapper SHALL select the existing inline implementation entry path and SHALL NOT consume the shared coordinator instructions as its execution path. The routed prerequisite and change-picker behavior SHALL execute in the worker; the preserved Copilot inline body SHALL retain that behavior for Copilot.

#### Scenario: Harness-specific entry selection
- **WHEN** `/sai-3-implement` is invoked under Claude Code
- **THEN** its wrapper SHALL enter the coordinator-to-worker dispatch seam

#### Scenario: Opencode coordinator entry selection
- **WHEN** `/sai-3-implement` is invoked under opencode
- **THEN** its wrapper SHALL enter the coordinator-to-worker dispatch seam

#### Scenario: Copilot inline entry selection
- **WHEN** `/sai-3-implement` is invoked under GitHub Copilot
- **THEN** its wrapper SHALL bypass that seam and continue through the existing inline implementation path with the current prerequisite and change-picker behavior

### Requirement: Coordinator dispatch boundary
The `/sai-3-implement` coordinator SHALL construct a normalized invocation envelope containing both `wrapper_echo_value` (the non-empty `**Change-name argument:** <value>` wrapper-echo value, or empty when absent) and `arguments_value` (the raw `$ARGUMENTS` value, including flags). It SHALL pass that envelope unchanged to one implementation-planning worker, SHALL preserve wrapper-echo precedence for the worker, and SHALL NOT run prerequisite checks, query OpenSpec, execute change-picker logic, resolve the change name, or perform technical planning itself.

#### Scenario: Raw implementation invocation
- **WHEN** a user invokes `/sai-3-implement` with a change name, no change name, or supported flags
- **THEN** the coordinator SHALL dispatch one implementation-planning worker with both invocation sources in the normalized envelope, the harness binding SHALL capture the dispatch identifier outside the worker-authored payload, and the coordinator SHALL await the binding-augmented result

#### Scenario: Opencode wrapper-echo precedence
- **WHEN** the opencode wrapper-echo value is non-empty and `$ARGUMENTS` is empty or contains a different value
- **THEN** the coordinator SHALL forward both values and the worker SHALL treat `wrapper_echo_value` as the resolved change-name source without scanning the parent conversation

### Requirement: Coordinator I/O isolation
The coordinator SHALL NOT run prerequisite checks or change-picker queries, read the codebase, OpenSpec artifacts, or implementation audit files, or write `implementation.md` or any other planning artifact.

#### Scenario: Worker-owned technical work
- **WHEN** the implementation phase needs prerequisites, artifact contents, codebase context, or a planning write
- **THEN** the coordinator SHALL leave that operation to the worker rather than performing it directly

### Requirement: User-facing result handling
The coordinator SHALL preserve the existing user communication and MANDATORY STOP behavior while reporting the worker's concise structured summary and handling completed, needs_input, failed, and cancelled outcomes. The harness binding SHALL augment `needs_input` with coordinator-owned continuation metadata captured at dispatch. The coordinator SHALL present the worker's question through the harness-native picker, forward the selected answer to the same worker using that metadata, asynchronously await the next structured payload when the worker runs in the background, and re-present the request when the worker rejects an invalid response.

#### Scenario: Worker reports completion
- **WHEN** the worker returns `completed`
- **THEN** the coordinator SHALL communicate the summary, identify changed files, and fire the existing MANDATORY STOP without adding technical planning content

#### Scenario: Worker requests input
- **WHEN** the binding delivers `needs_input` with a worker-authored question and closed option set plus coordinator-owned continuation metadata
- **THEN** the coordinator SHALL present those options through Claude Code's native option picker or opencode's native option picker, forward the selected value to the same worker session, and await its next structured payload without starting a second worker

#### Scenario: Invalid input is rejected
- **WHEN** the worker returns `needs_input` because a forwarded answer is invalid
- **THEN** the coordinator SHALL not start a second worker and SHALL present the worker's updated question and option set again

#### Scenario: User declines cleanly
- **WHEN** the worker returns `cancelled` because the user deliberately declined a decision whose existing semantics terminate the invocation, such as a one-change selection
- **THEN** the coordinator SHALL report a clean stop without claiming planning completion, SHALL identify changed files, and SHALL not fire the completed-planning MANDATORY STOP path
