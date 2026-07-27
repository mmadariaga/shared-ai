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
The worker SHALL preserve ADR/DDR evaluation, RED -> GREEN planning, applicable interface conformance checks, audit-finding handling, and implementation-plan verification from the current phase.

#### Scenario: Planning checks remain applicable
- **WHEN** the selected change contains the inputs that activate an existing planning check
- **THEN** the worker SHALL apply that check and record the result in `implementation.md` using the existing artifact conventions

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
The coordinator-worker refactor SHALL preserve the current MANDATORY STOP semantics, including stopping after a completed implementation-planning phase and not applying project code during `/sai-3-implement`.

#### Scenario: Completed planning phase
- **WHEN** the worker has written and verified `implementation.md` and returns `completed`
- **THEN** the coordinator SHALL report completion and stop without executing implementation tasks or modifying project source files
