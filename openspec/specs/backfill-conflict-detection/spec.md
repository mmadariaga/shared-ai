## ADDED Requirements

### Requirement: openspec/specs/ scanned for conflicts before writing
Before writing any output file, the command SHALL scan `openspec/specs/` to identify specs that overlap with or are affected by the changes in the diff.

#### Scenario: No overlapping specs found
- **WHEN** the diff introduces a capability with no existing spec entry
- **THEN** the command proceeds to artifact generation without interruption

#### Scenario: Overlapping spec found
- **WHEN** the diff modifies behavior already described in one or more `openspec/specs/` entries
- **THEN** the command surfaces each conflict with: (a) the path to the affected spec, (b) a description of what would change, (c) the reason the change is needed

### Requirement: User decides to proceed or abort after conflict report
When conflicts are detected, the command SHALL present the full conflict report to the user and wait for an explicit decision to proceed or abort. The command SHALL NOT make this decision autonomously.

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
