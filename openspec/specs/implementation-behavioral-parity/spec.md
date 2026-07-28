# Implementation Behavioral Parity Specification

## Purpose

Define the behavioral parity requirements that the coordinator-worker refactor SHALL preserve from the existing implementation phase, ensuring that the refactored path produces identical observable behavior.

## Requirements

### Requirement: Implementation artifact parity
The refactor SHALL preserve the current `implementation.md` format, including its task structure, first-run and re-run behavior, and durable source-of-truth role.

#### Scenario: Existing implementation plan rerun
- **WHEN** `/sai-3-implement` is rerun for a change with an existing implementation plan
- **THEN** the worker SHALL preserve the existing plan semantics and apply the current re-run rules rather than regenerating incompatible content

### Requirement: Planning quality parity
The routed worker and the inline Copilot path SHALL preserve the current `implementation.md` planning contract, including first-run and rerun behavior, ordered task coverage, audit-finding ingestion, ADR/DDR evaluation and approved ADR index maintenance, interface conformance, assertion-based RED before minimal GREEN for each testable step, automated verification, correctly encoded human verification, and a STOP & COMMIT marker for each planned step. Planning SHALL write the authoritative artifact but SHALL NOT execute production implementation or mark plan checkboxes complete.

#### Scenario: Testable implementation step is planned
- **WHEN** a selected task has behavior that can be covered automatically
- **THEN** its implementation plan SHALL place a failing assertion-based RED phase before the minimal GREEN implementation and SHALL include commands that verify both phases

#### Scenario: Non-testable human verification is needed
- **WHEN** an observable check cannot be automated economically
- **THEN** the plan SHALL encode that check using the established human-verification convention without inventing a placeholder action checkbox

#### Scenario: ADR or DDR qualifies
- **WHEN** a planning decision is hard to reverse, surprising without context, and has a real trade-off
- **THEN** the phase SHALL preserve the existing approval gate, authorized ADR/DDR write behavior, relationship annotation, and exactly-once ADR index maintenance

### Requirement: Observable command contract parity
The coordinator-worker path SHALL preserve the current prerequisite failures, 0/1/N change-picker behavior, raw argument and flag handling, canonical glossary use, and ADR/DDR approval interaction.

#### Scenario: Prerequisite or change selection failure
- **WHEN** the OpenSpec CLI, `openspec/`, `schema: sai-workflow`, proposal, design, or tasks prerequisite is unavailable, or when change selection cannot resolve a single change
- **THEN** the worker SHALL preserve the existing stop message or change-picker interaction, SHALL return the result through the coordinator when user input is required, and SHALL not write planning artifacts on failure

#### Scenario: Arguments, glossary, and ADR decision
- **WHEN** the invocation includes existing flags, the selected change has a root `GLOSSARY.md`, or an ADR/DDR decision qualifies for the existing approval interaction
- **THEN** the worker SHALL preserve flag semantics, use canonical glossary terms, and request or apply ADR/DDR approval using the existing interaction and approval rules

#### Scenario: Design continue-now entry remains inline
- **WHEN** `/sai-2-design` continues directly into implementation planning in the same chat
- **THEN** it SHALL enter the inline invocation wrapper, execute the shared caller-neutral planning core, and emit the existing MANDATORY STOP exactly once without entering the coordinator-worker dispatch seam

### Requirement: Authorized phase-write parity
The worker SHALL own and preserve every file write currently authorized by the implementation phase, including direct `implementation.md` writes, explicitly approved ADR/DDR creation, and the existing ADR index maintenance cycle; it SHALL report all such files in `changed_files`.

#### Scenario: Approved ADR and index maintenance
- **WHEN** the current implementation phase creates an approved ADR/DDR or updates `docs/adr/0000-INDEX.md`
- **THEN** the worker SHALL perform that write, preserve the existing index rules, and include each resulting path in the structured changed-file list

### Requirement: Stop semantics parity
The routed Claude Code and opencode paths and the inline Copilot path SHALL preserve the implementation phase's no-execution boundary and exactly-once MANDATORY STOP. After `implementation.md` has been durably verified and the terminal path reports completion, the user-facing path SHALL print exactly `Implementation plan done in openspec/changes/{name}/. Review and run `/sai-4-apply {name}` (--fast-track) **in a new chat** when ready.` and SHALL stop immediately. Failed, cancelled, or needs-input outcomes SHALL NOT print that completion message.

#### Scenario: Routed planning completes
- **WHEN** the implementation-planning worker returns a valid `completed` payload after durable verification
- **THEN** the coordinator SHALL report the concise summary and ordered changed files, print the exact completion message once, and stop without executing implementation tasks or modifying project source files

#### Scenario: Inline Copilot planning completes
- **WHEN** the Copilot inline implementation path durably completes the same plan
- **THEN** it SHALL print the same exact completion message once and stop without entering the routed coordinator lifecycle

#### Scenario: Planning does not complete
- **WHEN** the lifecycle status is `needs_input`, `failed`, or `cancelled`
- **THEN** the user-facing path SHALL preserve that outcome and SHALL NOT print the implementation completion message
