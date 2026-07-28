# Inline Coordinator Adapter Specification

## Purpose

Define the shared inline adapter for dispatching the design and implementation phase invocation cores from VS Code prompts.

## Requirements

### Requirement: Shared inline phase dispatch

The inline coordinator adapter SHALL accept a phase marker and SHALL dispatch only `phase: sai-2-design` or `phase: sai-3-implement` to the corresponding phase invocation core.
The adapter SHALL be the sole owner of the inline invocation envelope, phase-specific caller checks, and phase-specific feedback and completion navigation around those cores. The phase cores SHALL remain the technical loading and run shells and SHALL NOT gain duplicate caller navigation through this change.

#### Scenario: Design phase is selected

- **WHEN** an inline entrypoint supplies `phase: sai-2-design`
- **THEN** the adapter SHALL invoke `sai-2-design-core` with the forwarded user arguments in the same inline context

#### Scenario: Implementation phase is selected

- **WHEN** an inline entrypoint supplies `phase: sai-3-implement`
- **THEN** the adapter SHALL invoke `sai-3-implementation-core` with the forwarded user arguments in the same inline context

#### Scenario: Unsupported phase is supplied

- **WHEN** the adapter receives a missing or unsupported phase marker
- **THEN** it SHALL stop without invoking either phase core and SHALL report that the phase selection is invalid

### Requirement: Design behavior remains phase-specific

For `phase: sai-2-design`, the adapter SHALL preserve the current inline design flow, including fast-track parsing, change selection, prerequisite checks, design artifact behavior, feedback gating, and the design completion behavior. The adapter SHALL own the design-side fast-track, selection, prerequisite, feedback, and completion boundaries; `sai-2-design-core` SHALL handle the technical design invocation after those boundaries are satisfied.

#### Scenario: Design invocation preserves its policy boundary

- **WHEN** the design prompt is invoked with a change name and optional fast-track flag
- **THEN** the adapter SHALL invoke the design core for design-specific loading and artifact generation, then retain its adapter-owned feedback and completion boundaries without applying implementation-worker behavior

### Requirement: Implementation behavior remains phase-specific

For `phase: sai-3-implement`, the adapter SHALL preserve the current inline implementation-planning flow, including change selection, prerequisite checks for the proposal, design, and tasks artifacts, implementation artifact behavior, and the implementation completion behavior. The adapter SHALL own the implementation-side selection, prerequisite, feedback, and completion boundaries; `sai-3-implementation-core` SHALL handle the technical implementation-planning invocation after those boundaries are satisfied.

#### Scenario: Implementation invocation preserves its prerequisites

- **WHEN** the implementation prompt is invoked for a change that lacks a required planning artifact
- **THEN** the adapter SHALL stop through the existing prerequisite behavior before invoking implementation planning

### Requirement: VS Code prompts are thin entrypoints

The visible VS Code design and implementation prompt files SHALL remain separate and SHALL contain only the entrypoint metadata, fetch/load behavior, phase marker selection, and argument forwarding needed to invoke the shared inline coordinator adapter. They SHALL NOT duplicate phase-specific orchestration rules.
Each prompt SHALL invoke the adapter with this exact two-line envelope, replacing the phase value for the implementation prompt while preserving the second line verbatim:

    phase: sai-2-design
    arguments: $ARGUMENTS

The adapter SHALL treat the text after `arguments:` as the forwarded request without normalization or invented defaults. A missing `arguments:` line or empty value SHALL be forwarded as an empty request to the selected phase's existing change-selection behavior; a missing or malformed phase line SHALL be rejected before any phase checks or core invocation.

#### Scenario: Design prompt forwards its phase

- **WHEN** a user selects the VS Code design prompt
- **THEN** it SHALL invoke the shared adapter with `phase: sai-2-design` and forward the prompt arguments unchanged

#### Scenario: Implementation prompt forwards its phase

- **WHEN** a user selects the VS Code implementation prompt
- **THEN** it SHALL invoke the shared adapter with `phase: sai-3-implement` and forward the prompt arguments unchanged

#### Scenario: Empty prompt arguments are preserved

- **WHEN** a valid phase envelope contains an empty `arguments:` value
- **THEN** the adapter SHALL forward an empty request and SHALL not invent a change name or alter the phase selection

### Requirement: Inline execution boundary is preserved

The shared adapter SHALL execute design and implementation planning inline in the current VS Code agent context and SHALL NOT introduce routed worker identifiers, worker continuation state, or `subagent_depth` handling.

#### Scenario: Inline design remains single-context

- **WHEN** the design phase is dispatched
- **THEN** no routed worker is created and the phase core runs as the current inline agent

#### Scenario: Inline implementation remains single-context

- **WHEN** the implementation phase is dispatched
- **THEN** no routed worker is created and the phase core runs as the current inline agent

### Requirement: Existing contracts remain compatible

The adapter SHALL preserve the existing phase artifact locations, user feedback gates, and completion messages, and SHALL not alter the separate design and implementation core contracts.

#### Scenario: Design artifacts retain their locations

- **WHEN** the shared adapter completes a design invocation
- **THEN** design-phase artifacts SHALL be written to the existing OpenSpec change locations

#### Scenario: Implementation artifact retains its location

- **WHEN** the shared adapter completes an implementation-planning invocation
- **THEN** the implementation plan SHALL be written to the existing OpenSpec change location

### Requirement: Shared adapter is installable

The installation manifest SHALL add one managed, non-recursive copy projection with source `sai/orchestration/inline-invocation.md`, destination class `sai` and path `orchestration/inline-invocation.md`, and harnesses `copilot`. The projection SHALL use the manifest's content-drift ownership semantics, SHALL be the sole owner of that destination, and SHALL NOT be folded into the routed Claude Code or opencode orchestration projections. Every retained VS Code prompt SHALL resolve this installed path directly.

#### Scenario: Installed VS Code prompts resolve the adapter

- **WHEN** the shared-AI installation is projected for VS Code
- **THEN** both visible phase prompts SHALL resolve the same installed inline adapter without requiring a routed worker binding

#### Scenario: Routed projections do not collide

- **WHEN** the installation manifest is evaluated for Claude Code, opencode, and Copilot
- **THEN** the Copilot-only inline projection SHALL own `orchestration/inline-invocation.md` without overriding or adding the file to either routed worker projection
