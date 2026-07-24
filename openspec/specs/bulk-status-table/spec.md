# bulk-status-table Specification

## Purpose

The bulk-status-table capability defines the compact all-changes table that `/sai-status` renders when "See all" is selected in the status-picker. It provides a single overview of all active changes with per-artifact presence indicators, implementation progress, and `Next:` hints, replacing the single-change panel.

## Requirements

### Requirement: See all renders a compact all-changes table

When "See all" is selected in `status-picker.md`, `sai-status` SHALL render a single compact table with one row per active change returned by `openspec list --json`. The table SHALL have one column per sai-workflow artifact in the canonical order — `proposal`, `specs`, `design`, `tasks`, `interfaces`, `implementation`, `review`, `security`, `performance`, `accessibility` — plus an implementation-progress column and a `Next:` hint column. The `pr` artifact SHALL NOT get a column. The table SHALL replace, not accompany, any single-change panel.

#### Scenario: one row per active change
- **WHEN** "See all" is selected and `openspec list --json` returns N active changes
- **THEN** the table has exactly N data rows, one per change, in the order returned by `openspec list --json`

#### Scenario: one column per artifact plus progress and Next
- **WHEN** the bulk table is rendered
- **THEN** it has one column for each of the 10 sai-workflow artifacts in canonical order, one implementation-progress column, and one `Next:` hint column, and no `pr` column

### Requirement: bulk table cells reuse single-change panel semantics

Each artifact cell SHALL be derived exactly as the single-change `sai-status` panel derives it: from `openspec status --change {name} --json`, `done` SHALL render as present and `ready`/`blocked` as absent; an audit artifact (`review`, `security`, `performance`, `accessibility`) whose body contains a `## Not Applicable` heading SHALL render as `N/A`; an absent `interfaces` SHALL NOT be flagged as a problem (ADR 0023). The implementation-progress column SHALL show `checked/total` counted from `- [x]` versus `- [ ]` lines in `implementation.md`, or empty when `implementation.md` is absent. Each row's `Next:` column SHALL be resolved by the same first-match top-to-bottom algorithm as the single-change panel, which requires the row's specs-approval state; the specs cell SHALL therefore distinguish specs that are present-and-approved from present-and-unapproved so the `Next:` hint stays correct.

#### Scenario: artifact presence maps done to present
- **WHEN** a change's `openspec status --json` reports an artifact as `done`
- **THEN** that artifact's cell renders as present, and `ready`/`blocked` artifacts render as absent

#### Scenario: Not-Applicable audit renders N/A
- **WHEN** a change's present audit artifact body contains a `## Not Applicable` heading
- **THEN** that audit's cell renders as `N/A`

#### Scenario: absent interfaces is not flagged
- **WHEN** a change has no `interfaces` artifact
- **THEN** its interfaces cell renders as absent without any missing-artifact warning

#### Scenario: implementation progress shows checked over total
- **WHEN** a change has an `implementation.md` with checked and unchecked task lines
- **THEN** its implementation-progress column shows `checked/total`, and shows empty when `implementation.md` is absent

#### Scenario: Next hint reuses the single-change resolution
- **WHEN** a row's cells are known, including whether its specs are approved
- **THEN** its `Next:` column shows the same `/sai-N-...` hint the single-change panel's first-match algorithm would produce for that change

### Requirement: bulk table is read-only and uses per-change status calls

Rendering the bulk table SHALL be strictly read-only: it SHALL issue one `openspec status --change {name} --json` call per active change (no bulk CLI is assumed) plus local reads of each change's `.openspec.yaml`, `implementation.md`, and audit bodies, and SHALL write nothing under any `openspec/` path.

#### Scenario: N status calls, no writes
- **WHEN** the bulk table is rendered for N active changes
- **THEN** `sai-status` issues N `openspec status --change {name} --json` calls plus local file reads, and creates, modifies, or deletes no file under any `openspec/` path
