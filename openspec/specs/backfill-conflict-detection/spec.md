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
When conflicts are detected, the command SHALL present the full conflict report to the user and wait for an explicit decision to proceed or abort, and SHALL NOT make this decision autonomously — except when `fast_track_active` is true: there the command SHALL carry the report verbatim in its returned payload content and continue automatically without the decision ask, because the real accept-or-reject decision belongs to archive's delta-spec sync gate. On the interactive path, the decision SHALL be presented as a closed-choice prompt per the "Closed-choice prompts" rule in `remember.md` — via the harness's native option-picker when one exists, plain-text fallback otherwise — with options labeled `proceed (Recommended)` and `abort`. A reply that maps to neither option is invalid: the command SHALL re-ask and SHALL NOT proceed, abort, or write on it.

#### Scenario: Fast-track auto-proceeds after the verbatim report
- **WHEN** conflicts are detected during a fast-track backfill
- **THEN** the conflict report is carried verbatim in the payload content and the run continues to change-name handling without presenting the decision

#### Scenario: Interactive path still waits for the user
- **WHEN** conflicts are detected without fast-track
- **THEN** the proceed-or-abort decision is presented through the native option-picker or its fallback and the command waits for a valid choice before continuing or aborting

#### Scenario: User aborts after conflict report
- **WHEN** the user chooses to abort after seeing the conflict report
- **THEN** no files are written and the command exits cleanly

#### Scenario: User proceeds after conflict report
- **WHEN** the user confirms they want to proceed despite the conflicts
- **THEN** artifact generation continues, updating the conflicting specs as described in the report

### Requirement: Silent overwrite is prohibited
The command SHALL NEVER silently overwrite an existing `openspec/specs/` entry. Every modification to an existing spec MUST have been surfaced to the user in the conflict report and confirmed before the write occurs.

#### Scenario: Pre-existing spec updated only after confirmation
- **WHEN** an existing spec would be modified by the backfill
- **THEN** the user saw and approved the specific change in the conflict report before the file was written
