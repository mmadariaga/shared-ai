# backfill-conflict-detection Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.
## Requirements
### Requirement: openspec/specs/ scanned for conflicts before writing
Before writing any output file, the command SHALL scan `openspec/specs/` to identify specs that overlap with or are affected by the changes in the diff.

#### Scenario: No overlapping specs found
- **WHEN** the diff introduces a capability with no existing spec entry
- **THEN** the command proceeds to artifact generation without interruption

#### Scenario: Overlapping spec found
- **WHEN** the diff modifies behavior already described in one or more `openspec/specs/` entries
- **THEN** the command surfaces each conflict with: (a) the path to the affected spec, (b) a description of what would change, (c) the reason the change is needed

### Requirement: User decides to proceed or abort after conflict report

When conflicts are detected, the command SHALL present the full conflict report and wait for an explicit proceed-or-abort decision before draft generation, except when `fast_track_active` is true. Under fast-track, the command SHALL carry the report verbatim and continue automatically because the archive CLI owns atomic synchronization and movement; no separate archive synchronization gate receives the decision. The interactive decision SHALL use `proceed (Recommended)` and `abort` through the native option-picker, with invalid answers re-asked and no writes before a valid decision.

#### Scenario: Fast-track auto-proceeds after the verbatim report

- **WHEN** conflicts are detected during a fast-track backfill
- **THEN** the conflict report is carried verbatim and the run continues to change-name handling without presenting a decision ask

#### Scenario: Interactive path still waits for the user

- **WHEN** conflicts are detected without fast-track
- **THEN** the proceed-or-abort decision is presented through the native picker or fallback and the command waits for a valid choice

#### Scenario: User aborts after conflict report

- **WHEN** the user chooses `abort` after seeing the conflict report
- **THEN** no files are written and the command exits cleanly

#### Scenario: User proceeds after conflict report

- **WHEN** the user chooses `proceed` after seeing the conflict report
- **THEN** draft artifact generation continues and the conflicting capability updates remain subject to coordinator validation and writing

### Requirement: Silent overwrite is prohibited
The command SHALL NEVER silently overwrite an existing `openspec/specs/` entry. Every modification to an existing spec MUST have been surfaced to the user in the conflict report and confirmed before the write occurs.

#### Scenario: Pre-existing spec updated only after confirmation
- **WHEN** an existing spec would be modified by the backfill
- **THEN** the user saw and approved the specific change in the conflict report before the file was written

